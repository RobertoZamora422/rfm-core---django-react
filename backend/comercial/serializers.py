from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from negocio.models import Cliente, Paquete, TipoEvento
from negocio.validators import validate_phone

from .models import Cotizacion


class CotizacionSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    cliente_telefono = serializers.CharField(source="cliente.telefono", read_only=True)
    tipo_evento_nombre = serializers.CharField(
        source="tipo_evento.nombre",
        read_only=True,
    )
    paquete_nombre = serializers.CharField(source="paquete.nombre", read_only=True)
    esta_convertida = serializers.BooleanField(read_only=True)
    contrato_id = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = [
            "id",
            "cliente",
            "cliente_nombre",
            "cliente_telefono",
            "tipo_evento",
            "tipo_evento_nombre",
            "paquete",
            "paquete_nombre",
            "fecha_tentativa",
            "numero_invitados",
            "tipo_servicio",
            "estado",
            "total_estimado",
            "observaciones",
            "es_demo",
            "esta_convertida",
            "contrato_id",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "es_demo",
            "esta_convertida",
            "contrato_id",
            "creado_en",
            "actualizado_en",
        ]

    def get_contrato_id(self, obj):
        try:
            return obj.contrato.id
        except ObjectDoesNotExist:
            return None

    def validate(self, attrs):
        paquete = attrs.get("paquete", getattr(self.instance, "paquete", None))
        tipo_servicio = attrs.get(
            "tipo_servicio",
            getattr(self.instance, "tipo_servicio", None),
        )
        estado = attrs.get("estado")

        if paquete and tipo_servicio and paquete.tipo_servicio != tipo_servicio:
            raise serializers.ValidationError(
                {"paquete": "El paquete no corresponde al tipo de servicio indicado."}
            )

        if (
            tipo_servicio == Paquete.TipoServicio.SERVICIO_COMPLETO
            and paquete is None
        ):
            raise serializers.ValidationError(
                {"paquete": "El servicio completo debe tener un paquete asociado."}
            )

        if estado == Cotizacion.Estado.CONVERTIDA and (
            self.instance is None
            or self.instance.estado != Cotizacion.Estado.CONVERTIDA
        ):
            raise serializers.ValidationError(
                {
                    "estado": "La conversion a contrato debe realizarse desde la accion correspondiente."
                }
            )

        if (
            self.instance
            and self.instance.estado == Cotizacion.Estado.CONVERTIDA
            and estado
            and estado != Cotizacion.Estado.CONVERTIDA
        ):
            raise serializers.ValidationError(
                {"estado": "Una cotizacion convertida no permite cambios de estado."}
            )

        return attrs


class PreCotizacionSerializer(serializers.Serializer):
    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(),
        required=False,
        allow_null=True,
    )
    nombre_cliente = serializers.CharField(required=False, allow_blank=True)
    telefono_cliente = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[validate_phone],
    )
    correo_cliente = serializers.EmailField(required=False, allow_blank=True)
    observaciones_cliente = serializers.CharField(required=False, allow_blank=True)
    tipo_evento = serializers.PrimaryKeyRelatedField(
        queryset=TipoEvento.objects.filter(activo=True),
    )
    paquete = serializers.PrimaryKeyRelatedField(
        queryset=Paquete.objects.filter(activo=True),
        required=False,
        allow_null=True,
    )
    fecha_tentativa = serializers.DateField()
    numero_invitados = serializers.IntegerField(min_value=1)
    tipo_servicio = serializers.ChoiceField(choices=Paquete.TipoServicio.choices)
    observaciones = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        cliente = attrs.get("cliente")
        nombre_cliente = attrs.get("nombre_cliente", "").strip()
        telefono_cliente = attrs.get("telefono_cliente", "").strip()
        paquete = attrs.get("paquete")
        tipo_servicio = attrs.get("tipo_servicio")

        errors = {}
        if cliente is None:
            if not nombre_cliente:
                errors["nombre_cliente"] = "El nombre del cliente es obligatorio."
            if not telefono_cliente:
                errors["telefono_cliente"] = "El telefono del cliente es obligatorio."

        if paquete and paquete.tipo_servicio != tipo_servicio:
            errors["paquete"] = "El paquete no corresponde al tipo de servicio indicado."

        if (
            tipo_servicio == Paquete.TipoServicio.SERVICIO_COMPLETO
            and paquete is None
        ):
            errors["paquete"] = "El servicio completo debe tener un paquete asociado."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs


class CambiarEstadoCotizacionSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(
        choices=[
            Cotizacion.Estado.NUEVA,
            Cotizacion.Estado.CONTACTADA,
            Cotizacion.Estado.CONFIRMADA,
            Cotizacion.Estado.DESCARTADA,
        ],
    )


class ConvertirContratoSerializer(serializers.Serializer):
    fecha_evento = serializers.DateField(required=False)
    valor_final = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
        required=False,
    )
    monto_abonado = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
        required=False,
    )
    observaciones = serializers.CharField(required=False, allow_blank=True)
