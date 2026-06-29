"""Servicios de negocio de la app financiero."""

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone

from .models import Contrato
from .selectors import (
    contratos_cancelados_entre,
    contratos_confirmados_con_rentabilidad_entre,
    contratos_confirmados_entre,
    costos_directos_activos_por_evento_entre,
    gastos_fijos_activos_del_periodo,
)


ZERO = Decimal("0.00")
HUNDRED = Decimal("100")
EVOLUTION_MONTHS = 6

MONTH_NAMES = {
    1: "Enero",
    2: "Febrero",
    3: "Marzo",
    4: "Abril",
    5: "Mayo",
    6: "Junio",
    7: "Julio",
    8: "Agosto",
    9: "Septiembre",
    10: "Octubre",
    11: "Noviembre",
    12: "Diciembre",
}


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


def _period_label(mes, anio):
    return f"{MONTH_NAMES.get(mes, mes)} {anio}"


def _previous_period(mes, anio):
    if mes == 1:
        return 12, anio - 1
    return mes - 1, anio


def _period_sequence(mes, anio, count=EVOLUTION_MONTHS):
    periods = []
    current_mes = mes
    current_anio = anio
    for _index in range(count):
        periods.append((current_mes, current_anio))
        current_mes, current_anio = _previous_period(current_mes, current_anio)
    return list(reversed(periods))


def _safe_percentage(numerator, denominator):
    if not denominator:
        return ZERO
    return (numerator / denominator) * HUNDRED


def cancelar_contrato(contrato):
    contrato.estado_contrato = Contrato.EstadoContrato.CANCELADO
    contrato.save(update_fields=["estado_contrato", "actualizado_en"])
    return contrato


def _eliminar_logicamente(instance):
    instance.eliminado = True
    instance.eliminado_en = timezone.now()
    instance.save(update_fields=["eliminado", "eliminado_en", "actualizado_en"])
    return instance


def eliminar_logicamente_costo_directo(costo):
    return _eliminar_logicamente(costo)


def eliminar_logicamente_gasto_fijo(gasto):
    return _eliminar_logicamente(gasto)


def _variation(current, previous, has_previous_data=True):
    delta = current - previous
    if not has_previous_data or previous == 0:
        percentage = None
    else:
        percentage = _safe_percentage(delta, previous)

    if not has_previous_data:
        direction = "sin_datos"
    elif delta > 0:
        direction = "sube"
    elif delta < 0:
        direction = "baja"
    else:
        direction = "sin_variacion"

    return {
        "delta": _money(delta),
        "porcentaje": _percent(percentage) if percentage is not None else None,
        "direccion": direction,
        "tiene_comparacion": has_previous_data,
    }


def _period_metrics(mes, anio):
    inicio, fin = _month_bounds(mes, anio)
    contratos = contratos_confirmados_entre(inicio, fin)
    costos_directos = costos_directos_activos_por_evento_entre(inicio, fin)
    gastos_fijos = gastos_fijos_activos_del_periodo(mes, anio)

    ingresos = _sum(contratos, "valor_final")
    costos = _sum(costos_directos, "valor")
    gastos = _sum(gastos_fijos, "valor")
    utilidad_bruta = ingresos - costos
    utilidad_neta = utilidad_bruta - gastos
    margen_bruto = _safe_percentage(utilidad_bruta, ingresos)
    margen_neto = _safe_percentage(utilidad_neta, ingresos)
    contratos_count = contratos.count()
    ticket_promedio = ingresos / contratos_count if contratos_count else ZERO

    return {
        "periodo": {
            "mes": mes,
            "anio": anio,
            "inicio": inicio.isoformat(),
            "fin": fin.isoformat(),
            "label": _period_label(mes, anio),
        },
        "ingresos_mes": ingresos,
        "costos_directos_mes": costos,
        "gastos_fijos_mes": gastos,
        "utilidad_bruta": utilidad_bruta,
        "margen_bruto": margen_bruto,
        "utilidad_neta": utilidad_neta,
        "margen_neto": margen_neto,
        "ticket_promedio": ticket_promedio,
        "contratos_confirmados": contratos_count,
        "costos_directos_registrados": costos_directos.count(),
        "gastos_fijos_registrados": gastos_fijos.count(),
    }


