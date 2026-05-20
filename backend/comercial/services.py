"""Servicios de negocio de la app comercial."""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from financiero.models import Contrato
from negocio.models import Cliente, Paquete
from negocio.selectors import obtener_configuracion_activa

from .models import Cotizacion


def _validar_tipo_servicio_y_paquete(tipo_servicio, paquete):
    if paquete and paquete.tipo_servicio != tipo_servicio:
        raise ValidationError(
            {"paquete": "El paquete no corresponde al tipo de servicio indicado."}
        )


def _calcular_alquiler(configuracion, numero_invitados):
    invitados_adicionales = max(
        numero_invitados - configuracion.invitados_incluidos_alquiler,
        0,
    )
    costo_adicional = (
        Decimal(invitados_adicionales) * configuracion.costo_invitado_adicional
    )
    total_estimado = configuracion.tarifa_base_alquiler + costo_adicional
    return {
        "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
        "numero_invitados": numero_invitados,
        "total_estimado": total_estimado,
        "tarifa_base_alquiler": configuracion.tarifa_base_alquiler,
        "invitados_incluidos_alquiler": configuracion.invitados_incluidos_alquiler,
        "invitados_adicionales": invitados_adicionales,
        "costo_invitado_adicional": configuracion.costo_invitado_adicional,
        "costo_adicional": costo_adicional,
    }


def _calcular_servicio_completo(numero_invitados, paquete=None):
    paquetes = [paquete] if paquete else list(
        Paquete.objects.filter(
            activo=True,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
        ).order_by("nombre")
    )

    if not paquetes:
        raise ValidationError(
            {
                "paquete": "Debe existir al menos un paquete activo de servicio completo."
            }
        )

    paquetes_calculados = []
    for paquete_item in paquetes:
        total_paquete = paquete_item.precio_por_persona * Decimal(numero_invitados)
        paquetes_calculados.append(
            {
                "id": paquete_item.id,
                "nombre": paquete_item.nombre,
                "descripcion": paquete_item.descripcion,
                "precio_por_persona": paquete_item.precio_por_persona,
                "total_estimado": total_paquete,
            }
        )

    total_estimado = min(item["total_estimado"] for item in paquetes_calculados)
    resultado = {
        "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
        "numero_invitados": numero_invitados,
        "total_estimado": total_estimado,
        "total_estimado_minimo": total_estimado,
        "paquetes": paquetes_calculados,
    }

    if paquete:
        resultado.update(
            {
                "paquete": paquete.pk,
                "paquete_nombre": paquete.nombre,
                "precio_por_persona": paquete.precio_por_persona,
            }
        )

    return resultado


def calcular_pre_cotizacion(tipo_servicio, numero_invitados, paquete=None):
    configuracion = obtener_configuracion_activa()
    if configuracion is None:
        raise ValidationError(
            {
                "configuracion": "Debe existir una configuracion activa del negocio para calcular la pre-cotizacion."
            }
        )

    _validar_tipo_servicio_y_paquete(tipo_servicio, paquete)

    if tipo_servicio == Cotizacion.TipoServicioInteres.ALQUILER:
        return _calcular_alquiler(configuracion, numero_invitados)

    if tipo_servicio == Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO:
        return _calcular_servicio_completo(numero_invitados, paquete=paquete)

    alquiler = _calcular_alquiler(configuracion, numero_invitados)
    servicio_completo = _calcular_servicio_completo(numero_invitados)
    return {
        "tipo_servicio": Cotizacion.TipoServicioInteres.NO_SEGURO,
        "numero_invitados": numero_invitados,
        "total_estimado": alquiler["total_estimado"],
        "alquiler": alquiler,
        "servicio_completo": servicio_completo,
    }


@transaction.atomic
def crear_pre_cotizacion(
    *,
    cliente=None,
    datos_cliente=None,
    tipo_evento,
    paquete,
    fecha_tentativa,
    numero_invitados,
    tipo_servicio,
    observaciones="",
):
    calculo = calcular_pre_cotizacion(
        tipo_servicio=tipo_servicio,
        numero_invitados=numero_invitados,
        paquete=paquete,
    )

    if cliente is None:
        cliente = Cliente.objects.create(**(datos_cliente or {}))

    observaciones_finales = observaciones
    if tipo_servicio == Cotizacion.TipoServicioInteres.NO_SEGURO:
        nota = "Interes inicial: aun no estoy seguro."
        observaciones_finales = f"{observaciones}\n{nota}".strip()

    cotizacion = Cotizacion.objects.create(
        cliente=cliente,
        tipo_evento=tipo_evento,
        paquete=paquete,
        fecha_tentativa=fecha_tentativa,
        numero_invitados=numero_invitados,
        tipo_servicio=tipo_servicio,
        estado=Cotizacion.Estado.NUEVA,
        total_estimado=calculo["total_estimado"],
        observaciones=observaciones_finales,
    )

    return cotizacion, calculo


def cambiar_estado_cotizacion(cotizacion, nuevo_estado):
    if nuevo_estado == Cotizacion.Estado.CONVERTIDA:
        raise ValidationError(
            {"estado": "La conversion a contrato debe realizarse desde la accion correspondiente."}
        )

    if cotizacion.estado == Cotizacion.Estado.CONVERTIDA:
        raise ValidationError(
            {"estado": "Una cotizacion convertida no permite cambios de estado."}
        )

    cotizacion.estado = nuevo_estado
    cotizacion.save(update_fields=["estado", "actualizado_en"])
    return cotizacion


@transaction.atomic
def convertir_cotizacion_a_contrato(
    cotizacion,
    *,
    fecha_evento=None,
    valor_final=None,
    monto_abonado=None,
    observaciones="",
):
    cotizacion = Cotizacion.objects.select_for_update().get(pk=cotizacion.pk)

    if cotizacion.estado == Cotizacion.Estado.CONVERTIDA:
        raise ValidationError(
            {"cotizacion": "La cotizacion ya fue convertida a contrato."}
        )

    if cotizacion.estado != Cotizacion.Estado.CONFIRMADA:
        raise ValidationError(
            {
                "estado": "Solo una cotizacion confirmada puede convertirse en contrato."
            }
        )

    if Contrato.objects.filter(cotizacion=cotizacion).exists():
        raise ValidationError(
            {"cotizacion": "La cotizacion ya tiene un contrato asociado."}
        )

    contrato = Contrato.objects.create(
        cotizacion=cotizacion,
        cliente=cotizacion.cliente,
        tipo_evento=cotizacion.tipo_evento,
        paquete=cotizacion.paquete,
        fecha_evento=fecha_evento or cotizacion.fecha_tentativa,
        numero_invitados=cotizacion.numero_invitados,
        valor_final=valor_final if valor_final is not None else cotizacion.total_estimado,
        monto_abonado=monto_abonado if monto_abonado is not None else Decimal("0.00"),
        estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        observaciones=observaciones,
        es_demo=cotizacion.es_demo,
    )

    cotizacion.estado = Cotizacion.Estado.CONVERTIDA
    cotizacion.save(update_fields=["estado", "actualizado_en"])

    return contrato
