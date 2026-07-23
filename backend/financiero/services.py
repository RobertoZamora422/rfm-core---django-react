"""Servicios de negocio de la app financiero."""

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from negocio.ofertas import presentacion_paquete

from .models import (
    Contrato,
    GastoRecurrente,
    GastoRecurrenteAjuste,
    GastoRecurrenteVersion,
)
from .selectors import (
    contratos_cancelados_entre,
    contratos_confirmados_con_rentabilidad_entre,
    contratos_confirmados_con_saldo_pendiente,
    contratos_confirmados_entre,
    costos_directos_activos_por_evento_entre,
    gastos_adicionales_activos_entre,
    gastos_recurrentes_aplicables,
    gastos_recurrentes_con_vigencia_entre,
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
    if contrato.estado_contrato == Contrato.EstadoContrato.CANCELADO:
        raise ValidationError({"estado_contrato": "El contrato ya se encuentra cancelado."})
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


def eliminar_logicamente_gasto_adicional(gasto):
    return _eliminar_logicamente(gasto)


def _period_date(mes, anio):
    return date(anio, mes, 1)


def _previous_period_date(periodo):
    previous_mes, previous_anio = _previous_period(periodo.month, periodo.year)
    return date(previous_anio, previous_mes, 1)


def _current_period_date():
    today = timezone.localdate()
    return date(today.year, today.month, 1)


def _serialize_recurrent_application(gasto):
    version = gasto.versiones_periodo[0]
    ajuste = gasto.ajustes_periodo[0] if gasto.ajustes_periodo else None
    valor = ajuste.valor if ajuste else version.valor_mensual
    return {
        "id": gasto.id,
        "concepto": gasto.concepto,
        "valor": _money(valor),
        "valor_base": _money(version.valor_mensual),
        "es_ajuste": bool(ajuste),
        "ajuste_id": ajuste.id if ajuste else None,
        "observaciones": ajuste.observaciones if ajuste else gasto.observaciones,
        "inicio_periodo": gasto.inicio_periodo.isoformat(),
        "fin_periodo": gasto.fin_periodo.isoformat() if gasto.fin_periodo else None,
        "activo": gasto.activo,
    }


def gastos_recurrentes_del_periodo(mes, anio):
    periodo = _period_date(mes, anio)
    aplicaciones = [
        _serialize_recurrent_application(gasto)
        for gasto in gastos_recurrentes_aplicables(periodo)
    ]
    total = sum((Decimal(item["valor"]) for item in aplicaciones), ZERO)
    return aplicaciones, total


def resumen_gastos_periodo(mes, anio):
    inicio, fin = _month_bounds(mes, anio)
    recurrentes, total_recurrentes = gastos_recurrentes_del_periodo(mes, anio)
    adicionales = gastos_adicionales_activos_entre(inicio, fin)
    total_adicionales = _sum(adicionales, "valor")
    return {
        "periodo": {
            "mes": mes,
            "anio": anio,
            "inicio": inicio.isoformat(),
            "fin": fin.isoformat(),
            "label": _period_label(mes, anio),
        },
        "gastos_fijos_recurrentes_periodo": total_recurrentes,
        "gastos_adicionales_periodo": total_adicionales,
        "total_gastos_operativos_periodo": total_recurrentes + total_adicionales,
        "gastos_recurrentes_aplicados": len(recurrentes),
        "gastos_adicionales_registrados": adicionales.count(),
        "recurrentes": recurrentes,
        "adicionales": [
            {
                "id": gasto.id,
                "concepto": gasto.concepto,
                "valor": _money(gasto.valor),
                "fecha": gasto.fecha.isoformat(),
                "observaciones": gasto.observaciones,
                "origen_legacy": gasto.origen_legacy,
            }
            for gasto in adicionales.order_by("fecha", "concepto", "id")
        ],
    }


def serializar_resumen_gastos(resumen):
    return {
        **resumen,
        "gastos_fijos_recurrentes_periodo": _money(
            resumen["gastos_fijos_recurrentes_periodo"]
        ),
        "gastos_adicionales_periodo": _money(
            resumen["gastos_adicionales_periodo"]
        ),
        "total_gastos_operativos_periodo": _money(
            resumen["total_gastos_operativos_periodo"]
        ),
    }


@transaction.atomic
def crear_gasto_recurrente(
    *,
    concepto,
    valor_mensual,
    inicio_periodo,
    fin_periodo=None,
    observaciones="",
):
    gasto = GastoRecurrente.objects.create(
        concepto=concepto,
        observaciones=observaciones,
        inicio_periodo=inicio_periodo,
        fin_periodo=fin_periodo,
        activo=True,
    )
    GastoRecurrenteVersion.objects.create(
        gasto_recurrente=gasto,
        valor_mensual=valor_mensual,
        vigente_desde=inicio_periodo,
        vigente_hasta=fin_periodo,
    )
    return gasto


@transaction.atomic
def ajustar_gasto_recurrente_desde(*, gasto, periodo, valor_mensual):
    if periodo < _current_period_date():
        raise ValidationError(
            {"periodo": "Los cambios permanentes solo pueden comenzar en el mes actual o uno futuro."}
        )

    gasto = GastoRecurrente.objects.select_for_update().get(pk=gasto.pk)
    future_versions = gasto.versiones.filter(vigente_desde__gt=periodo)
    if future_versions.exists():
        raise ValidationError(
            {"periodo": "Ya existe un cambio de valor programado después de ese periodo."}
        )

    version = (
        gasto.versiones.filter(vigente_desde__lte=periodo)
        .filter(
            Q(vigente_hasta__isnull=True)
            | Q(vigente_hasta__gte=periodo)
        )
        .order_by("-vigente_desde")
        .first()
    )
    if not version:
        raise ValidationError(
            {"periodo": "El gasto recurrente no se encuentra vigente en ese periodo."}
        )

    if version.vigente_desde == periodo:
        version.valor_mensual = valor_mensual
        version.save(update_fields=["valor_mensual", "actualizado_en"])
    else:
        previous_end = version.vigente_hasta
        version.vigente_hasta = _previous_period_date(periodo)
        version.save(update_fields=["vigente_hasta", "actualizado_en"])
        GastoRecurrenteVersion.objects.create(
            gasto_recurrente=gasto,
            valor_mensual=valor_mensual,
            vigente_desde=periodo,
            vigente_hasta=previous_end,
        )
    return gasto


@transaction.atomic
def ajustar_gasto_recurrente_periodo(
    *,
    gasto,
    periodo,
    valor,
    observaciones="",
):
    gasto = GastoRecurrente.objects.select_for_update().get(pk=gasto.pk)
    if not gasto.versiones.filter(vigente_desde__lte=periodo).filter(
        Q(vigente_hasta__isnull=True)
        | Q(vigente_hasta__gte=periodo)
    ).exists():
        raise ValidationError(
            {"periodo": "El gasto recurrente no se aplica en ese periodo."}
        )
    ajuste, _created = GastoRecurrenteAjuste.objects.update_or_create(
        gasto_recurrente=gasto,
        periodo=periodo,
        defaults={
            "valor": valor,
            "observaciones": observaciones,
            "eliminado": False,
            "eliminado_en": None,
        },
    )
    return ajuste


@transaction.atomic
def desactivar_gasto_recurrente(*, gasto, periodo_desde):
    if periodo_desde < _current_period_date():
        raise ValidationError(
            {"periodo_desde": "La desactivación no puede modificar periodos históricos."}
        )
    gasto = GastoRecurrente.objects.select_for_update().get(pk=gasto.pk)
    if not gasto.activo:
        raise ValidationError({"activo": "El gasto recurrente ya está inactivo."})

    cutoff = _previous_period_date(periodo_desde)
    now = timezone.now()
    gasto.ajustes.filter(
        periodo__gte=periodo_desde,
        eliminado=False,
    ).update(
        eliminado=True,
        eliminado_en=now,
        actualizado_en=now,
    )
    gasto.versiones.filter(vigente_desde__gte=periodo_desde).delete()
    for version in gasto.versiones.filter(vigente_desde__lt=periodo_desde):
        if version.vigente_hasta is None or version.vigente_hasta >= periodo_desde:
            version.vigente_hasta = cutoff
            version.save(update_fields=["vigente_hasta", "actualizado_en"])

    gasto.activo = False
    gasto.fin_periodo = cutoff
    gasto.save(update_fields=["activo", "fin_periodo", "actualizado_en"])
    return gasto


@transaction.atomic
def reactivar_gasto_recurrente(
    *,
    gasto,
    periodo_desde,
    valor_mensual,
    periodo_hasta=None,
):
    if periodo_desde < _current_period_date():
        raise ValidationError(
            {"periodo_desde": "La reactivación debe comenzar en el mes actual o uno futuro."}
        )
    gasto = GastoRecurrente.objects.select_for_update().get(pk=gasto.pk)
    if gasto.activo:
        raise ValidationError({"activo": "El gasto recurrente ya está activo."})
    if periodo_hasta and periodo_hasta < periodo_desde:
        raise ValidationError(
            {"periodo_hasta": "El periodo final no puede ser anterior al inicial."}
        )

    GastoRecurrenteVersion.objects.create(
        gasto_recurrente=gasto,
        valor_mensual=valor_mensual,
        vigente_desde=periodo_desde,
        vigente_hasta=periodo_hasta,
    )
    gasto.activo = True
    gasto.fin_periodo = periodo_hasta
    gasto.save(update_fields=["activo", "fin_periodo", "actualizado_en"])
    return gasto


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
    gastos = resumen_gastos_periodo(mes, anio)

    ingresos = _sum(contratos, "valor_final")
    costos = _sum(costos_directos, "valor")
    total_gastos = gastos["total_gastos_operativos_periodo"]
    utilidad_bruta = ingresos - costos
    utilidad_neta = utilidad_bruta - total_gastos
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
        "gastos_fijos_recurrentes_periodo": gastos[
            "gastos_fijos_recurrentes_periodo"
        ],
        "gastos_adicionales_periodo": gastos["gastos_adicionales_periodo"],
        "total_gastos_operativos_periodo": total_gastos,
        "utilidad_bruta": utilidad_bruta,
        "margen_bruto": margen_bruto,
        "utilidad_neta": utilidad_neta,
        "margen_neto": margen_neto,
        "ticket_promedio": ticket_promedio,
        "contratos_confirmados": contratos_count,
        "costos_directos_registrados": costos_directos.count(),
        "gastos_recurrentes_aplicados": gastos["gastos_recurrentes_aplicados"],
        "gastos_adicionales_registrados": gastos[
            "gastos_adicionales_registrados"
        ],
        "gastos_operativos_registrados": (
            gastos["gastos_recurrentes_aplicados"]
            + gastos["gastos_adicionales_registrados"]
        ),
        "gastos_periodo": gastos,
    }


