from django.contrib import admin

from .models import Cliente, ConfiguracionNegocio, Paquete, TipoEvento


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("nombre", "telefono", "correo", "es_demo", "creado_en")
    list_filter = ("es_demo", "creado_en")
    search_fields = ("nombre", "telefono", "correo")
    readonly_fields = ("creado_en", "actualizado_en")


@admin.register(TipoEvento)
class TipoEventoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "activo", "creado_en")
    list_filter = ("activo",)
    search_fields = ("nombre", "descripcion")
    readonly_fields = ("creado_en", "actualizado_en")


@admin.register(Paquete)
class PaqueteAdmin(admin.ModelAdmin):
    list_display = (
        "nombre",
        "tipo_servicio",
        "precio_por_persona",
        "activo",
        "creado_en",
    )
    list_filter = ("tipo_servicio", "activo")
    search_fields = ("nombre", "descripcion")
    readonly_fields = ("creado_en", "actualizado_en")


@admin.register(ConfiguracionNegocio)
class ConfiguracionNegocioAdmin(admin.ModelAdmin):
    list_display = (
        "nombre_negocio",
        "tarifa_base_alquiler",
        "whatsapp_negocio",
        "activo",
    )
    list_filter = ("activo",)
    search_fields = ("nombre_negocio",)
    readonly_fields = ("creado_en", "actualizado_en")
