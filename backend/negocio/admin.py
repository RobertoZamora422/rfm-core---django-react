from django.contrib import admin

from .models import Cliente, ConfiguracionNegocio, NombrePersona, Paquete, TipoEvento


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("nombre", "telefono", "origen", "correo", "es_demo", "creado_en")
    list_filter = ("origen", "es_demo", "creado_en")
    search_fields = ("nombre", "telefono", "telefono_normalizado", "correo")
    readonly_fields = ("telefono_normalizado", "creado_en", "actualizado_en")


@admin.register(NombrePersona)
class NombrePersonaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "cliente", "origen", "creado_en")
    list_filter = ("origen",)
    search_fields = ("nombre", "cliente__nombre", "cliente__telefono")
    readonly_fields = ("nombre_normalizado", "creado_en", "actualizado_en")


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
