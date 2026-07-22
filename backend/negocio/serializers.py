from rest_framework import serializers

from .models import Cliente, ConfiguracionNegocio, Paquete, TipoEvento
from .selectors import buscar_cliente_por_telefono


class ClienteSerializer(serializers.ModelSerializer):
    cotizaciones_count = serializers.SerializerMethodField()
    contratos_count = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = [
            "id",
            "nombre",
            "telefono",
            "correo",
            "observaciones",
            "cotizaciones_count",
            "contratos_count",
            "es_demo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "es_demo", "creado_en", "actualizado_en"]

    def validate_nombre(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("El nombre es obligatorio.")
        return value

    def get_cotizaciones_count(self, obj):
        if hasattr(obj, "cotizaciones_count"):
            return obj.cotizaciones_count
        return obj.cotizaciones.count()

    def get_contratos_count(self, obj):
        if hasattr(obj, "contratos_count"):
            return obj.contratos_count
        return obj.contratos.count()

    def validate_telefono(self, value):
        value = (value or "").strip()
        duplicate = buscar_cliente_por_telefono(
            value,
            exclude_id=getattr(self.instance, "id", None),
        )
        if duplicate:
            raise serializers.ValidationError(
                "Ya existe un cliente con este teléfono. Edite el registro existente para evitar duplicados."
            )
        return value


class TipoEventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEvento
        fields = [
            "id",
            "nombre",
            "descripcion",
            "activo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "creado_en", "actualizado_en"]

    def validate_nombre(self, value):
        value = (value or "").strip()
        queryset = TipoEvento.objects.filter(nombre__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Ya existe un tipo de evento con este nombre.")
        return value


class PublicTipoEventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEvento
        fields = ["id", "nombre", "descripcion"]
        read_only_fields = fields


class PaqueteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paquete
        fields = [
            "id",
            "nombre",
            "tipo_servicio",
            "precio_por_persona",
            "descripcion",
            "activo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "creado_en", "actualizado_en"]

    def validate(self, attrs):
        tipo_servicio = attrs.get(
            "tipo_servicio",
            getattr(self.instance, "tipo_servicio", None),
        )
        precio_por_persona = attrs.get(
            "precio_por_persona",
            getattr(self.instance, "precio_por_persona", None),
        )

        if (
            tipo_servicio == Paquete.TipoServicio.SERVICIO_COMPLETO
            and precio_por_persona is not None
            and precio_por_persona <= 0
        ):
            raise serializers.ValidationError(
                {
                    "precio_por_persona": "El servicio completo debe tener precio por persona mayor que cero."
                }
            )

        return attrs


class PublicPaqueteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paquete
        fields = [
            "id",
            "nombre",
            "tipo_servicio",
            "precio_por_persona",
            "descripcion",
        ]
        read_only_fields = fields


class ConfiguracionNegocioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionNegocio
        fields = [
            "id",
            "nombre_negocio",
            "tarifa_base_alquiler",
            "invitados_incluidos_alquiler",
            "costo_invitado_adicional",
            "whatsapp_negocio",
            "whatsapp_numero_url",
            "activo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "whatsapp_numero_url", "creado_en", "actualizado_en"]

    def validate(self, attrs):
        if "activo" in attrs and not attrs["activo"]:
            raise serializers.ValidationError(
                {
                    "activo": "La configuracion del negocio no puede desactivarse desde la operacion normal."
                }
            )

        queryset = ConfiguracionNegocio.objects.filter(activo=True)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                {"activo": "Ya existe una configuracion activa."}
            )

        return attrs

    def create(self, validated_data):
        validated_data["activo"] = True
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data["activo"] = True
        return super().update(instance, validated_data)


class PublicConfiguracionNegocioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionNegocio
        fields = [
            "nombre_negocio",
            "tarifa_base_alquiler",
            "invitados_incluidos_alquiler",
            "costo_invitado_adicional",
            "whatsapp_numero_url",
        ]
        read_only_fields = fields
