"""Estrategias de cálculo para pre-cotización."""

from abc import ABC, abstractmethod
from decimal import Decimal

from django.core.exceptions import ValidationError

from negocio.models import Paquete
from negocio.ofertas import (
    beneficios_comunes_activos,
    recomendar_paquetes,
    serializar_beneficio,
    serializar_paquete,
)

from .models import Cotizacion


def paquetes_activos():
    return list(
        Paquete.objects.filter(activo=True)
        .prefetch_related("beneficios")
        .order_by("categoria", "orden", "precio_por_persona", "id")
    )


class PreCotizacionStrategy(ABC):
    @abstractmethod
    def calcular(
        self,
        *,
        configuracion,
        numero_invitados,
        paquete=None,
        preferencias=None,
    ):
        raise NotImplementedError


class AlquilerPreCotizacionStrategy(PreCotizacionStrategy):
    def calcular(
        self,
        *,
        configuracion,
        numero_invitados,
        paquete=None,
        preferencias=None,
    ):
        if paquete:
            raise ValidationError(
                {"paquete": "El alquiler del local no utiliza un paquete."}
            )
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


class ServicioCompletoPreCotizacionStrategy(PreCotizacionStrategy):
    def calcular(
        self,
        *,
        configuracion,
        numero_invitados,
        paquete=None,
        preferencias=None,
    ):
        paquetes = paquetes_activos()
        if paquete and all(item.id != paquete.id for item in paquetes):
            raise ValidationError(
                {"paquete": "El paquete seleccionado no está disponible."}
            )
        if not paquetes:
            raise ValidationError(
                {"paquete": "Debe existir al menos un paquete activo."}
            )

        comunes = beneficios_comunes_activos()
        paquetes_calculados = [
            serializar_paquete(
                paquete_item,
                numero_invitados=numero_invitados,
                comunes=[],
            )
            for paquete_item in paquetes
        ]
        seleccionado = next(
            (
                item
                for item in paquetes_calculados
                if paquete and item["id"] == paquete.id
            ),
            None,
        )
        total_minimo = min(
            Decimal(item["total_estimado"]) for item in paquetes_calculados
        )
        total_estimado = (
            Decimal(seleccionado["total_estimado"]) if seleccionado else total_minimo
        )
        return {
            "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            "numero_invitados": numero_invitados,
            "total_estimado": total_estimado,
            "total_estimado_minimo": total_minimo,
            "paquete": paquete.id if paquete else None,
            "paquete_seleccionado": seleccionado,
            "incluidos_en_todos": [
                serializar_beneficio(item) for item in comunes
            ],
            "paquetes": paquetes_calculados,
        }


class NoEstoySeguroPreCotizacionStrategy(PreCotizacionStrategy):
    def __init__(self, alquiler_strategy, servicio_completo_strategy):
        self.alquiler_strategy = alquiler_strategy
        self.servicio_completo_strategy = servicio_completo_strategy

    def calcular(
        self,
        *,
        configuracion,
        numero_invitados,
        paquete=None,
        preferencias=None,
    ):
        alquiler = self.alquiler_strategy.calcular(
            configuracion=configuracion,
            numero_invitados=numero_invitados,
        )
        servicio_completo = self.servicio_completo_strategy.calcular(
            configuracion=configuracion,
            numero_invitados=numero_invitados,
            paquete=paquete,
        )
        activos = paquetes_activos()
        recomendados = recomendar_paquetes(activos, preferencias)
        return {
            "tipo_servicio": Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO,
            "numero_invitados": numero_invitados,
            "total_estimado": alquiler["total_estimado"],
            "alquiler": alquiler,
            "servicio_completo": servicio_completo,
            "recomendados": [item.id for item in recomendados],
            "preferencias": preferencias or {},
        }


alquiler_strategy = AlquilerPreCotizacionStrategy()
servicio_completo_strategy = ServicioCompletoPreCotizacionStrategy()

PRE_COTIZACION_STRATEGIES = {
    Cotizacion.TipoServicioInteres.ALQUILER: alquiler_strategy,
    Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO: servicio_completo_strategy,
    Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO: NoEstoySeguroPreCotizacionStrategy(
        alquiler_strategy,
        servicio_completo_strategy,
    ),
}


def obtener_estrategia_pre_cotizacion(tipo_servicio):
    try:
        return PRE_COTIZACION_STRATEGIES[tipo_servicio]
    except KeyError as exc:
        raise ValidationError(
            {"tipo_servicio": "Tipo de servicio no soportado."}
        ) from exc
