from rest_framework import serializers

from .models import Contrato, CostoDirecto, GastoFijoMensual


class ContratoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    tipo_evento_nombre = serializers.CharField(
        source="tipo_evento.nombre",
        read_only=True,
    )
    paquete_nombre = serializers.CharField(source="paquete.nombre", read_only=True)
    saldo_pendiente = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    total_costos_directos = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    utilidad_bruta = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    margen_bruto = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = Contrato
        fields = [
            "id",
            "cotizacion",
            "cliente",
            "cliente_nombre",
            "tipo_evento",
            "tipo_evento_nombre",
            "paquete",
            "paquete_nombre",
            "fecha_evento",
            "numero_invitados",
            "valor_final",
            "monto_abonado",
            "saldo_pendiente",
            "estado_contrato",
            "estado_pago",
            "total_costos_directos",
            "utilidad_bruta",
            "margen_bruto",
            "observaciones",
            "es_demo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "estado_pago",
            "saldo_pendiente",
            "total_costos_directos",
            "utilidad_bruta",
            "margen_bruto",
            "es_demo",
            "creado_en",
            "actualizado_en",
        ]

    def validate(self, attrs):
        valor_final = attrs.get("valor_final", getattr(self.instance, "valor_final", None))
        monto_abonado = attrs.get(
            "monto_abonado",
            getattr(self.instance, "monto_abonado", 0),
        )

        if (
            valor_final is not None
            and monto_abonado is not None
            and monto_abonado > valor_final
        ):
            raise serializers.ValidationError(
                {"monto_abonado": "El monto abonado no puede superar el valor final."}
            )

        return attrs


class CostoDirectoSerializer(serializers.ModelSerializer):
    contrato_cliente = serializers.CharField(
        source="contrato.cliente.nombre",
        read_only=True,
    )

    class Meta:
        model = CostoDirecto
        fields = [
            "id",
            "contrato",
            "contrato_cliente",
            "concepto",
            "valor",
            "fecha",
            "observaciones",
            "es_demo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "es_demo", "creado_en", "actualizado_en"]


class GastoFijoMensualSerializer(serializers.ModelSerializer):
    class Meta:
        model = GastoFijoMensual
        fields = [
            "id",
            "concepto",
            "valor",
            "mes",
            "anio",
            "observaciones",
            "es_demo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "es_demo", "creado_en", "actualizado_en"]
