"""Consultas reutilizables de la app negocio."""

from django.core.exceptions import ValidationError
from django.db.models import Count, Prefetch, Q

from .models import Cliente, ConfiguracionNegocio
from .validators import (
    extraer_digitos_telefono,
    normalizar_telefono,
    normalizar_telefono_parcial,
)


def clientes_con_resumen():
    return Cliente.objects.annotate(
        cotizaciones_count=Count("cotizaciones", distinct=True),
        contratos_count=Count("contratos", distinct=True),
    )


def buscar_cliente_por_telefono(telefono, *, exclude_id=None):
    try:
        telefono_normalizado = normalizar_telefono(telefono)
    except ValidationError:
        return None

    queryset = Cliente.objects.filter(telefono_normalizado=telefono_normalizado)
    if exclude_id:
        queryset = queryset.exclude(pk=exclude_id)
    return queryset.first()


def filtrar_personas(queryset, buscar):
    buscar = (buscar or "").strip()
    if not buscar:
        return queryset
    digits = extraer_digitos_telefono(buscar)
    criteria = Q(nombre__icontains=buscar) | Q(correo__icontains=buscar)
    if digits:
        criteria |= Q(telefono__icontains=buscar)
        criteria |= Q(telefono_normalizado__icontains=normalizar_telefono_parcial(buscar))
    return queryset.filter(criteria)


def personas_con_detalle():
    from comercial.models import Cotizacion
    from financiero.models import Contrato

    return (
        clientes_con_resumen()
        .prefetch_related(
            "nombres_utilizados",
            Prefetch(
                "cotizaciones",
                queryset=Cotizacion.objects.select_related("tipo_evento", "paquete").order_by(
                    "-creado_en"
                ),
            ),
            Prefetch(
                "contratos",
                queryset=Contrato.objects.select_related("tipo_evento", "paquete").order_by(
                    "-creado_en"
                ),
            ),
        )
    )


def persona_con_detalle(persona_id):
    return personas_con_detalle().get(pk=persona_id)


def obtener_configuracion_activa():
    return ConfiguracionNegocio.objects.filter(activo=True).first()
