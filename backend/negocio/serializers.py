from rest_framework import serializers

from .models import Cliente, ConfiguracionNegocio, Paquete, TipoEvento


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = [
            "id",
            "nombre",
            "telefono",
            "correo",
            "observaciones",
            "es_demo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "es_demo", "creado_en", "actualizado_en"]


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


class ConfiguracionNegocioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionNegocio
        fields = [
            "id",
            "nombre_negocio",
            "tarifa_base_alquiler",
            "invitados_incluidos_alquiler",
            "costo_invitado_adicional",
            "capacidad_maxima",
            "activo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "creado_en", "actualizado_en"]

    def validate(self, attrs):
        activo = attrs.get("activo", getattr(self.instance, "activo", True))
        capacidad_maxima = attrs.get(
            "capacidad_maxima",
            getattr(self.instance, "capacidad_maxima", None),
        )
        invitados_incluidos = attrs.get(
            "invitados_incluidos_alquiler",
            getattr(self.instance, "invitados_incluidos_alquiler", None),
        )

        if (
            capacidad_maxima is not None
            and invitados_incluidos is not None
            and capacidad_maxima < invitados_incluidos
        ):
            raise serializers.ValidationError(
                {
                    "capacidad_maxima": "La capacidad máxima no puede ser menor que los invitados incluidos."
                }
            )

        if activo:
            queryset = ConfiguracionNegocio.objects.filter(activo=True)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    {"activo": "Ya existe una configuración activa."}
                )

        return attrs
