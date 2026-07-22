"""Consultas reutilizables de la app financiero."""

from decimal import Decimal

from django.db.models import DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce

from .models import Contrato, CostoDirecto, GastoFijoMensual


ZERO = Decimal("0.00")


def contratos_con_relaciones():
    return Contrato.objects.select_related(
        "cotizacion",
        "cliente",
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
    )


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


def gastos_fijos_activos_del_periodo(mes, anio):
    return GastoFijoMensual.objects.filter(
        eliminado=False,
        mes=mes,
        anio=anio,
    )


def contratos_confirmados_con_rentabilidad():
    return (
        Contrato.objects.filter(
            estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        )
        .select_related("cliente", "tipo_evento", "paquete")
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
