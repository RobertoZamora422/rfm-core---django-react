from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from comercial.models import Cotizacion
from negocio.models import Persona
from negocio.persona_services import PersonaDuplicadaError, crear_persona
from negocio.serializers import PersonaNuevaSerializer
from negocio.validators import validate_non_negative, validate_positive_integer

from .models import (
    Contrato,
    CostoDirecto,
    GastoAdicional,
    GastoRecurrente,
    GastoRecurrenteAjuste,
    GastoRecurrenteVersion,
)
from .services import crear_gasto_recurrente


class ContratoSerializer(serializers.ModelSerializer):
    persona = serializers.PrimaryKeyRelatedField(
        queryset=Persona.objects.all(),
        required=False,
    )
    persona_nueva = PersonaNuevaSerializer(required=False, write_only=True)
    persona_nombre = serializers.CharField(source="persona.nombre", read_only=True)
    persona_telefono = serializers.CharField(source="persona.telefono", read_only=True)
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
            "persona",
            "persona_nombre",
            "persona_telefono",
            "persona_nueva",
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
        persona = attrs.get("persona")
        persona_nueva = attrs.get("persona_nueva")
        tipo_evento = attrs.get(
            "tipo_evento",
            getattr(self.instance, "tipo_evento", None),
        )
        paquete = attrs.get("paquete", getattr(self.instance, "paquete", None))
        errors = {}

        if self.instance is None and bool(persona) == bool(persona_nueva):
            errors["persona"] = "Selecciona una persona existente o registra una nueva."
        if self.instance is not None and persona_nueva:
            errors["persona_nueva"] = "La creación rápida solo está disponible en un nuevo contrato."

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

    @transaction.atomic
    def create(self, validated_data):
        persona_nueva = validated_data.pop("persona_nueva", None)
        if persona_nueva:
            try:
                validated_data["persona"] = crear_persona(
                    **persona_nueva,
                    origen=Persona.Origen.CONTRATO_DIRECTO,
                )
            except PersonaDuplicadaError as exc:
                raise serializers.ValidationError(
                    {
                        "persona_nueva": {
                            "telefono": exc.message_dict["telefono"],
                            "persona_existente_id": exc.persona.id,
                        }
                    }
                ) from exc
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.message_dict) from exc
        return super().create(validated_data)

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
    persona_nombre = serializers.CharField(
        source="contrato.persona.nombre",
        read_only=True,
    )
    persona_telefono = serializers.CharField(
        source="contrato.persona.telefono",
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
            "persona_nombre",
            "persona_telefono",
            "tipo_evento_nombre",
            "fecha_evento",
            "concepto",
            "valor",
            "fecha",
            "observaciones",
            "eliminado",
            "eliminado_en",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "eliminado",
            "eliminado_en",
            "creado_en",
            "actualizado_en",
        ]

    def get_contrato_label(self, obj):
        return f"Contrato #{obj.contrato_id}"

    def get_contrato_descripcion(self, obj):
        contrato = obj.contrato
        return (
            f"Contrato #{contrato.id} - {contrato.persona.nombre} - "
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


class PeriodMonthField(serializers.DateField):
    default_error_messages = {
        "invalid": "Ingresa un periodo válido con el formato AAAA-MM.",
    }

    def to_internal_value(self, data):
        if isinstance(data, str) and len(data) == 7:
            data = f"{data}-01"
        value = super().to_internal_value(data)
        if value.day != 1:
            self.fail("invalid")
        return value

    def to_representation(self, value):
        if not value:
            return None
        return value.strftime("%Y-%m")


class GastoAdicionalSerializer(serializers.ModelSerializer):
    valor = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )

    class Meta:
        model = GastoAdicional
        fields = [
            "id",
            "concepto",
            "valor",
            "fecha",
            "observaciones",
            "eliminado",
            "eliminado_en",
            "origen_legacy",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "eliminado",
            "eliminado_en",
            "origen_legacy",
            "creado_en",
            "actualizado_en",
        ]

    def validate_concepto(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("El concepto es obligatorio.")
        return value

    def validate_fecha(self, value):
        if value.year < 2000 or value.year > date.today().year + 10:
            raise serializers.ValidationError(
                "La fecha no es válida para el registro del sistema."
            )
        return value


class GastoRecurrenteVersionSerializer(serializers.ModelSerializer):
    vigente_desde = PeriodMonthField()
    vigente_hasta = PeriodMonthField(allow_null=True)

    class Meta:
        model = GastoRecurrenteVersion
        fields = [
            "id",
            "valor_mensual",
            "vigente_desde",
            "vigente_hasta",
            "creado_en",
        ]


class GastoRecurrenteAjusteSerializer(serializers.ModelSerializer):
    periodo = PeriodMonthField()

    class Meta:
        model = GastoRecurrenteAjuste
        fields = [
            "id",
            "periodo",
            "valor",
            "observaciones",
            "creado_en",
            "actualizado_en",
        ]


class GastoRecurrenteSerializer(serializers.ModelSerializer):
    aplicar_desde = PeriodMonthField(source="inicio_periodo")
    aplicar_hasta = PeriodMonthField(
        source="fin_periodo",
        allow_null=True,
        required=False,
    )
    valor_mensual = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
        write_only=True,
        required=False,
    )
    valor_vigente = serializers.SerializerMethodField()
    tiene_ajuste_periodo = serializers.SerializerMethodField()

    class Meta:
        model = GastoRecurrente
        fields = [
            "id",
            "concepto",
            "valor_mensual",
            "valor_vigente",
            "aplicar_desde",
            "aplicar_hasta",
            "activo",
            "tiene_ajuste_periodo",
            "observaciones",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "activo",
            "valor_vigente",
            "tiene_ajuste_periodo",
            "creado_en",
            "actualizado_en",
        ]

    def _period_value(self, instance):
        periodo = self.context.get("periodo")
        if not periodo:
            today = date.today()
            periodo = today.replace(day=1)
        ajuste = next(
            (
                item
                for item in instance.ajustes.all()
                if not item.eliminado and item.periodo == periodo
            ),
            None,
        )
        version = next(
            (
                item
                for item in reversed(list(instance.versiones.all()))
                if item.vigente_desde <= periodo
                and (item.vigente_hasta is None or item.vigente_hasta >= periodo)
            ),
            None,
        )
        return ajuste, version

    def get_valor_vigente(self, instance):
        ajuste, version = self._period_value(instance)
        value = ajuste.valor if ajuste else version.valor_mensual if version else None
        return str(value.quantize(Decimal("0.01"))) if value is not None else None

    def get_tiene_ajuste_periodo(self, instance):
        ajuste, _version = self._period_value(instance)
        return bool(ajuste)

    def validate_concepto(self, value):
        value = " ".join((value or "").strip().split())
        if not value:
            raise serializers.ValidationError("El concepto es obligatorio.")
        return value

    def validate(self, attrs):
        if self.instance:
            protected = {"inicio_periodo", "fin_periodo", "valor_mensual"}
            if protected.intersection(attrs):
                raise serializers.ValidationError(
                    "Usa las acciones de vigencia o ajuste para modificar valores y periodos."
                )
            return attrs

        if "valor_mensual" not in attrs:
            raise serializers.ValidationError(
                {"valor_mensual": "El valor mensual es obligatorio."}
            )
        inicio = attrs.get("inicio_periodo")
        fin = attrs.get("fin_periodo")
        if fin and inicio and fin < inicio:
            raise serializers.ValidationError(
                {"aplicar_hasta": "El periodo final no puede ser anterior al inicial."}
            )
        return attrs

    def create(self, validated_data):
        return crear_gasto_recurrente(
            concepto=validated_data["concepto"],
            valor_mensual=validated_data["valor_mensual"],
            inicio_periodo=validated_data["inicio_periodo"],
            fin_periodo=validated_data.get("fin_periodo"),
            observaciones=validated_data.get("observaciones", ""),
        )


class AjusteValorDesdeSerializer(serializers.Serializer):
    periodo = PeriodMonthField()
    valor_mensual = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )


class AjustePeriodoSerializer(serializers.Serializer):
    periodo = PeriodMonthField()
    valor = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )
    observaciones = serializers.CharField(
        allow_blank=True,
        required=False,
        max_length=1000,
    )


class DesactivarGastoRecurrenteSerializer(serializers.Serializer):
    periodo_desde = PeriodMonthField()


class ReactivarGastoRecurrenteSerializer(serializers.Serializer):
    periodo_desde = PeriodMonthField()
    periodo_hasta = PeriodMonthField(allow_null=True, required=False)
    valor_mensual = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )
