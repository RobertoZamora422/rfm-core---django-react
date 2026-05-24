from django.contrib import admin

from .models import Contrato, CostoDirecto, GastoFijoMensual


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "cliente",
        "fecha_evento",
        "valor_final",
        "monto_abonado",
        "estado_contrato",
        "estado_pago",
        "es_demo",
    )
    list_filter = ("estado_contrato", "estado_pago", "es_demo", "fecha_evento")
    search_fields = ("cliente__nombre", "cliente__telefono", "observaciones")
    autocomplete_fields = ("cotizacion", "cliente", "tipo_evento", "paquete")
    readonly_fields = ("creado_en", "actualizado_en", "saldo_pendiente")


@admin.register(CostoDirecto)
class CostoDirectoAdmin(admin.ModelAdmin):
    list_display = ("concepto", "contrato", "valor", "fecha", "eliminado", "es_demo")
    list_filter = ("fecha", "eliminado", "es_demo")
    search_fields = ("concepto", "contrato__cliente__nombre", "observaciones")
    autocomplete_fields = ("contrato",)
    readonly_fields = ("creado_en", "actualizado_en", "eliminado_en")


@admin.register(GastoFijoMensual)
class GastoFijoMensualAdmin(admin.ModelAdmin):
    list_display = ("concepto", "valor", "mes", "anio", "eliminado", "es_demo")
    list_filter = ("anio", "mes", "eliminado", "es_demo")
    search_fields = ("concepto", "observaciones")
    readonly_fields = ("creado_en", "actualizado_en", "eliminado_en")
