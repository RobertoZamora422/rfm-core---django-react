from django.contrib import admin

from .models import Contrato, CostoDirecto, GastoFijoMensual


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "persona",
        "fecha_evento",
        "valor_final",
        "monto_abonado",
        "estado_contrato",
        "estado_pago",
    )
    list_filter = ("estado_contrato", "estado_pago", "fecha_evento")
    search_fields = ("persona__nombre", "persona__telefono", "observaciones")
    autocomplete_fields = ("cotizacion", "persona", "tipo_evento", "paquete")
    readonly_fields = ("creado_en", "actualizado_en", "saldo_pendiente")


@admin.register(CostoDirecto)
class CostoDirectoAdmin(admin.ModelAdmin):
    list_display = ("concepto", "contrato", "valor", "fecha", "eliminado")
    list_filter = ("fecha", "eliminado")
    search_fields = ("concepto", "contrato__persona__nombre", "observaciones")
    autocomplete_fields = ("contrato",)
    readonly_fields = ("creado_en", "actualizado_en", "eliminado_en")


@admin.register(GastoFijoMensual)
class GastoFijoMensualAdmin(admin.ModelAdmin):
    list_display = ("concepto", "valor", "mes", "anio", "eliminado")
    list_filter = ("anio", "mes", "eliminado")
    search_fields = ("concepto", "observaciones")
    readonly_fields = ("creado_en", "actualizado_en", "eliminado_en")
