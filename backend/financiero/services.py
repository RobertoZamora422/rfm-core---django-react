"""Servicios de negocio de la app financiero."""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone

from .models import Contrato, CostoDirecto, GastoFijoMensual


ZERO = Decimal("0.00")
HUNDRED = Decimal("100")


def _money(value):
    return str((value or ZERO).quantize(Decimal("0.01")))


def _percent(value):
    return str((value or ZERO).quantize(Decimal("0.01")))


def _sum(queryset, field):
    return queryset.aggregate(total=Sum(field))["total"] or ZERO


def _month_bounds(mes, anio):
    inicio = date(anio, mes, 1)
    if mes == 12:
        siguiente = date(anio + 1, 1, 1)
    else:
        siguiente = date(anio, mes + 1, 1)
    return inicio, siguiente - timedelta(days=1)


def _previous_period(mes, anio):
    if mes == 1:
        return 12, anio - 1
    return mes - 1, anio


def _safe_percentage(numerator, denominator):
    if not denominator:
        return ZERO
    return (numerator / denominator) * HUNDRED


def _variation(current, previous):
    delta = current - previous
    if previous == 0:
        percentage = None
    else:
        percentage = _safe_percentage(delta, previous)
    return {
        "delta": _money(delta),
        "porcentaje": _percent(percentage) if percentage is not None else None,
    }


def _confirmed_contracts_between(inicio, fin):
    return Contrato.objects.filter(
        estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        fecha_evento__gte=inicio,
        fecha_evento__lte=fin,
    )


def _period_metrics(mes, anio):
    inicio, fin = _month_bounds(mes, anio)
    contratos = _confirmed_contracts_between(inicio, fin)
    costos_directos = CostoDirecto.objects.filter(
        contrato__estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        eliminado=False,
        fecha__gte=inicio,
        fecha__lte=fin,
    )
    gastos_fijos = GastoFijoMensual.objects.filter(
        eliminado=False,
        mes=mes,
        anio=anio,
    )

    ingresos = _sum(contratos, "valor_final")
    costos = _sum(costos_directos, "valor")
    gastos = _sum(gastos_fijos, "valor")
    utilidad = ingresos - costos - gastos
    margen = _safe_percentage(utilidad, ingresos)

    return {
        "periodo": {
            "mes": mes,
            "anio": anio,
            "inicio": inicio.isoformat(),
            "fin": fin.isoformat(),
        },
        "ingresos_mes": ingresos,
        "costos_directos_mes": costos,
        "gastos_fijos_mes": gastos,
        "utilidad_neta": utilidad,
        "margen_neto": margen,
        "contratos_confirmados": contratos.count(),
    }


def _event_profitability(mes, anio):
    inicio, fin = _month_bounds(mes, anio)
    contratos = (
        _confirmed_contracts_between(inicio, fin)
        .select_related("cliente", "tipo_evento", "paquete")
        .annotate(
            costos_directos_total=Sum(
                "costos_directos__valor",
                filter=Q(costos_directos__eliminado=False),
            )
        )
        .order_by("-fecha_evento", "-id")
    )

    eventos = []
    for contrato in contratos:
        total_costos = contrato.costos_directos_total or ZERO
        utilidad = contrato.valor_final - total_costos
        margen = _safe_percentage(utilidad, contrato.valor_final)
        eventos.append(
            {
                "id": contrato.id,
                "contrato_id": contrato.id,
                "cliente_nombre": contrato.cliente.nombre,
                "tipo_evento_nombre": contrato.tipo_evento.nombre,
                "paquete_nombre": contrato.paquete.nombre if contrato.paquete else "",
                "fecha_evento": contrato.fecha_evento.isoformat(),
                "valor_final": _money(contrato.valor_final),
                "costos_directos": _money(total_costos),
                "utilidad_bruta": _money(utilidad),
                "margen_bruto": _percent(margen),
                "estado_pago": contrato.estado_pago,
                "saldo_pendiente": _money(contrato.saldo_pendiente),
            }
        )

    return sorted(
        eventos,
        key=lambda item: Decimal(item["utilidad_bruta"]),
        reverse=True,
    )


