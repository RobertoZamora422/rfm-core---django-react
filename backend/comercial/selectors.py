"""Consultas reutilizables de la app comercial."""

from .models import Cotizacion


def cotizaciones_con_relaciones():
    return Cotizacion.objects.select_related(
        "cliente",
        "tipo_evento",
        "paquete",
    )


def obtener_cotizacion_para_accion(cotizacion_id):
    return cotizaciones_con_relaciones().get(pk=cotizacion_id)