def _serialize_contract_profitability(contrato):
    total_costos = contrato.costos_directos_total or ZERO
    utilidad = contrato.valor_final - total_costos
    margen = _safe_percentage(utilidad, contrato.valor_final)
    return {
        "id": contrato.id,
        "contrato_id": contrato.id,
        "persona_nombre": contrato.persona.nombre,
        "persona_telefono": contrato.persona.telefono,
        "tipo_evento_id": contrato.tipo_evento_id,
        "tipo_evento_nombre": contrato.tipo_evento.nombre,
        "paquete_id": contrato.paquete_id,
        "paquete_nombre": presentacion_paquete(
            tipo_servicio=contrato.tipo_servicio,
            snapshot=contrato.oferta_snapshot,
            paquete=contrato.paquete,
        ),
        "tipo_servicio": contrato.tipo_servicio,
        "tipo_servicio_display": contrato.get_tipo_servicio_display()
        if contrato.tipo_servicio
        else "Requiere revisión",
        "fecha_evento": contrato.fecha_evento.isoformat(),
        "numero_invitados": contrato.numero_invitados,
        "valor_final": _money(contrato.valor_final),
        "costos_directos": _money(total_costos),
        "utilidad_bruta": _money(utilidad),
        "margen_bruto": _percent(margen),
        "estado_pago": contrato.estado_pago,
        "saldo_pendiente": _money(contrato.saldo_pendiente),
    }


