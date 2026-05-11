from django.contrib import admin

from .models import Cotizacion


@admin.register(Cotizacion)
class CotizacionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "cliente",
        "tipo_evento",
        "fecha_tentativa",
        "numero_invitados",
        "estado",
        "total_estimado",
        "es_demo",
    )
    list_filter = ("estado", "tipo_servicio", "es_demo", "fecha_tentativa")
    search_fields = ("cliente__nombre", "cliente__telefono", "observaciones")
    autocomplete_fields = ("cliente", "tipo_evento", "paquete")
    readonly_fields = ("creado_en", "actualizado_en")
