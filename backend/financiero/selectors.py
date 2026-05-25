"""Consultas reutilizables de la app financiero."""

from decimal import Decimal

from django.db.models import DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce

from .models import Contrato


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
            Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )
    )
