"""Consultas reutilizables de la app negocio."""

from django.db.models import Count, F, Value
from django.db.models.functions import Replace

from .models import Cliente, ConfiguracionNegocio
from .validators import normalizar_telefono_busqueda


def _telefono_normalizado_expression():
    expression = F("telefono")
    for character in (" ", "-", "(", ")", "+"):
        expression = Replace(expression, Value(character), Value(""))
    return expression


def clientes_con_resumen():
    return Cliente.objects.annotate(
        cotizaciones_count=Count("cotizaciones", distinct=True),
        contratos_count=Count("contratos", distinct=True),
    )


def buscar_cliente_por_telefono(telefono, *, exclude_id=None):
    telefono_normalizado = normalizar_telefono_busqueda(telefono)
    if not telefono_normalizado:
        return None

    queryset = Cliente.objects.annotate(
        telefono_normalizado=_telefono_normalizado_expression(),
    ).filter(telefono_normalizado=telefono_normalizado)
    if exclude_id:
        queryset = queryset.exclude(pk=exclude_id)
    return queryset.first()


def obtener_configuracion_activa():
    return ConfiguracionNegocio.objects.filter(activo=True).first()
