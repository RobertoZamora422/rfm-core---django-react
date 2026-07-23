"""Servicios de negocio de la app comercial."""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from financiero.models import Contrato
from negocio.persona_services import obtener_o_crear_persona_publica
from negocio.ofertas import (
    snapshot_alquiler,
    snapshot_alquiler_desde_oferta,
    snapshot_no_estoy_seguro,
    snapshot_paquete,
    snapshot_paquete_desde_oferta,
)
from negocio.selectors import obtener_configuracion_activa

from .models import Cotizacion
from .pre_cotizacion_strategies import obtener_estrategia_pre_cotizacion


_UNSET = object()


def _validar_tipo_servicio_y_paquete(tipo_servicio, paquete):
    if tipo_servicio == Cotizacion.TipoServicioInteres.ALQUILER and paquete:
        raise ValidationError(
            {"paquete": "El alquiler del local no utiliza un paquete."}
        )
    if paquete and not paquete.activo:
        raise ValidationError({"paquete": "El paquete seleccionado no está disponible."})


def calcular_pre_cotizacion(
    tipo_servicio,
    numero_invitados,
    paquete=None,
    preferencias=None,
):
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
        preferencias=preferencias,
    )


@transaction.atomic
def crear_pre_cotizacion(
    *,
    persona=None,
    datos_persona=None,
    tipo_evento,
    paquete,
    fecha_tentativa,
    numero_invitados,
    tipo_servicio,
    observaciones="",
    preferencias=None,
):
    calculo = calcular_pre_cotizacion(
        tipo_servicio=tipo_servicio,
        numero_invitados=numero_invitados,
        paquete=paquete,
        preferencias=preferencias,
    )

    if persona is None:
        datos_persona = datos_persona or {}
        persona, _ = obtener_o_crear_persona_publica(
            nombre=datos_persona.get("nombre", ""),
            telefono=datos_persona.get("telefono", ""),
            correo=datos_persona.get("correo", ""),
            observaciones=datos_persona.get("observaciones", ""),
        )

    observaciones_finales = observaciones
    if tipo_servicio == Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO:
        nota = "Interés inicial: no estoy seguro."
        observaciones_finales = f"{observaciones}\n{nota}".strip()

    configuracion = obtener_configuracion_activa()
    if tipo_servicio == Cotizacion.TipoServicioInteres.ALQUILER:
        oferta_snapshot = snapshot_alquiler(
            configuracion,
            numero_invitados=numero_invitados,
            total_estimado=calculo["total_estimado"],
        )
    elif tipo_servicio == Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO:
        oferta_snapshot = snapshot_paquete(
            paquete,
            numero_invitados=numero_invitados,
            total_estimado=calculo["total_estimado"],
        )
    else:
        oferta_snapshot = snapshot_no_estoy_seguro(
            numero_invitados=numero_invitados,
            total_estimado=calculo["total_estimado"],
            paquete=paquete,
            configuracion=configuracion,
            preferencias=preferencias,
        )

    cotizacion = Cotizacion.objects.create(
        persona=persona,
        tipo_evento=tipo_evento,
        paquete=paquete,
        fecha_tentativa=fecha_tentativa,
        numero_invitados=numero_invitados,
        tipo_servicio=tipo_servicio,
        estado=Cotizacion.Estado.NUEVA,
        total_estimado=calculo["total_estimado"],
        observaciones=observaciones_finales,
        origen=Cotizacion.Origen.FORMULARIO_PUBLICO,
        oferta_snapshot=oferta_snapshot,
        oferta_requiere_revision=False,
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
    tipo_servicio=_UNSET,
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

    if cotizacion.tipo_servicio == Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO:
        if tipo_servicio is _UNSET or not tipo_servicio:
            raise ValidationError(
                {
                    "tipo_servicio": "Resuelve si el contrato será de alquiler o de servicio completo."
                }
            )
        tipo_servicio_final = tipo_servicio
    else:
        tipo_servicio_final = cotizacion.tipo_servicio
        if tipo_servicio is not _UNSET and tipo_servicio != tipo_servicio_final:
            raise ValidationError(
                {
                    "tipo_servicio": "El tipo de servicio debe coincidir con la cotización confirmada."
                }
            )

    if tipo_servicio_final not in {
        Contrato.TipoServicio.ALQUILER,
        Contrato.TipoServicio.SERVICIO_COMPLETO,
    }:
        raise ValidationError(
            {"tipo_servicio": "Selecciona un tipo de servicio final válido."}
        )

    paquete_final = cotizacion.paquete if paquete is _UNSET else paquete
    if tipo_servicio_final == Contrato.TipoServicio.ALQUILER:
        if paquete is not _UNSET and paquete:
            raise ValidationError(
                {"paquete": "El alquiler del local no utiliza un paquete."}
            )
        paquete_final = None
    elif not paquete_final:
        raise ValidationError(
            {"paquete": "El servicio completo requiere seleccionar un paquete."}
        )

    invitados_finales = numero_invitados or cotizacion.numero_invitados
    valor_final_resuelto = (
        valor_final if valor_final is not None else cotizacion.total_estimado
    )
    if tipo_servicio_final == Contrato.TipoServicio.ALQUILER:
        oferta_snapshot = snapshot_alquiler_desde_oferta(
            cotizacion.oferta_snapshot,
            numero_invitados=invitados_finales,
            total_estimado=valor_final_resuelto,
        )
        if oferta_snapshot is None:
            oferta_snapshot = snapshot_alquiler(
                obtener_configuracion_activa(),
                numero_invitados=invitados_finales,
                total_estimado=valor_final_resuelto,
                origen="conversion",
            )
    else:
        oferta_snapshot = snapshot_paquete_desde_oferta(
            cotizacion.oferta_snapshot,
            paquete=paquete_final,
            numero_invitados=invitados_finales,
            total_estimado=valor_final_resuelto,
            origen="conversion",
        )
        if oferta_snapshot is None:
            oferta_snapshot = snapshot_paquete(
                paquete_final,
                numero_invitados=invitados_finales,
                total_estimado=valor_final_resuelto,
                origen="conversion",
            )

    contrato = Contrato.objects.create(
        cotizacion=cotizacion,
        persona=cotizacion.persona,
        tipo_evento=cotizacion.tipo_evento,
        paquete=paquete_final,
        tipo_servicio=tipo_servicio_final,
        fecha_evento=fecha_evento or cotizacion.fecha_tentativa,
        numero_invitados=invitados_finales,
        valor_final=valor_final_resuelto,
        monto_abonado=monto_abonado if monto_abonado is not None else Decimal("0.00"),
        estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        observaciones=observaciones,
        oferta_snapshot=oferta_snapshot,
        oferta_requiere_revision=False,
    )

    cotizacion.estado = Cotizacion.Estado.CONVERTIDA
    cotizacion.save(update_fields=["estado", "actualizado_en"])

    return contrato
