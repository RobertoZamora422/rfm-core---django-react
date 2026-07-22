from datetime import date
from decimal import Decimal

from rest_framework import serializers

from comercial.models import Cotizacion
from negocio.validators import validate_non_negative, validate_positive_integer

from .models import Contrato, CostoDirecto, GastoFijoMensual


class ContratoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    cliente_telefono = serializers.CharField(source="cliente.telefono", read_only=True)
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
            "cliente_telefono",
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
            "estado_contrato",
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
        cotizacion = attrs.get("cotizacion")
        tipo_evento = attrs.get(
            "tipo_evento",
            getattr(self.instance, "tipo_evento", None),
        )
        paquete = attrs.get("paquete", getattr(self.instance, "paquete", None))
        errors = {}

        if (
            valor_final is not None
            and monto_abonado is not None
            and monto_abonado > valor_final
        ):
            errors["monto_abonado"] = "El monto abonado no puede superar el valor final."

        if tipo_evento and not tipo_evento.activo:
            current_tipo_evento_id = getattr(self.instance, "tipo_evento_id", None)
            if self.instance is None or tipo_evento.id != current_tipo_evento_id:
                errors["tipo_evento"] = "El tipo de evento debe estar activo."

        if paquete and not paquete.activo:
            current_paquete_id = getattr(self.instance, "paquete_id", None)
            if self.instance is None or paquete.id != current_paquete_id:
                errors["paquete"] = "El paquete debe estar activo."

        if cotizacion and cotizacion.estado != Cotizacion.Estado.CONVERTIDA:
            errors["cotizacion"] = (
                "La cotizacion asociada debe convertirse desde la accion comercial correspondiente."
            )

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def validate_valor_final(self, value):
        validate_non_negative(value)
        return value

    def validate_monto_abonado(self, value):
        validate_non_negative(value)
        return value

    def validate_numero_invitados(self, value):
        validate_positive_integer(value)
        return value

    def validate_fecha_evento(self, value):
        if value is None:
            raise serializers.ValidationError("La fecha del evento es obligatoria.")
        return value


class CostoDirectoSerializer(serializers.ModelSerializer):
    contrato_label = serializers.SerializerMethodField()
    contrato_descripcion = serializers.SerializerMethodField()
    contrato_estado = serializers.CharField(
        source="contrato.estado_contrato",
        read_only=True,
    )
    cliente_nombre = serializers.CharField(
        source="contrato.cliente.nombre",
        read_only=True,
    )
    cliente_telefono = serializers.CharField(
        source="contrato.cliente.telefono",
        read_only=True,
    )
    tipo_evento_nombre = serializers.CharField(
        source="contrato.tipo_evento.nombre",
        read_only=True,
    )
    fecha_evento = serializers.DateField(source="contrato.fecha_evento", read_only=True)
    valor = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )

    class Meta:
        model = CostoDirecto
        fields = [
            "id",
            "contrato",
            "contrato_label",
            "contrato_descripcion",
            "contrato_estado",
            "cliente_nombre",
            "cliente_telefono",
            "tipo_evento_nombre",
            "fecha_evento",
            "concepto",
            "valor",
            "fecha",
            "observaciones",
            "eliminado",
            "eliminado_en",
            "es_demo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "eliminado",
            "eliminado_en",
            "es_demo",
            "creado_en",
            "actualizado_en",
        ]

    def get_contrato_label(self, obj):
        return f"Contrato #{obj.contrato_id}"

    def get_contrato_descripcion(self, obj):
        contrato = obj.contrato
        return (
            f"Contrato #{contrato.id} - {contrato.cliente.nombre} - "
            f"{contrato.tipo_evento.nombre} ({contrato.fecha_evento:%d/%m/%Y})"
        )

    def validate_contrato(self, value):
        if value is None:
            raise serializers.ValidationError("El contrato es obligatorio.")
        if value.estado_contrato != Contrato.EstadoContrato.CONFIRMADO:
            current_contract_id = getattr(self.instance, "contrato_id", None)
            if self.instance is not None and value.id == current_contract_id:
                return value
            raise serializers.ValidationError(
                "Solo se pueden registrar costos directos en contratos confirmados."
            )
        return value

    def validate_concepto(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("El concepto es obligatorio.")
        return value

    def validate_fecha(self, value):
        if value is None:
            raise serializers.ValidationError("La fecha es obligatoria.")
        return value


class GastoFijoMensualSerializer(serializers.ModelSerializer):
    valor = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )
    mes = serializers.IntegerField(min_value=1, max_value=12)

    class Meta:
        model = GastoFijoMensual
        fields = [
            "id",
            "concepto",
            "valor",
            "mes",
            "anio",
            "observaciones",
            "eliminado",
            "eliminado_en",
            "es_demo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "eliminado",
            "eliminado_en",
            "es_demo",
            "creado_en",
            "actualizado_en",
        ]

    def validate_concepto(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("El concepto es obligatorio.")
        return value

    def validate_anio(self, value):
        current_year = date.today().year
        if value < 2000 or value > current_year + 10:
            raise serializers.ValidationError("El anio no es valido para el registro del sistema.")
        return value
