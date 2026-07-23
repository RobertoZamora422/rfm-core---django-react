from django.contrib import admin

from .models import (
    Contrato,
    CostoDirecto,
    GastoAdicional,
    GastoRecurrente,
    GastoRecurrenteAjuste,
    GastoRecurrenteVersion,
)


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


@admin.register(GastoAdicional)
class GastoAdicionalAdmin(admin.ModelAdmin):
    list_display = ("concepto", "valor", "fecha", "eliminado", "origen_legacy")
    list_filter = ("fecha", "eliminado", "origen_legacy")
    search_fields = ("concepto", "observaciones")
    readonly_fields = ("creado_en", "actualizado_en", "eliminado_en")


class GastoRecurrenteVersionInline(admin.TabularInline):
    model = GastoRecurrenteVersion
    extra = 0
    readonly_fields = ("creado_en", "actualizado_en")


class GastoRecurrenteAjusteInline(admin.TabularInline):
    model = GastoRecurrenteAjuste
    extra = 0
    readonly_fields = ("creado_en", "actualizado_en", "eliminado_en")


@admin.register(GastoRecurrente)
class GastoRecurrenteAdmin(admin.ModelAdmin):
    list_display = ("concepto", "inicio_periodo", "fin_periodo", "activo")
    list_filter = ("activo", "inicio_periodo", "fin_periodo")
    search_fields = ("concepto", "observaciones")
    readonly_fields = ("creado_en", "actualizado_en")
    inlines = (GastoRecurrenteVersionInline, GastoRecurrenteAjusteInline)
