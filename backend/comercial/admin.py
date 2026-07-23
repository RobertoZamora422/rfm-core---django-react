from django.contrib import admin

from .models import Cotizacion


@admin.register(Cotizacion)
class CotizacionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "persona",
        "tipo_evento",
        "fecha_tentativa",
        "numero_invitados",
        "tipo_servicio",
        "oferta_requiere_revision",
        "estado",
        "total_estimado",
    )
    list_filter = (
        "estado",
        "tipo_servicio",
        "oferta_requiere_revision",
        "fecha_tentativa",
    )
    search_fields = ("persona__nombre", "persona__telefono", "observaciones")
    autocomplete_fields = ("persona", "tipo_evento", "paquete")
    readonly_fields = ("creado_en", "actualizado_en")
