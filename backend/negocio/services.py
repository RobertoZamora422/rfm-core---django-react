"""Servicios de negocio de la app negocio."""

from datetime import timedelta

from django.db.models import Count, F, Q
from django.utils import timezone

from comercial.models import Cotizacion
from financiero.models import Contrato


def _money(value):
    return f"{value:.2f}"


def _month_bounds(fecha):
    inicio = fecha.replace(day=1)
    if inicio.month == 12:
        siguiente = inicio.replace(year=inicio.year + 1, month=1)
    else:
        siguiente = inicio.replace(month=inicio.month + 1)
    fin = siguiente - timedelta(days=1)
    return inicio, fin


def _month_name(fecha):
    return [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
    ][fecha.month - 1]


def _event_summary(contrato):
    return {
        "id": contrato.id,
        "contrato_id": contrato.id,
        "cliente_nombre": contrato.cliente.nombre,
        "cliente_telefono": contrato.cliente.telefono,
        "tipo_evento_nombre": contrato.tipo_evento.nombre,
        "paquete_nombre": contrato.paquete.nombre if contrato.paquete_id else "",
        "fecha_evento": contrato.fecha_evento.isoformat(),
        "estado_pago": contrato.estado_pago,
        "saldo_pendiente": _money(contrato.saldo_pendiente),
        "valor_final": _money(contrato.valor_final),
    }


def _pending_item(tipo, titulo, descripcion, cantidad, prioridad, enlace):
    return {
        "tipo": tipo,
        "titulo": titulo,
        "descripcion": descripcion,
        "cantidad": cantidad,
        "prioridad": prioridad,
        "enlace": enlace,
    }


def inicio_resumen(fecha_referencia=None):
    """Devuelve el resumen listo para presentar en el inicio administrativo."""

    fecha = fecha_referencia or timezone.localdate()
    inicio_mes, fin_mes = _month_bounds(fecha)
    mes_nombre = _month_name(fecha)

    cotizaciones_nuevas = Cotizacion.objects.filter(
        estado=Cotizacion.Estado.NUEVA,
    ).count()
    cotizaciones_mes = Cotizacion.objects.filter(
        creado_en__date__gte=inicio_mes,
        creado_en__date__lte=fin_mes,
    ).count()
    eventos_mes = Contrato.objects.filter(
        estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        fecha_evento__gte=inicio_mes,
        fecha_evento__lte=fin_mes,
    ).count()

    contratos_confirmados_futuros = Contrato.objects.filter(
        estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        fecha_evento__gte=fecha,
    )
    eventos_proximos = list(
        contratos_confirmados_futuros.select_related(
            "cliente",
            "tipo_evento",
            "paquete",
        ).order_by("fecha_evento", "id")[:5]
    )

    pendientes = []
    if cotizaciones_nuevas:
        pendientes.append(
            _pending_item(
                "cotizaciones_nuevas",
                "Cotizaciones nuevas sin gestionar",
                "Requieren primer contacto o seguimiento comercial.",
                cotizaciones_nuevas,
                "alta",
                "/cotizaciones?estado=nueva",
            )
        )

    eventos_sin_costos = (
        contratos_confirmados_futuros.annotate(
            costos_directos_activos=Count(
                "costos_directos",
                filter=Q(costos_directos__eliminado=False),
            )
        )
        .filter(costos_directos_activos=0)
        .count()
    )
    if eventos_sin_costos:
        pendientes.append(
            _pending_item(
                "eventos_sin_costos",
                "Eventos proximos sin costos directos registrados",
                "Falta registrar costos asociados a contratos confirmados futuros.",
                eventos_sin_costos,
                "media",
                "/costos-directos",
            )
        )

    eventos_con_saldo = contratos_confirmados_futuros.filter(
        monto_abonado__lt=F("valor_final")
    ).count()
    if eventos_con_saldo:
        pendientes.append(
            _pending_item(
                "eventos_con_saldo",
                "Eventos proximos con saldo pendiente",
                "Contratos confirmados futuros aun tienen valores por cobrar.",
                eventos_con_saldo,
                "alta",
                "/contratos",
            )
        )

    cotizaciones_sin_contrato = Cotizacion.objects.filter(
        estado__in=[Cotizacion.Estado.CONTACTADA, Cotizacion.Estado.CONFIRMADA],
        contrato__isnull=True,
    ).count()
    if cotizaciones_sin_contrato:
        pendientes.append(
            _pending_item(
                "cotizaciones_sin_contrato",
                "Cotizaciones activas sin contrato",
                "Hay oportunidades avanzadas que aun no tienen contrato asociado.",
                cotizaciones_sin_contrato,
                "media",
                "/cotizaciones",
            )
        )

    return {
        "fecha_referencia": fecha.isoformat(),
        "periodo": {
            "mes": fecha.month,
            "anio": fecha.year,
            "mes_nombre": mes_nombre,
        },
        "kpis": [
            {
                "key": "cotizaciones_nuevas",
                "label": "Cotizaciones nuevas",
                "value": cotizaciones_nuevas,
                "detail": "Pendientes de gestion",
            },
            {
                "key": "cotizaciones_mes",
                "label": "Cotizaciones del mes",
                "value": cotizaciones_mes,
                "detail": "Registradas en el mes actual",
            },
            {
                "key": "eventos_mes",
                "label": "Eventos del mes",
                "value": eventos_mes,
                "detail": "Confirmados en el mes actual",
            },
            {
                "key": "eventos_proximos",
                "label": "Eventos proximos",
                "value": contratos_confirmados_futuros.count(),
                "detail": "Contratos confirmados futuros",
            },
        ],
        "eventos_proximos": [_event_summary(contrato) for contrato in eventos_proximos],
        "pendientes_importantes": pendientes,
    }
