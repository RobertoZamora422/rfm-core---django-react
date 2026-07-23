"""Servicios de negocio de la app reportes."""

from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count, Q, Sum

from comercial.models import Cotizacion
from financiero.models import Contrato, CostoDirecto
from financiero.services import dashboard_financiero
from negocio.ofertas import presentacion_paquete


ZERO = Decimal("0.00")
HUNDRED = Decimal("100")


def _money(value):
    return str((value or ZERO).quantize(Decimal("0.01")))


def _percent(value):
    return str((value or ZERO).quantize(Decimal("0.01")))


def _sum(queryset, field):
    return queryset.aggregate(total=Sum(field))["total"] or ZERO


def _safe_percentage(numerator, denominator):
    if not denominator:
        return ZERO
    return (numerator / denominator) * HUNDRED


def _cotizacion_contrato_id(cotizacion):
    try:
        return cotizacion.contrato.id
    except ObjectDoesNotExist:
        return None


def _periodo_fechas(desde, hasta):
    return {
        "desde": desde.isoformat(),
        "hasta": hasta.isoformat(),
    }


def _quote_row(cotizacion):
    return {
        "id": cotizacion.id,
        "persona_nombre": cotizacion.persona.nombre,
        "persona_telefono": cotizacion.persona.telefono,
        "tipo_evento_nombre": cotizacion.tipo_evento.nombre,
        "paquete_nombre": presentacion_paquete(
            tipo_servicio=cotizacion.tipo_servicio,
            snapshot=cotizacion.oferta_snapshot,
            paquete=cotizacion.paquete,
        ),
        "fecha_tentativa": cotizacion.fecha_tentativa.isoformat(),
        "numero_invitados": cotizacion.numero_invitados,
        "tipo_servicio": cotizacion.tipo_servicio,
        "tipo_servicio_display": cotizacion.get_tipo_servicio_display(),
        "estado": cotizacion.estado,
        "total_estimado": _money(cotizacion.total_estimado),
        "contrato_id": _cotizacion_contrato_id(cotizacion),
    }


def reporte_comercial(desde, hasta):
    cotizaciones = Cotizacion.objects.filter(
        fecha_tentativa__gte=desde,
        fecha_tentativa__lte=hasta,
    ).select_related("persona", "tipo_evento", "paquete")

    total_cotizaciones = cotizaciones.count()
    total_estimado = _sum(cotizaciones, "total_estimado")
    convertidas = cotizaciones.filter(estado=Cotizacion.Estado.CONVERTIDA).count()
    activas = cotizaciones.filter(
        estado__in=[
            Cotizacion.Estado.NUEVA,
            Cotizacion.Estado.CONTACTADA,
            Cotizacion.Estado.CONFIRMADA,
        ]
    ).count()

    conteos = {
        item["estado"]: item["cantidad"]
        for item in cotizaciones.values("estado").annotate(cantidad=Count("id"))
    }

    return {
        "tipo": "comercial",
        "periodo": _periodo_fechas(desde, hasta),
        "resumen": {
            "total_cotizaciones": total_cotizaciones,
            "cotizaciones_activas": activas,
            "cotizaciones_convertidas": convertidas,
            "cotizaciones_descartadas": conteos.get(Cotizacion.Estado.DESCARTADA, 0),
            "total_estimado_referencial": _money(total_estimado),
            "conversion_porcentaje": _percent(
                _safe_percentage(Decimal(convertidas), Decimal(total_cotizaciones))
            ),
        },
        "por_estado": [
            {
                "key": key,
                "label": label,
                "cantidad": conteos.get(key, 0),
            }
            for key, label in Cotizacion.Estado.choices
        ],
        "cotizaciones": [
            _quote_row(cotizacion)
            for cotizacion in cotizaciones.order_by("-fecha_tentativa", "-id")
        ],
    }