def _contract_profit_rows(mes, anio):
    inicio, fin = _month_bounds(mes, anio)
    contratos = contratos_confirmados_con_rentabilidad_entre(inicio, fin)
    return [_serialize_contract_profitability(contrato) for contrato in contratos]


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
    filas_paquetes = [
        row
        for row in rows
        if row.get("tipo_servicio") == Contrato.TipoServicio.SERVICIO_COMPLETO
        and row.get("paquete_id") is not None
    ]
    paquetes = _group_profitability(
        filas_paquetes,
        "paquete_id",
        "paquete_nombre",
        "Paquete no identificado",
    )
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


def _grouped_monthly_values(queryset, *, date_field, value_field):
    return {
        item["periodo"]: item["total"] or ZERO
        for item in queryset.annotate(
            periodo=TruncMonth(date_field),
        )
        .values("periodo")
        .annotate(total=Sum(value_field))
    }


def _recurrent_totals_by_period(period_dates):
    totals = {periodo: ZERO for periodo in period_dates}
    if not period_dates:
        return totals

    gastos = gastos_recurrentes_con_vigencia_entre(
        min(period_dates),
        max(period_dates),
    )
    for gasto in gastos:
        ajustes = {
            ajuste.periodo: ajuste
            for ajuste in gasto.ajustes_rango
        }
        for periodo in period_dates:
            version = next(
                (
                    item
                    for item in reversed(gasto.versiones_rango)
                    if item.vigente_desde <= periodo
                    and (
                        item.vigente_hasta is None
                        or item.vigente_hasta >= periodo
                    )
                ),
                None,
            )
            if version is None:
                continue
            ajuste = ajustes.get(periodo)
            totals[periodo] += ajuste.valor if ajuste else version.valor_mensual
    return totals