def _contract_profit_rows(mes, anio):
    inicio, fin = _month_bounds(mes, anio)
    contratos = contratos_confirmados_con_rentabilidad_entre(inicio, fin)

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
                "cliente_telefono": contrato.cliente.telefono,
                "tipo_evento_id": contrato.tipo_evento_id,
                "tipo_evento_nombre": contrato.tipo_evento.nombre,
                "paquete_id": contrato.paquete_id,
                "paquete_nombre": contrato.paquete.nombre if contrato.paquete else "",
                "fecha_evento": contrato.fecha_evento.isoformat(),
                "numero_invitados": contrato.numero_invitados,
                "valor_final": _money(contrato.valor_final),
                "costos_directos": _money(total_costos),
                "utilidad_bruta": _money(utilidad),
                "margen_bruto": _percent(margen),
                "estado_pago": contrato.estado_pago,
                "saldo_pendiente": _money(contrato.saldo_pendiente),
            }
        )

    return eventos


def _event_profitability(mes, anio):
    eventos = _contract_profit_rows(mes, anio)
    return sorted(
        eventos,
        key=lambda item: Decimal(item["utilidad_bruta"]),
        reverse=True,
    )


def _payment_status(mes, anio):
    inicio, fin = _month_bounds(mes, anio)
    contratos = contratos_confirmados_entre(inicio, fin)
    cancelados = contratos_cancelados_entre(inicio, fin)
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

    conteos = {
        key: counts.get(key, 0)
        for key, _label in Contrato.EstadoPago.choices
    }
    cancelados_totals = cancelados.aggregate(
        total_valor=Sum("valor_final"),
        total_abonado=Sum("monto_abonado"),
    )
    cancelados_valor = cancelados_totals["total_valor"] or ZERO
    cancelados_abonado = cancelados_totals["total_abonado"] or ZERO

    return {
        "total_contratos": contratos.count(),
        "valor_total": _money(total_valor),
        "monto_abonado": _money(total_abonado),
        "saldo_pendiente": _money(saldo_pendiente),
        "pendiente": conteos.get(Contrato.EstadoPago.PENDIENTE, 0),
        "abonado": conteos.get(Contrato.EstadoPago.ABONADO, 0),
        "pagado": conteos.get(Contrato.EstadoPago.PAGADO, 0),
        "conteos": conteos,
        "estados": estados,
        "cancelado": cancelados.count(),
        "cancelados": {
            "cantidad": cancelados.count(),
            "valor_total_control": _money(cancelados_valor),
            "monto_abonado_control": _money(cancelados_abonado),
            "saldo_pendiente_control": _money(cancelados_valor - cancelados_abonado),
            "nota": "Contratos cancelados visibles solo para control; no suman ingresos, utilidad ni saldo pendiente principal.",
        },
    }


def _best_item(rows, sort_keys):
    if not rows:
        return None
    return sorted(rows, key=sort_keys, reverse=True)[0]


def _group_profitability(rows, group_id_key, group_name_key, empty_name):
    grouped = defaultdict(
        lambda: {
            "id": None,
            "nombre": empty_name,
            "contratos": 0,
            "ingresos": ZERO,
            "costos_directos": ZERO,
            "utilidad_bruta": ZERO,
        }
    )

    for row in rows:
        group_id = row.get(group_id_key)
        group_name = row.get(group_name_key) or empty_name
        key = group_id if group_id is not None else empty_name
        item = grouped[key]
        item["id"] = group_id
        item["nombre"] = group_name
        item["contratos"] += 1
        item["ingresos"] += Decimal(row["valor_final"])
        item["costos_directos"] += Decimal(row["costos_directos"])
        item["utilidad_bruta"] += Decimal(row["utilidad_bruta"])

    result = []
    for item in grouped.values():
        margen = _safe_percentage(item["utilidad_bruta"], item["ingresos"])
        result.append(
            {
                "id": item["id"],
                "nombre": item["nombre"],
                "contratos": item["contratos"],
                "ingresos": _money(item["ingresos"]),
                "costos_directos": _money(item["costos_directos"]),
                "utilidad_bruta": _money(item["utilidad_bruta"]),
                "margen_ponderado": _percent(margen),
                "margen_bruto": _percent(margen),
            }
        )

    return sorted(
        result,
        key=lambda item: (
            Decimal(item["utilidad_bruta"]),
            Decimal(item["ingresos"]),
            item["contratos"],
        ),
        reverse=True,
    )