def reporte_financiero(mes, anio):
    dashboard = dashboard_financiero(mes=mes, anio=anio)
    return {
        "tipo": "financiero",
        "periodo": dashboard["periodo"],
        "metricas": dashboard["metricas"],
        "kpis": dashboard["kpis"],
        "comparacion_mes_anterior": dashboard["comparacion_mes_anterior"],
        "estado_pagos": dashboard["estado_pagos"],
        "rentabilidad_eventos": dashboard["rentabilidad_eventos"],
        "interpretacion": dashboard["interpretacion"],
        "gastos_periodo": dashboard["gastos_periodo"],
    }


def _contract_row(contrato):
    return {
        "id": contrato.id,
        "contrato_id": contrato.id,
        "persona_nombre": contrato.persona.nombre,
        "persona_telefono": contrato.persona.telefono,
        "tipo_evento_nombre": contrato.tipo_evento.nombre,
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
        "estado_contrato": contrato.estado_contrato,
        "estado_pago": contrato.estado_pago,
        "valor_final": _money(contrato.valor_final),
        "monto_abonado": _money(contrato.monto_abonado),
        "saldo_pendiente": _money(contrato.saldo_pendiente),
    }


def reporte_eventos(desde, hasta):
    contratos = Contrato.objects.filter(
        fecha_evento__gte=desde,
        fecha_evento__lte=hasta,
    ).select_related("persona", "tipo_evento", "paquete")
    confirmados = contratos.filter(estado_contrato=Contrato.EstadoContrato.CONFIRMADO)
    cancelados = contratos.filter(estado_contrato=Contrato.EstadoContrato.CANCELADO)
    total_valor_confirmado = _sum(confirmados, "valor_final")
    total_abonado_confirmado = _sum(confirmados, "monto_abonado")

    por_tipo = []
    grouped = (
        contratos.values("tipo_evento__nombre")
        .annotate(
            total=Count("id"),
            confirmados=Count(
                "id",
                filter=Q(estado_contrato=Contrato.EstadoContrato.CONFIRMADO),
            ),
            cancelados=Count(
                "id",
                filter=Q(estado_contrato=Contrato.EstadoContrato.CANCELADO),
            ),
        )
        .order_by("tipo_evento__nombre")
    )
    for item in grouped:
        por_tipo.append(
            {
                "tipo_evento_nombre": item["tipo_evento__nombre"],
                "total": item["total"],
                "confirmados": item["confirmados"],
                "cancelados": item["cancelados"],
            }
        )

    return {
        "tipo": "eventos",
        "periodo": _periodo_fechas(desde, hasta),
        "resumen": {
            "total_eventos": contratos.count(),
            "eventos_confirmados": confirmados.count(),
            "eventos_cancelados": cancelados.count(),
            "invitados_confirmados": confirmados.aggregate(total=Sum("numero_invitados"))["total"]
            or 0,
            "valor_confirmado": _money(total_valor_confirmado),
            "monto_abonado_confirmado": _money(total_abonado_confirmado),
            "saldo_pendiente_confirmado": _money(
                total_valor_confirmado - total_abonado_confirmado
            ),
        },
        "por_tipo_evento": por_tipo,
        "eventos": [
            _contract_row(contrato)
            for contrato in contratos.order_by("fecha_evento", "id")
        ],
    }


def _empty_package_row(key, paquete_id, nombre, tipo_servicio, tipo_servicio_display):
    return {
        "key": str(key),
        "paquete_id": paquete_id,
        "paquete_nombre": nombre,
        "tipo_servicio": tipo_servicio,
        "tipo_servicio_display": tipo_servicio_display,
        "cotizaciones": 0,
        "cotizaciones_convertidas": 0,
        "contratos_confirmados": 0,
        "ingresos_confirmados": ZERO,
        "costos_directos": ZERO,
        "utilidad_bruta": ZERO,
    }