def _monthly_evolution(mes, anio):
    periods = _period_sequence(mes, anio)
    period_dates = [date(period_anio, period_mes, 1) for period_mes, period_anio in periods]
    range_start = period_dates[0]
    _last_start, range_end = _month_bounds(periods[-1][0], periods[-1][1])

    ingresos_por_periodo = _grouped_monthly_values(
        Contrato.objects.filter(
            estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
            fecha_evento__gte=range_start,
            fecha_evento__lte=range_end,
        ),
        date_field="fecha_evento",
        value_field="valor_final",
    )
    costos_por_periodo = _grouped_monthly_values(
        costos_directos_activos_por_evento_entre(range_start, range_end),
        date_field="contrato__fecha_evento",
        value_field="valor",
    )
    adicionales_por_periodo = _grouped_monthly_values(
        gastos_adicionales_activos_entre(range_start, range_end),
        date_field="fecha",
        value_field="valor",
    )
    recurrentes_por_periodo = _recurrent_totals_by_period(period_dates)

    evolution = []
    for (period_mes, period_anio), periodo in zip(periods, period_dates):
        ingresos = ingresos_por_periodo.get(periodo, ZERO)
        costos = costos_por_periodo.get(periodo, ZERO)
        recurrentes = recurrentes_por_periodo.get(periodo, ZERO)
        adicionales = adicionales_por_periodo.get(periodo, ZERO)
        gastos_operativos = recurrentes + adicionales
        evolution.append(
            {
                "periodo": {
                    "mes": period_mes,
                    "anio": period_anio,
                    "inicio": periodo.isoformat(),
                    "fin": _month_bounds(period_mes, period_anio)[1].isoformat(),
                    "label": _period_label(period_mes, period_anio),
                },
                "label": _period_label(period_mes, period_anio),
                "ingresos_mes": _money(ingresos),
                "costos_directos_mes": _money(costos),
                "gastos_fijos_recurrentes_periodo": _money(recurrentes),
                "gastos_adicionales_periodo": _money(adicionales),
                "total_gastos_operativos_periodo": _money(gastos_operativos),
                "utilidad_neta": _money(ingresos - costos - gastos_operativos),
            }
        )
    return evolution


