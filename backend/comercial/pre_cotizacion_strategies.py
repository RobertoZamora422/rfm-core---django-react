"""Estrategias de cálculo para pre-cotización."""

from abc import ABC, abstractmethod
from decimal import Decimal

from django.core.exceptions import ValidationError

from negocio.models import BeneficioPaquete, Paquete
from negocio.ofertas import (
    beneficios_comunes_activos,
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


def resumir_categorias(paquetes, numero_invitados):
    categorias = []
    for categoria, categoria_display in Paquete.Categoria.choices:
        opciones = [item for item in paquetes if item.categoria == categoria]
        if not opciones:
            continue
        precios = [item.precio_por_persona for item in opciones]
        referencia = next((item for item in opciones if item.destacado), opciones[0])
        categorias.append(
            {
                "categoria": categoria,
                "categoria_display": categoria_display,
                "cantidad_paquetes": len(opciones),
                "precio_por_persona_desde": min(precios),
                "precio_por_persona_hasta": max(precios),
                "total_desde": min(precios) * Decimal(numero_invitados),
                "total_hasta": max(precios) * Decimal(numero_invitados),
                "resumen": referencia.resumen_corto,
            }
        )
    return categorias


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
        beneficios_principales = [
            serializar_beneficio(item)
            for item in beneficios_comunes_activos()
            if item.tipo == BeneficioPaquete.Tipo.PRINCIPAL
        ]
        return {
            "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
            "numero_invitados": numero_invitados,
            "total_estimado": total_estimado,
            "tarifa_base_alquiler": configuracion.tarifa_base_alquiler,
            "invitados_incluidos_alquiler": configuracion.invitados_incluidos_alquiler,
            "invitados_adicionales": invitados_adicionales,
            "costo_invitado_adicional": configuracion.costo_invitado_adicional,
            "costo_adicional": costo_adicional,
            "beneficios_principales": beneficios_principales,
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
            Decimal(seleccionado["total_estimado"]) if seleccionado else None
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
        return {
            "tipo_servicio": Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO,
            "numero_invitados": numero_invitados,
            "total_estimado": None,
            "alquiler": alquiler,
            "servicio_completo": {
                "incluidos_en_todos": servicio_completo["incluidos_en_todos"],
                "categorias": resumir_categorias(activos, numero_invitados),
            },
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