def _offer_identity(instance):
    snapshot = instance.oferta_snapshot or {}
    paquete_snapshot = snapshot.get("paquete", {})
    paquete_id = paquete_snapshot.get("id") or instance.paquete_id
    nombre = presentacion_paquete(
        tipo_servicio=instance.tipo_servicio,
        snapshot=snapshot,
        paquete=instance.paquete,
    )
    if paquete_id:
        key = f"paquete:{paquete_id}"
    else:
        key = f"servicio:{instance.tipo_servicio or 'revision'}"
    display = (
        instance.get_tipo_servicio_display()
        if instance.tipo_servicio
        else "Requiere revisión"
    )
    return key, paquete_id, nombre, instance.tipo_servicio or "", display


def reporte_paquetes(desde, hasta):
    rows = {}
    cotizaciones = Cotizacion.objects.filter(
        fecha_tentativa__gte=desde,
        fecha_tentativa__lte=hasta,
    ).select_related("paquete")
    for cotizacion in cotizaciones:
        key, paquete_id, nombre, tipo, tipo_display = _offer_identity(cotizacion)
        rows.setdefault(
            key,
            _empty_package_row(
                key,
                paquete_id,
                nombre,
                tipo,
                tipo_display,
            ),
        )
        rows[key]["cotizaciones"] += 1
        if cotizacion.estado == Cotizacion.Estado.CONVERTIDA:
            rows[key]["cotizaciones_convertidas"] += 1

    contratos = list(
        Contrato.objects.filter(
            estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
            fecha_evento__gte=desde,
            fecha_evento__lte=hasta,
        )
        .select_related("paquete")
    )
    costos_por_contrato = {
        item["contrato_id"]: item["costos"] or ZERO
        for item in CostoDirecto.objects.filter(
            contrato_id__in=[contrato.id for contrato in contratos],
            eliminado=False,
        )
        .values("contrato_id")
        .annotate(costos=Sum("valor"))
    }
    for contrato in contratos:
        key, paquete_id, nombre, tipo, tipo_display = _offer_identity(contrato)
        rows.setdefault(
            key,
            _empty_package_row(
                key,
                paquete_id,
                nombre,
                tipo,
                tipo_display,
            ),
        )
        rows[key]["contratos_confirmados"] += 1
        rows[key]["ingresos_confirmados"] += contrato.valor_final
        rows[key]["costos_directos"] += costos_por_contrato.get(contrato.id, ZERO)

    paquetes = []
    for row in rows.values():
        row["utilidad_bruta"] = row["ingresos_confirmados"] - row["costos_directos"]
        margen = _safe_percentage(row["utilidad_bruta"], row["ingresos_confirmados"])
        paquetes.append(
            {
                **row,
                "ingresos_confirmados": _money(row["ingresos_confirmados"]),
                "costos_directos": _money(row["costos_directos"]),
                "utilidad_bruta": _money(row["utilidad_bruta"]),
                "margen_bruto": _percent(margen),
            }
        )

    paquetes = sorted(
        paquetes,
        key=lambda item: (
            Decimal(item["ingresos_confirmados"]),
            item["contratos_confirmados"],
            item["cotizaciones"],
        ),
        reverse=True,
    )

    total_ingresos = sum(
        (Decimal(item["ingresos_confirmados"]) for item in paquetes),
        ZERO,
    )
    total_costos = sum((Decimal(item["costos_directos"]) for item in paquetes), ZERO)
    total_utilidad = total_ingresos - total_costos

    return {
        "tipo": "paquetes",
        "periodo": _periodo_fechas(desde, hasta),
        "resumen": {
            "paquetes_con_actividad": len(paquetes),
            "cotizaciones": sum(item["cotizaciones"] for item in paquetes),
            "contratos_confirmados": sum(
                item["contratos_confirmados"] for item in paquetes
            ),
            "ingresos_confirmados": _money(total_ingresos),
            "costos_directos": _money(total_costos),
            "utilidad_bruta": _money(total_utilidad),
            "margen_bruto": _percent(_safe_percentage(total_utilidad, total_ingresos)),
        },
        "paquetes": paquetes,
    }