def _commercial_performance(rows):
    paquetes = _group_profitability(rows, "paquete_id", "paquete_nombre", "Sin paquete")
    tipos_evento = _group_profitability(
        rows,
        "tipo_evento_id",
        "tipo_evento_nombre",
        "Sin tipo de evento",
    )
    paquete_vendido = _best_item(
        paquetes,
        lambda item: (
            item["contratos"],
            Decimal(item["ingresos"]),
            Decimal(item["utilidad_bruta"]),
        ),
    )
    paquete_rentable = _best_item(
        paquetes,
        lambda item: (
            Decimal(item["margen_ponderado"]),
            Decimal(item["utilidad_bruta"]),
            item["contratos"],
        ),
    )
    tipo_frecuente = _best_item(
        tipos_evento,
        lambda item: (
            item["contratos"],
            Decimal(item["ingresos"]),
            Decimal(item["utilidad_bruta"]),
        ),
    )
    tipo_rentable = _best_item(
        tipos_evento,
        lambda item: (
            Decimal(item["margen_ponderado"]),
            Decimal(item["utilidad_bruta"]),
            item["contratos"],
        ),
    )

    return {
        "paquete_mas_vendido": paquete_vendido,
        "paquete_mas_rentable": paquete_rentable,
        "tipo_evento_mas_frecuente": tipo_frecuente,
        "tipo_evento_mas_rentable": tipo_rentable,
    }


def _monthly_evolution(mes, anio):
    evolution = []
    for period_mes, period_anio in _period_sequence(mes, anio):
        metrics = _period_metrics(period_mes, period_anio)
        evolution.append(
            {
                "periodo": metrics["periodo"],
                "label": metrics["periodo"]["label"],
                "ingresos_mes": _money(metrics["ingresos_mes"]),
                "costos_directos_mes": _money(metrics["costos_directos_mes"]),
                "gastos_fijos_mes": _money(metrics["gastos_fijos_mes"]),
                "utilidad_neta": _money(metrics["utilidad_neta"]),
            }
        )
    return evolution


def _current_vs_previous(current, previous):
    categories = [
        ("ingresos_mes", "Ingresos", "currency"),
        ("costos_directos_mes", "Costos directos", "currency"),
        ("utilidad_bruta", "Utilidad bruta", "currency"),
        ("gastos_fijos_mes", "Gastos fijos", "currency"),
        ("utilidad_neta", "Utilidad neta", "currency"),
        ("ticket_promedio", "Ticket promedio", "currency"),
    ]
    return [
        {
            "key": key,
            "label": label,
            "actual": _money(current[key]),
            "anterior": _money(previous[key]),
            "format": value_format,
        }
        for key, label, value_format in categories
    ]


def _pending_financials(rows):
    pending_rows = [
        row
        for row in rows
        if Decimal(row["saldo_pendiente"]) > ZERO
    ]
    pending_rows = sorted(
        pending_rows,
        key=lambda item: Decimal(item["saldo_pendiente"]),
        reverse=True,
    )
    total_pending = sum(
        (Decimal(row["saldo_pendiente"]) for row in pending_rows),
        ZERO,
    )

    return {
        "total_contratos": len(pending_rows),
        "monto_total_pendiente": _money(total_pending),
        "contratos": pending_rows[:8],
        "mensaje_vacio": "No hay contratos confirmados con saldo pendiente en este periodo.",
    }


def _interpretation(metrics, previous_metrics, commercial_performance, pending_financials):
    ingresos = metrics["ingresos_mes"]
    costos = metrics["costos_directos_mes"]
    gastos = metrics["gastos_fijos_mes"]
    utilidad = metrics["utilidad_neta"]
    margen = metrics["margen_neto"]

    if (
        metrics["contratos_confirmados"] == 0
        and costos == 0
        and gastos == 0
    ):
        return {
            "nivel": "neutral",
            "titulo": "Aun no hay informacion suficiente",
            "detalle": "Aun no hay informacion suficiente para generar una interpretacion financiera.",
            "puntos": [],
        }
    if ingresos == 0:
        return {
            "nivel": "neutral",
            "titulo": "Periodo sin ingresos reales",
            "detalle": "Aun no hay contratos confirmados para este mes; los gastos registrados se muestran sin dividir por ingresos.",
            "puntos": [
                "No hay ingresos confirmados para calcular margenes del periodo.",
            ],
        }

    puntos = []
    if previous_metrics["contratos_confirmados"] == 0 and previous_metrics["gastos_fijos_registrados"] == 0:
        puntos.append("No hay suficiente informacion para comparar con el mes anterior.")
    elif utilidad > previous_metrics["utilidad_neta"]:
        puntos.append("La utilidad neta mejora frente al mes anterior.")
    elif utilidad < previous_metrics["utilidad_neta"]:
        puntos.append("La utilidad neta cae frente al mes anterior.")
    else:
        puntos.append("La utilidad neta se mantiene sin variacion frente al mes anterior.")

    if commercial_performance["paquete_mas_vendido"]:
        paquete = commercial_performance["paquete_mas_vendido"]
        puntos.append(
            f"{paquete['nombre']} lidera por volumen con {paquete['contratos']} contrato(s)."
        )

    if pending_financials["total_contratos"]:
        puntos.append(
            f"Hay {pending_financials['total_contratos']} contrato(s) con saldo pendiente actual."
        )

    if utilidad < 0:
        return {
            "nivel": "warning",
            "titulo": "Periodo con perdida neta",
            "detalle": "Los costos directos y gastos fijos superan los ingresos confirmados del mes.",
            "puntos": puntos,
        }
    if margen < Decimal("20"):
        return {
            "nivel": "notice",
            "titulo": "Margen neto bajo",
            "detalle": "El periodo genera utilidad, pero el margen queda por debajo del umbral operativo recomendado.",
            "puntos": puntos,
        }
    return {
        "nivel": "success",
        "titulo": "Periodo rentable",
        "detalle": "Los ingresos confirmados cubren costos directos, gastos fijos y dejan margen neto positivo.",
        "puntos": puntos,
    }


