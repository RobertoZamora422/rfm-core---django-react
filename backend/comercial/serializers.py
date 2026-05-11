from rest_framework import serializers

from negocio.models import Paquete

from .models import Cotizacion


class CotizacionSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    tipo_evento_nombre = serializers.CharField(
        source="tipo_evento.nombre",
        read_only=True,
    )
    paquete_nombre = serializers.CharField(source="paquete.nombre", read_only=True)
    esta_convertida = serializers.BooleanField(read_only=True)

    class Meta:
        model = Cotizacion
        fields = [
            "id",
            "cliente",
            "cliente_nombre",
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
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "es_demo",
            "esta_convertida",
            "creado_en",
            "actualizado_en",
        ]

    def validate(self, attrs):
        paquete = attrs.get("paquete", getattr(self.instance, "paquete", None))
        tipo_servicio = attrs.get(
            "tipo_servicio",
            getattr(self.instance, "tipo_servicio", None),
        )

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

        return attrs
