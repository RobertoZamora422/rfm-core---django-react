"""Consultas reutilizables de la app negocio."""

from .models import ConfiguracionNegocio


def obtener_configuracion_activa():
    return ConfiguracionNegocio.objects.filter(activo=True).first()
