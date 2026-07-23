"""Servicios de negocio de la app reportes."""

from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count, Q, Sum

from comercial.models import Cotizacion
from financiero.models import Contrato, CostoDirecto
from financiero.services import dashboard_financiero


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
        "paquete_nombre": cotizacion.paquete.nombre if cotizacion.paquete else "",
        "fecha_tentativa": cotizacion.fecha_tentativa.isoformat(),
        "numero_invitados": cotizacion.numero_invitados,
        "tipo_servicio": cotizacion.tipo_servicio,
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
    }


def _contract_row(contrato):
    return {
        "id": contrato.id,
        "contrato_id": contrato.id,
        "persona_nombre": contrato.persona.nombre,
        "persona_telefono": contrato.persona.telefono,
        "tipo_evento_nombre": contrato.tipo_evento.nombre,
        "paquete_nombre": contrato.paquete.nombre if contrato.paquete else "",
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


def _empty_package_row(key, nombre, tipo_servicio):
    return {
        "key": str(key),
        "paquete_id": key if isinstance(key, int) else None,
        "paquete_nombre": nombre,
        "tipo_servicio": tipo_servicio,
        "cotizaciones": 0,
        "cotizaciones_convertidas": 0,
        "contratos_confirmados": 0,
        "ingresos_confirmados": ZERO,
        "costos_directos": ZERO,
        "utilidad_bruta": ZERO,
    }


def _package_key(paquete_id):
    return paquete_id if paquete_id is not None else "sin_paquete"


def _package_name(paquete_id, paquete_nombre):
    if paquete_id is None:
        return "Sin paquete"
    return paquete_nombre or f"Paquete #{paquete_id}"


def reporte_paquetes(desde, hasta):
    rows = {}

    cotizaciones = (
        Cotizacion.objects.filter(
            fecha_tentativa__gte=desde,
            fecha_tentativa__lte=hasta,
        )
        .values("paquete_id", "paquete__nombre", "paquete__tipo_servicio")
        .annotate(
            cotizaciones=Count("id"),
            convertidas=Count("id", filter=Q(estado=Cotizacion.Estado.CONVERTIDA)),
        )
    )
    for item in cotizaciones:
        key = _package_key(item["paquete_id"])
        rows.setdefault(
            key,
            _empty_package_row(
                key,
                _package_name(item["paquete_id"], item["paquete__nombre"]),
                item["paquete__tipo_servicio"] or "",
            ),
        )
        rows[key]["cotizaciones"] += item["cotizaciones"]
        rows[key]["cotizaciones_convertidas"] += item["convertidas"]

    contratos = (
        Contrato.objects.filter(
            estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
            fecha_evento__gte=desde,
            fecha_evento__lte=hasta,
        )
        .values("paquete_id", "paquete__nombre", "paquete__tipo_servicio")
        .annotate(contratos=Count("id"), ingresos=Sum("valor_final"))
    )
    for item in contratos:
        key = _package_key(item["paquete_id"])
        rows.setdefault(
            key,
            _empty_package_row(
                key,
                _package_name(item["paquete_id"], item["paquete__nombre"]),
                item["paquete__tipo_servicio"] or "",
            ),
        )
        rows[key]["contratos_confirmados"] += item["contratos"]
        rows[key]["ingresos_confirmados"] += item["ingresos"] or ZERO

    costos = (
        CostoDirecto.objects.filter(
            contrato__estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
            eliminado=False,
            contrato__fecha_evento__gte=desde,
            contrato__fecha_evento__lte=hasta,
        )
        .values(
            "contrato__paquete_id",
            "contrato__paquete__nombre",
            "contrato__paquete__tipo_servicio",
        )
        .annotate(costos=Sum("valor"))
    )
    for item in costos:
        paquete_id = item["contrato__paquete_id"]
        key = _package_key(paquete_id)
        rows.setdefault(
            key,
            _empty_package_row(
                key,
                _package_name(paquete_id, item["contrato__paquete__nombre"]),
                item["contrato__paquete__tipo_servicio"] or "",
            ),
        )
        rows[key]["costos_directos"] += item["costos"] or ZERO

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