def _serialize_metrics(metrics):
    return {
        "ingresos_mes": _money(metrics["ingresos_mes"]),
        "costos_directos_mes": _money(metrics["costos_directos_mes"]),
        "gastos_fijos_mes": _money(metrics["gastos_fijos_mes"]),
        "utilidad_bruta": _money(metrics["utilidad_bruta"]),
        "margen_bruto": _percent(metrics["margen_bruto"]),
        "utilidad_neta": _money(metrics["utilidad_neta"]),
        "margen_neto": _percent(metrics["margen_neto"]),
        "ticket_promedio": _money(metrics["ticket_promedio"]),
        "contratos_confirmados": metrics["contratos_confirmados"],
        "costos_directos_registrados": metrics["costos_directos_registrados"],
        "gastos_fijos_registrados": metrics["gastos_fijos_registrados"],
    }


def _kpi_payload(current, previous):
    has_previous_activity = (
        previous["contratos_confirmados"] > 0
        or previous["costos_directos_registrados"] > 0
        or previous["gastos_fijos_registrados"] > 0
    )

    def comparison(key, has_previous_data=has_previous_activity):
        return _variation(current[key], previous[key], has_previous_data)

    ingresos = current["ingresos_mes"]
    costos_ratio = _safe_percentage(current["costos_directos_mes"], ingresos)
    gastos_ratio = _safe_percentage(current["gastos_fijos_mes"], ingresos)

    return [
        {
            "key": "ingresos_mes",
            "label": "Ingresos del mes",
            "value": _money(current["ingresos_mes"]),
            "detail": (
                f"{current['contratos_confirmados']} contrato(s) confirmado(s)"
                if current["contratos_confirmados"]
                else "Aun no hay contratos confirmados para este mes."
            ),
            "format": "currency",
            "comparison": comparison(
                "ingresos_mes",
                previous["contratos_confirmados"] > 0,
            ),
        },
        {
            "key": "costos_directos_mes",
            "label": "Costos directos",
            "value": _money(current["costos_directos_mes"]),
            "detail": (
                f"{_percent(costos_ratio)}% de los ingresos del mes"
                if ingresos
                else "No hay ingresos para calcular proporcion"
            ),
            "format": "currency",
            "comparison": comparison(
                "costos_directos_mes",
                previous["costos_directos_registrados"] > 0,
            ),
        },
        {
            "key": "utilidad_bruta",
            "label": "Utilidad bruta",
            "value": _money(current["utilidad_bruta"]),
            "detail": f"Margen bruto: {_percent(current['margen_bruto'])}%",
            "format": "currency",
            "comparison": comparison(
                "utilidad_bruta",
                previous["contratos_confirmados"] > 0,
            ),
        },
        {
            "key": "gastos_fijos_mes",
            "label": "Gastos fijos",
            "value": _money(current["gastos_fijos_mes"]),
            "detail": (
                f"{_percent(gastos_ratio)}% de los ingresos del mes"
                if ingresos
                else "No hay ingresos para calcular proporcion"
            ),
            "format": "currency",
            "comparison": comparison(
                "gastos_fijos_mes",
                previous["gastos_fijos_registrados"] > 0,
            ),
        },
        {
            "key": "utilidad_neta",
            "label": "Utilidad neta",
            "value": _money(current["utilidad_neta"]),
            "detail": f"Margen neto: {_percent(current['margen_neto'])}%",
            "format": "currency",
            "comparison": comparison("utilidad_neta"),
            "featured": True,
        },
        {
            "key": "ticket_promedio",
            "label": "Ticket promedio",
            "value": _money(current["ticket_promedio"]),
            "detail": "Promedio por contrato confirmado",
            "format": "currency",
            "comparison": comparison(
                "ticket_promedio",
                previous["contratos_confirmados"] > 0,
            ),
        },
    ]


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
    event_rows = _event_profitability(mes, anio)
    commercial_performance = _commercial_performance(event_rows)
    rentabilidad_paquetes = _group_profitability(
        event_rows,
        "paquete_id",
        "paquete_nombre",
        "Sin paquete",
    )
    rentabilidad_tipos_evento = _group_profitability(
        event_rows,
        "tipo_evento_id",
        "tipo_evento_nombre",
        "Sin tipo de evento",
    )
    estado_pagos = _payment_status(mes, anio)
    pendientes = _pending_financials(event_rows)
    has_previous_activity = (
        previous["contratos_confirmados"] > 0
        or previous["costos_directos_registrados"] > 0
        or previous["gastos_fijos_registrados"] > 0
    )
    comparativo_mes_anterior = _current_vs_previous(current, previous)
    interpretacion = _interpretation(
        current,
        previous,
        commercial_performance,
        pendientes,
    )

    return {
        "periodo": current["periodo"],
        **serialized_current,
        "kpis": _kpi_payload(current, previous),
        "metricas": serialized_current,
        "comparacion_mes_anterior": {
            "periodo": previous["periodo"],
            "metricas": serialized_previous,
            "variaciones": {
                "ingresos_mes": _variation(
                    current["ingresos_mes"],
                    previous["ingresos_mes"],
                    previous["contratos_confirmados"] > 0,
                ),
                "costos_directos_mes": _variation(
                    current["costos_directos_mes"],
                    previous["costos_directos_mes"],
                    previous["costos_directos_registrados"] > 0,
                ),
                "utilidad_bruta": _variation(
                    current["utilidad_bruta"],
                    previous["utilidad_bruta"],
                    previous["contratos_confirmados"] > 0,
                ),
                "gastos_fijos_mes": _variation(
                    current["gastos_fijos_mes"],
                    previous["gastos_fijos_mes"],
                    previous["gastos_fijos_registrados"] > 0,
                ),
                "utilidad_neta": _variation(
                    current["utilidad_neta"],
                    previous["utilidad_neta"],
                    has_previous_activity,
                ),
                "margen_neto": {
                    "delta": _percent(current["margen_neto"] - previous["margen_neto"]),
                    "porcentaje": None,
                    "direccion": (
                        "sin_datos"
                        if previous["ingresos_mes"] == 0
                        else (
                            "sube"
                            if current["margen_neto"] > previous["margen_neto"]
                            else "baja"
                            if current["margen_neto"] < previous["margen_neto"]
                            else "sin_variacion"
                        )
                    ),
                    "tiene_comparacion": previous["ingresos_mes"] > 0,
                },
                "ticket_promedio": _variation(
                    current["ticket_promedio"],
                    previous["ticket_promedio"],
                    previous["contratos_confirmados"] > 0,
                ),
            },
        },
        "desempeno_comercial": commercial_performance,
        "evolucion_mensual": _monthly_evolution(mes, anio),
        "comparativo_mes_anterior": {
            "periodo_actual": current["periodo"],
            "periodo_anterior": previous["periodo"],
            "categorias": comparativo_mes_anterior,
            "tiene_comparacion": has_previous_activity,
            "mensaje_vacio": "No hay suficiente informacion para comparar con el mes anterior.",
        },
        "rentabilidad_por_paquete": rentabilidad_paquetes,
        "analisis_por_tipo_evento": rentabilidad_tipos_evento,
        "top_eventos_rentables": event_rows[:5],
        "rentabilidad_eventos": event_rows,
        "estado_pagos": estado_pagos,
        "estado_pagos_cobranza": estado_pagos,
        "pendientes_financieros": pendientes,
        "interpretacion": interpretacion,
        "estados_vacios": {
            "contratos_confirmados": "Aun no hay contratos confirmados para este mes.",
            "costos_directos": "No hay costos registrados en este periodo.",
            "gastos_fijos": "No hay gastos fijos registrados para este mes.",
            "comparacion": "No hay suficiente informacion para comparar con el mes anterior.",
            "interpretacion": "Aun no hay informacion suficiente para generar una interpretacion financiera.",
        },
    }
