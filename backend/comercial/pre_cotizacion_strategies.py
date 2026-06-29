"""Estrategias de calculo para pre-cotizacion."""

from abc import ABC, abstractmethod
from decimal import Decimal

from django.core.exceptions import ValidationError

from negocio.models import Paquete

from .models import Cotizacion


class PreCotizacionStrategy(ABC):
    @abstractmethod
    def calcular(self, *, configuracion, numero_invitados, paquete=None):
        raise NotImplementedError


class AlquilerPreCotizacionStrategy(PreCotizacionStrategy):
    def calcular(self, *, configuracion, numero_invitados, paquete=None):
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
    def calcular(self, *, configuracion, numero_invitados, paquete=None):
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


class NoSeguroPreCotizacionStrategy(PreCotizacionStrategy):
    def __init__(self, alquiler_strategy, servicio_completo_strategy):
        self.alquiler_strategy = alquiler_strategy
        self.servicio_completo_strategy = servicio_completo_strategy

    def calcular(self, *, configuracion, numero_invitados, paquete=None):
        alquiler = self.alquiler_strategy.calcular(
            configuracion=configuracion,
            numero_invitados=numero_invitados,
        )
        servicio_completo = self.servicio_completo_strategy.calcular(
            configuracion=configuracion,
            numero_invitados=numero_invitados,
        )
        return {
            "tipo_servicio": Cotizacion.TipoServicioInteres.NO_SEGURO,
            "numero_invitados": numero_invitados,
            "total_estimado": alquiler["total_estimado"],
            "alquiler": alquiler,
            "servicio_completo": servicio_completo,
        }


alquiler_strategy = AlquilerPreCotizacionStrategy()
servicio_completo_strategy = ServicioCompletoPreCotizacionStrategy()

PRE_COTIZACION_STRATEGIES = {
    Cotizacion.TipoServicioInteres.ALQUILER: alquiler_strategy,
    Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO: servicio_completo_strategy,
    Cotizacion.TipoServicioInteres.NO_SEGURO: NoSeguroPreCotizacionStrategy(
        alquiler_strategy,
        servicio_completo_strategy,
    ),
}


def obtener_estrategia_pre_cotizacion(tipo_servicio):
    try:
        return PRE_COTIZACION_STRATEGIES[tipo_servicio]
    except KeyError:
        raise ValidationError({"tipo_servicio": "Tipo de servicio no soportado."})
