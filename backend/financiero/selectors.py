"""Consultas reutilizables de la app financiero."""

from decimal import Decimal

from django.db.models import DecimalField, F, Prefetch, Q, Sum, Value
from django.db.models.functions import Coalesce

from .models import (
    Contrato,
    CostoDirecto,
    GastoAdicional,
    GastoRecurrente,
    GastoRecurrenteAjuste,
    GastoRecurrenteVersion,
)


ZERO = Decimal("0.00")


def contratos_con_relaciones():
    return Contrato.objects.select_related(
        "cotizacion",
        "persona",
        "tipo_evento",
        "paquete",
    ).annotate(
        total_costos_directos_anotado=Coalesce(
            Sum(
                "costos_directos__valor",
                filter=Q(costos_directos__eliminado=False),
            ),
            Value(ZERO),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )
    ).order_by("-fecha_evento", "-creado_en")


def contratos_confirmados_entre(inicio, fin):
    return Contrato.objects.filter(
        estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        fecha_evento__gte=inicio,
        fecha_evento__lte=fin,
    )


def contratos_cancelados_entre(inicio, fin):
    return Contrato.objects.filter(
        estado_contrato=Contrato.EstadoContrato.CANCELADO,
        fecha_evento__gte=inicio,
        fecha_evento__lte=fin,
    )


def costos_directos_activos_por_evento_entre(inicio, fin):
    return CostoDirecto.objects.filter(
        contrato__estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        contrato__fecha_evento__gte=inicio,
        contrato__fecha_evento__lte=fin,
        eliminado=False,
    )


def gastos_adicionales_activos_entre(inicio, fin):
    return GastoAdicional.objects.filter(
        eliminado=False,
        fecha__gte=inicio,
        fecha__lte=fin,
    )


def gastos_recurrentes_aplicables(periodo):
    versiones = GastoRecurrenteVersion.objects.filter(
        vigente_desde__lte=periodo,
    ).filter(
        Q(vigente_hasta__isnull=True) | Q(vigente_hasta__gte=periodo)
    ).order_by("-vigente_desde", "-id")
    ajustes = GastoRecurrenteAjuste.objects.filter(
        periodo=periodo,
        eliminado=False,
    )
    return (
        GastoRecurrente.objects.filter(
            Q(versiones__vigente_desde__lte=periodo)
            & (
                Q(versiones__vigente_hasta__isnull=True)
                | Q(versiones__vigente_hasta__gte=periodo)
            )
        )
        .prefetch_related(
            Prefetch("versiones", queryset=versiones, to_attr="versiones_periodo"),
            Prefetch("ajustes", queryset=ajustes, to_attr="ajustes_periodo"),
        )
        .distinct()
        .order_by("concepto", "id")
    )


def gastos_recurrentes_con_vigencia_entre(periodo_desde, periodo_hasta):
    versiones = GastoRecurrenteVersion.objects.filter(
        vigente_desde__lte=periodo_hasta,
    ).filter(
        Q(vigente_hasta__isnull=True) | Q(vigente_hasta__gte=periodo_desde)
    ).order_by("vigente_desde", "id")
    ajustes = GastoRecurrenteAjuste.objects.filter(
        periodo__gte=periodo_desde,
        periodo__lte=periodo_hasta,
        eliminado=False,
    ).order_by("periodo", "id")
    return (
        GastoRecurrente.objects.filter(
            Q(versiones__vigente_desde__lte=periodo_hasta)
            & (
                Q(versiones__vigente_hasta__isnull=True)
                | Q(versiones__vigente_hasta__gte=periodo_desde)
            )
        )
        .prefetch_related(
            Prefetch("versiones", queryset=versiones, to_attr="versiones_rango"),
            Prefetch("ajustes", queryset=ajustes, to_attr="ajustes_rango"),
        )
        .distinct()
        .order_by("concepto", "id")
    )


def contratos_confirmados_con_rentabilidad():
    return (
        Contrato.objects.filter(
            estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        )
        .select_related("persona", "tipo_evento", "paquete")
        .annotate(
            costos_directos_total=Coalesce(
                Sum(
                    "costos_directos__valor",
                    filter=Q(costos_directos__eliminado=False),
                ),
                Value(ZERO),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        )
    )


def contratos_confirmados_con_rentabilidad_entre(inicio, fin):
    return contratos_confirmados_con_rentabilidad().filter(
        fecha_evento__gte=inicio,
        fecha_evento__lte=fin,
    ).order_by("-fecha_evento", "-id")


def contratos_confirmados_con_saldo_pendiente():
    return contratos_confirmados_con_rentabilidad().filter(
        monto_abonado__lt=F("valor_final"),
    ).order_by("fecha_evento", "id")