def _payment_status(mes, anio):
    inicio, fin = _month_bounds(mes, anio)
    contratos = _confirmed_contracts_between(inicio, fin)
    totals = contratos.aggregate(
        total_valor=Sum("valor_final"),
        total_abonado=Sum("monto_abonado"),
    )
    total_valor = totals["total_valor"] or ZERO
    total_abonado = totals["total_abonado"] or ZERO
    saldo_pendiente = total_valor - total_abonado

    counts = {
        item["estado_pago"]: item["cantidad"]
        for item in contratos.values("estado_pago").annotate(cantidad=Count("id"))
    }

    estados = []
    for key, label in Contrato.EstadoPago.choices:
        subset = contratos.filter(estado_pago=key)
        subtotal_valor = _sum(subset, "valor_final")
        subtotal_abonado = _sum(subset, "monto_abonado")
        estados.append(
            {
                "key": key,
                "label": label,
                "cantidad": counts.get(key, 0),
                "valor_total": _money(subtotal_valor),
                "monto_abonado": _money(subtotal_abonado),
                "saldo_pendiente": _money(subtotal_valor - subtotal_abonado),
            }
        )

    return {
        "total_contratos": contratos.count(),
        "valor_total": _money(total_valor),
        "monto_abonado": _money(total_abonado),
        "saldo_pendiente": _money(saldo_pendiente),
        "estados": estados,
    }


def _interpretation(metrics):
    ingresos = metrics["ingresos_mes"]
    utilidad = metrics["utilidad_neta"]
    margen = metrics["margen_neto"]

    if ingresos == 0:
        return {
            "nivel": "neutral",
            "titulo": "Periodo sin ingresos reales",
            "detalle": "No hay contratos confirmados en el periodo; los gastos registrados se muestran sin dividir por ingresos.",
        }
    if utilidad < 0:
        return {
            "nivel": "warning",
            "titulo": "Periodo con perdida neta",
            "detalle": "Los costos directos y gastos fijos superan los ingresos confirmados del mes.",
        }
    if margen < Decimal("20"):
        return {
            "nivel": "notice",
            "titulo": "Margen neto bajo",
            "detalle": "El periodo genera utilidad, pero el margen queda por debajo del umbral operativo recomendado.",
        }
    return {
        "nivel": "success",
        "titulo": "Periodo rentable",
        "detalle": "Los ingresos confirmados cubren costos directos, gastos fijos y dejan margen neto positivo.",
    }


def _serialize_metrics(metrics):
    return {
        "ingresos_mes": _money(metrics["ingresos_mes"]),
        "costos_directos_mes": _money(metrics["costos_directos_mes"]),
        "gastos_fijos_mes": _money(metrics["gastos_fijos_mes"]),
        "utilidad_neta": _money(metrics["utilidad_neta"]),
        "margen_neto": _percent(metrics["margen_neto"]),
        "contratos_confirmados": metrics["contratos_confirmados"],
    }


def dashboard_financiero(mes=None, anio=None):
    """Devuelve el dashboard financiero listo para consumir desde React."""

    hoy = timezone.localdate()
    mes = mes or hoy.month
    anio = anio or hoy.year

    current = _period_metrics(mes, anio)
    previous_mes, previous_anio = _previous_period(mes, anio)
    previous = _period_metrics(previous_mes, previous_anio)

    serialized_current = _serialize_metrics(current)
    serialized_previous = _serialize_metrics(previous)

    return {
        "periodo": current["periodo"],
        "kpis": [
            {
                "key": "ingresos_mes",
                "label": "Ingresos del mes",
                "value": serialized_current["ingresos_mes"],
                "detail": "Contratos confirmados del periodo",
                "format": "currency",
            },
            {
                "key": "costos_directos_mes",
                "label": "Costos directos",
                "value": serialized_current["costos_directos_mes"],
                "detail": "Costos registrados sobre contratos validos",
                "format": "currency",
            },
            {
                "key": "gastos_fijos_mes",
                "label": "Gastos fijos",
                "value": serialized_current["gastos_fijos_mes"],
                "detail": "Gastos operativos del mes",
                "format": "currency",
            },
            {
                "key": "utilidad_neta",
                "label": "Utilidad neta",
                "value": serialized_current["utilidad_neta"],
                "detail": "Ingresos menos costos y gastos",
                "format": "currency",
            },
            {
                "key": "margen_neto",
                "label": "Margen neto",
                "value": serialized_current["margen_neto"],
                "detail": "Utilidad neta sobre ingresos",
                "format": "percent",
            },
        ],
        "metricas": serialized_current,
        "comparacion_mes_anterior": {
            "periodo": previous["periodo"],
            "metricas": serialized_previous,
            "variaciones": {
                "ingresos_mes": _variation(
                    current["ingresos_mes"],
                    previous["ingresos_mes"],
                ),
                "utilidad_neta": _variation(
                    current["utilidad_neta"],
                    previous["utilidad_neta"],
                ),
                "margen_neto": {
                    "delta": _percent(current["margen_neto"] - previous["margen_neto"]),
                    "porcentaje": None,
                },
            },
        },
        "rentabilidad_eventos": _event_profitability(mes, anio),
        "estado_pagos": _payment_status(mes, anio),
        "interpretacion": _interpretation(current),
    }