def _current_vs_previous(current, previous):
    categories = [
        ("ingresos_mes", "Ingresos", "currency"),
        ("costos_directos_mes", "Costos directos", "currency"),
        ("utilidad_bruta", "Utilidad bruta", "currency"),
        ("total_gastos_operativos_periodo", "Gastos operativos", "currency"),
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


def _pending_financials():
    pending_rows = [
        _serialize_contract_profitability(contrato)
        for contrato in contratos_confirmados_con_saldo_pendiente()
    ]
    total_pending = sum(
        (Decimal(row["saldo_pendiente"]) for row in pending_rows),
        ZERO,
    )

    return {
        "total_contratos": len(pending_rows),
        "monto_total_pendiente": _money(total_pending),
        "contratos": pending_rows,
        "mensaje_vacio": "No hay contratos confirmados con saldo pendiente.",
    }


def _interpretation(metrics, previous_metrics, commercial_performance, pending_financials):
    ingresos = metrics["ingresos_mes"]
    costos = metrics["costos_directos_mes"]
    gastos = metrics["total_gastos_operativos_periodo"]
    utilidad = metrics["utilidad_neta"]
    margen = metrics["margen_neto"]

    if (
        metrics["contratos_confirmados"] == 0
        and costos == 0
        and gastos == 0
    ):
        return {
            "nivel": "neutral",
            "titulo": "Aún no hay información suficiente",
            "detalle": "Aún no hay información suficiente para generar una interpretación financiera.",
            "puntos": [],
        }
    if ingresos == 0:
        return {
            "nivel": "neutral",
            "titulo": "Periodo sin ingresos reales",
            "detalle": "Aún no hay contratos confirmados para este mes; los gastos registrados se muestran sin dividir por ingresos.",
            "puntos": [
                "No hay ingresos confirmados para calcular márgenes del periodo.",
            ],
        }

    puntos = []
    if (
        previous_metrics["contratos_confirmados"] == 0
        and previous_metrics["gastos_operativos_registrados"] == 0
    ):
        puntos.append("No hay suficiente información para comparar con el mes anterior.")
    elif utilidad > previous_metrics["utilidad_neta"]:
        puntos.append("La utilidad neta mejora frente al mes anterior.")
    elif utilidad < previous_metrics["utilidad_neta"]:
        puntos.append("La utilidad neta cae frente al mes anterior.")
    else:
        puntos.append("La utilidad neta se mantiene sin variación frente al mes anterior.")

    if commercial_performance["paquete_mas_vendido"]:
        paquete = commercial_performance["paquete_mas_vendido"]
        puntos.append(
            f"{paquete['nombre']} lidera por volumen con "
            f"{paquete['contratos']} "
            f"{'contrato' if paquete['contratos'] == 1 else 'contratos'}."
        )

    if pending_financials["total_contratos"]:
        puntos.append(
            f"Hay {pending_financials['total_contratos']} "
            f"{'contrato' if pending_financials['total_contratos'] == 1 else 'contratos'} "
            "con saldo pendiente actual."
        )

    if utilidad < 0:
        return {
            "nivel": "warning",
            "titulo": "Periodo con pérdida neta",
            "detalle": "Los costos directos y gastos operativos superan los ingresos confirmados del mes.",
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
        "detalle": "Los ingresos confirmados cubren costos directos, gastos operativos y dejan margen neto positivo.",
        "puntos": puntos,
    }


def _serialize_metrics(metrics):
    return {
        "ingresos_mes": _money(metrics["ingresos_mes"]),
        "costos_directos_mes": _money(metrics["costos_directos_mes"]),
        "gastos_fijos_recurrentes_periodo": _money(
            metrics["gastos_fijos_recurrentes_periodo"]
        ),
        "gastos_adicionales_periodo": _money(
            metrics["gastos_adicionales_periodo"]
        ),
        "total_gastos_operativos_periodo": _money(
            metrics["total_gastos_operativos_periodo"]
        ),
        "utilidad_bruta": _money(metrics["utilidad_bruta"]),
        "margen_bruto": _percent(metrics["margen_bruto"]),
        "utilidad_neta": _money(metrics["utilidad_neta"]),
        "margen_neto": _percent(metrics["margen_neto"]),
        "ticket_promedio": _money(metrics["ticket_promedio"]),
        "contratos_confirmados": metrics["contratos_confirmados"],
        "costos_directos_registrados": metrics["costos_directos_registrados"],
        "gastos_recurrentes_aplicados": metrics["gastos_recurrentes_aplicados"],
        "gastos_adicionales_registrados": metrics[
            "gastos_adicionales_registrados"
        ],
        "gastos_operativos_registrados": metrics["gastos_operativos_registrados"],
    }


def _kpi_payload(current, previous):
    has_previous_activity = (
        previous["contratos_confirmados"] > 0
        or previous["costos_directos_registrados"] > 0
        or previous["gastos_operativos_registrados"] > 0
    )

    def comparison(key, has_previous_data=has_previous_activity):
        return _variation(current[key], previous[key], has_previous_data)

    ingresos = current["ingresos_mes"]
    costos_ratio = _safe_percentage(current["costos_directos_mes"], ingresos)
    return [
        {
            "key": "ingresos_mes",
            "label": "Ingresos del mes",
            "value": _money(current["ingresos_mes"]),
            "detail": (
                f"{current['contratos_confirmados']} "
                f"{'contrato confirmado' if current['contratos_confirmados'] == 1 else 'contratos confirmados'}"
                if current["contratos_confirmados"]
                else "Aún no hay contratos confirmados para este mes."
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
                else "No hay ingresos para calcular proporción"
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
            "key": "total_gastos_operativos_periodo",
            "label": "Gastos operativos",
            "value": _money(current["total_gastos_operativos_periodo"]),
            "detail": (
                (
                    f"Fijos {_money(current['gastos_fijos_recurrentes_periodo'])} "
                    f"· adicionales {_money(current['gastos_adicionales_periodo'])}"
                )
                if ingresos
                else (
                    f"Fijos {_money(current['gastos_fijos_recurrentes_periodo'])} "
                    f"· adicionales {_money(current['gastos_adicionales_periodo'])}"
                )
            ),
            "format": "currency",
            "comparison": comparison(
                "total_gastos_operativos_periodo",
                previous["gastos_operativos_registrados"] > 0,
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
        [
            row
            for row in event_rows
            if row.get("tipo_servicio") == Contrato.TipoServicio.SERVICIO_COMPLETO
            and row.get("paquete_id") is not None
        ],
        "paquete_id",
        "paquete_nombre",
        "Paquete no identificado",
    )
    rentabilidad_tipos_servicio = _group_profitability(
        event_rows,
        "tipo_servicio",
        "tipo_servicio_display",
        "Requiere revisión",
    )
    rentabilidad_tipos_evento = _group_profitability(
        event_rows,
        "tipo_evento_id",
        "tipo_evento_nombre",
        "Sin tipo de evento",
    )
    estado_pagos = _payment_status(mes, anio)
    pendientes = _pending_financials()
    has_previous_activity = (
        previous["contratos_confirmados"] > 0
        or previous["costos_directos_registrados"] > 0
        or previous["gastos_operativos_registrados"] > 0
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
                "total_gastos_operativos_periodo": _variation(
                    current["total_gastos_operativos_periodo"],
                    previous["total_gastos_operativos_periodo"],
                    previous["gastos_operativos_registrados"] > 0,
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
            "mensaje_vacio": "No hay suficiente información para comparar con el mes anterior.",
        },
        "rentabilidad_por_paquete": rentabilidad_paquetes,
        "rentabilidad_por_tipo_servicio": rentabilidad_tipos_servicio,
        "analisis_por_tipo_evento": rentabilidad_tipos_evento,
        "top_eventos_rentables": event_rows[:5],
        "rentabilidad_eventos": event_rows,
        "estado_pagos": estado_pagos,
        "estado_pagos_cobranza": estado_pagos,
        "pendientes_financieros": pendientes,
        "interpretacion": interpretacion,
        "gastos_periodo": serializar_resumen_gastos(current["gastos_periodo"]),
        "estados_vacios": {
            "contratos_confirmados": "Aún no hay contratos confirmados para este mes.",
            "costos_directos": "No hay costos registrados en este periodo.",
            "gastos_operativos": "No existen gastos aplicables para este periodo.",
            "comparacion": "No hay suficiente información para comparar con el mes anterior.",
            "interpretacion": "Aún no hay información suficiente para generar una interpretación financiera.",
        },
    }
