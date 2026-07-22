"""Servicios de negocio de la app comercial."""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from financiero.models import Contrato
from negocio.models import Cliente
from negocio.selectors import buscar_cliente_por_telefono, obtener_configuracion_activa

from .models import Cotizacion
from .pre_cotizacion_strategies import obtener_estrategia_pre_cotizacion


_UNSET = object()


def _validar_tipo_servicio_y_paquete(tipo_servicio, paquete):
    if paquete and paquete.tipo_servicio != tipo_servicio:
        raise ValidationError(
            {"paquete": "El paquete no corresponde al tipo de servicio indicado."}
        )


def calcular_pre_cotizacion(tipo_servicio, numero_invitados, paquete=None):
    configuracion = obtener_configuracion_activa()
    if configuracion is None:
        raise ValidationError(
            {
                "configuracion": "Debe existir una configuracion activa del negocio para calcular la pre-cotizacion."
            }
        )

    _validar_tipo_servicio_y_paquete(tipo_servicio, paquete)

    estrategia = obtener_estrategia_pre_cotizacion(tipo_servicio)
    return estrategia.calcular(
        configuracion=configuracion,
        numero_invitados=numero_invitados,
        paquete=paquete,
    )


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
        datos_cliente = datos_cliente or {}
        cliente = buscar_cliente_por_telefono(datos_cliente.get("telefono"))
        if cliente is None:
            cliente = Cliente.objects.create(**datos_cliente)

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

    transiciones_permitidas = {
        Cotizacion.Estado.NUEVA: {
            Cotizacion.Estado.CONTACTADA,
            Cotizacion.Estado.CONFIRMADA,
            Cotizacion.Estado.DESCARTADA,
        },
        Cotizacion.Estado.CONTACTADA: {
            Cotizacion.Estado.NUEVA,
            Cotizacion.Estado.CONFIRMADA,
            Cotizacion.Estado.DESCARTADA,
        },
        Cotizacion.Estado.CONFIRMADA: {
            Cotizacion.Estado.NUEVA,
            Cotizacion.Estado.CONTACTADA,
            Cotizacion.Estado.DESCARTADA,
        },
        Cotizacion.Estado.DESCARTADA: {Cotizacion.Estado.NUEVA},
    }
    if nuevo_estado not in transiciones_permitidas.get(cotizacion.estado, set()):
        raise ValidationError(
            {
                "estado": (
                    f"No se puede cambiar una cotizacion {cotizacion.get_estado_display().lower()} "
                    f"directamente a {dict(Cotizacion.Estado.choices).get(nuevo_estado, nuevo_estado).lower()}."
                )
            }
        )

    cotizacion.estado = nuevo_estado
    cotizacion.save(update_fields=["estado", "actualizado_en"])
    return cotizacion


@transaction.atomic
def convertir_cotizacion_a_contrato(
    cotizacion,
    *,
    fecha_evento=None,
    numero_invitados=None,
    paquete=_UNSET,
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

    paquete_final = cotizacion.paquete if paquete is _UNSET else paquete

    if (
        paquete_final
        and cotizacion.tipo_servicio != Cotizacion.TipoServicioInteres.NO_SEGURO
        and paquete_final.tipo_servicio != cotizacion.tipo_servicio
    ):
        raise ValidationError(
            {"paquete": "El paquete final no corresponde al tipo de servicio de la cotizacion."}
        )

    contrato = Contrato.objects.create(
        cotizacion=cotizacion,
        cliente=cotizacion.cliente,
        tipo_evento=cotizacion.tipo_evento,
        paquete=paquete_final,
        fecha_evento=fecha_evento or cotizacion.fecha_tentativa,
        numero_invitados=numero_invitados or cotizacion.numero_invitados,
        valor_final=valor_final if valor_final is not None else cotizacion.total_estimado,
        monto_abonado=monto_abonado if monto_abonado is not None else Decimal("0.00"),
        estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        observaciones=observaciones,
        es_demo=cotizacion.es_demo,
    )

    cotizacion.estado = Cotizacion.Estado.CONVERTIDA
    cotizacion.save(update_fields=["estado", "actualizado_en"])

    return contrato
