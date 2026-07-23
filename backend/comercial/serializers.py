from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from rest_framework import serializers

from financiero.models import Contrato
from negocio.models import Paquete, Persona, TipoEvento
from negocio.ofertas import (
    presentacion_paquete,
    snapshot_alquiler,
    snapshot_alquiler_desde_oferta,
    snapshot_no_estoy_seguro,
    snapshot_no_estoy_seguro_desde_oferta,
    snapshot_paquete,
    snapshot_paquete_desde_oferta,
)
from negocio.persona_services import PersonaDuplicadaError, crear_persona
from negocio.selectors import obtener_configuracion_activa
from negocio.serializers import PersonaNuevaSerializer
from negocio.validators import validate_phone

from .models import Cotizacion


class CotizacionSerializer(serializers.ModelSerializer):
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
    paquete_nombre = serializers.SerializerMethodField()
    tipo_servicio_display = serializers.CharField(
        source="get_tipo_servicio_display",
        read_only=True,
    )
    esta_convertida = serializers.BooleanField(read_only=True)
    contrato_id = serializers.SerializerMethodField()
    origen_display = serializers.CharField(source="get_origen_display", read_only=True)

    class Meta:
        model = Cotizacion
        fields = [
            "id",
            "persona",
            "persona_nombre",
            "persona_telefono",
            "persona_nueva",
            "tipo_evento",
            "tipo_evento_nombre",
            "paquete",
            "paquete_nombre",
            "fecha_tentativa",
            "numero_invitados",
            "tipo_servicio",
            "tipo_servicio_display",
            "oferta_snapshot",
            "oferta_requiere_revision",
            "estado",
            "total_estimado",
            "observaciones",
            "origen",
            "origen_display",
            "esta_convertida",
            "contrato_id",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "esta_convertida",
            "contrato_id",
            "origen",
            "origen_display",
            "oferta_snapshot",
            "oferta_requiere_revision",
            "creado_en",
            "actualizado_en",
        ]

    def get_contrato_id(self, obj):
        try:
            return obj.contrato.id
        except ObjectDoesNotExist:
            return None

    def get_paquete_nombre(self, obj):
        return presentacion_paquete(
            tipo_servicio=obj.tipo_servicio,
            snapshot=obj.oferta_snapshot,
            paquete=obj.paquete,
        )

    def validate(self, attrs):
        paquete = attrs.get("paquete", getattr(self.instance, "paquete", None))
        tipo_evento = attrs.get(
            "tipo_evento",
            getattr(self.instance, "tipo_evento", None),
        )
        tipo_servicio = attrs.get(
            "tipo_servicio",
            getattr(self.instance, "tipo_servicio", None),
        )
        estado = attrs.get("estado")
        persona = attrs.get("persona")
        persona_nueva = attrs.get("persona_nueva")
        errors = {}

        if self.instance is None and bool(persona) == bool(persona_nueva):
            errors["persona"] = "Selecciona una persona existente o registra una nueva."
        if self.instance is not None and persona_nueva:
            errors["persona_nueva"] = "La creación rápida solo está disponible en una nueva cotización."

        if self.instance and self.instance.estado == Cotizacion.Estado.CONVERTIDA:
            locked_fields = [
                "persona",
                "tipo_evento",
                "paquete",
                "fecha_tentativa",
                "numero_invitados",
                "tipo_servicio",
                "total_estimado",
                "estado",
            ]
            for field in locked_fields:
                if field not in attrs:
                    continue
                current_value = getattr(self.instance, field)
                if attrs[field] != current_value:
                    errors[field] = (
                        "Una cotizacion convertida no permite modificar datos comerciales criticos."
                    )

        if tipo_evento and not tipo_evento.activo:
            current_tipo_evento_id = getattr(self.instance, "tipo_evento_id", None)
            if self.instance is None or tipo_evento.id != current_tipo_evento_id:
                errors["tipo_evento"] = "El tipo de evento debe estar activo."

        if paquete and not paquete.activo:
            current_paquete_id = getattr(self.instance, "paquete_id", None)
            if self.instance is None or paquete.id != current_paquete_id:
                errors["paquete"] = "El paquete debe estar activo."

        if tipo_servicio == Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO and not paquete:
            errors["paquete"] = "El servicio completo requiere seleccionar un paquete."
        if tipo_servicio == Cotizacion.TipoServicioInteres.ALQUILER and paquete:
            errors["paquete"] = "El alquiler del local no utiliza un paquete."

        if estado == Cotizacion.Estado.CONVERTIDA and (
            self.instance is None
            or self.instance.estado != Cotizacion.Estado.CONVERTIDA
        ):
            errors["estado"] = "La conversion a contrato debe realizarse desde la accion correspondiente."

        if self.instance and estado and estado != self.instance.estado:
            errors["estado"] = "Cambie el estado desde la accion de seguimiento correspondiente."

        if self.instance is None and estado not in (None, Cotizacion.Estado.NUEVA):
            errors["estado"] = "Una cotizacion nueva debe iniciar en estado Nueva."

        if (
            self.instance
            and self.instance.estado == Cotizacion.Estado.CONVERTIDA
            and estado
            and estado != Cotizacion.Estado.CONVERTIDA
        ):
            errors["estado"] = "Una cotizacion convertida no permite cambios de estado."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def _snapshot(self, validated_data):
        tipo_servicio = validated_data.get(
            "tipo_servicio",
            getattr(self.instance, "tipo_servicio", None),
        )
        paquete = validated_data.get(
            "paquete",
            getattr(self.instance, "paquete", None),
        )
        numero_invitados = validated_data.get(
            "numero_invitados",
            getattr(self.instance, "numero_invitados", None),
        )
        total_estimado = validated_data.get(
            "total_estimado",
            getattr(self.instance, "total_estimado", None),
        )
        configuracion = obtener_configuracion_activa()
        if tipo_servicio == Cotizacion.TipoServicioInteres.ALQUILER:
            if self.instance:
                snapshot = snapshot_alquiler_desde_oferta(
                    self.instance.oferta_snapshot,
                    numero_invitados=numero_invitados,
                    total_estimado=total_estimado,
                    origen="cotizacion_manual",
                )
                if snapshot:
                    return snapshot
            return snapshot_alquiler(
                configuracion,
                numero_invitados=numero_invitados,
                total_estimado=total_estimado,
                origen="cotizacion_manual",
            )
        if tipo_servicio == Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO:
            if self.instance:
                snapshot = snapshot_paquete_desde_oferta(
                    self.instance.oferta_snapshot,
                    paquete=paquete,
                    numero_invitados=numero_invitados,
                    total_estimado=total_estimado,
                    origen="cotizacion_manual",
                )
                if snapshot:
                    return snapshot
            return snapshot_paquete(
                paquete,
                numero_invitados=numero_invitados,
                total_estimado=total_estimado,
                origen="cotizacion_manual",
            )
        if self.instance:
            snapshot = snapshot_no_estoy_seguro_desde_oferta(
                self.instance.oferta_snapshot,
                paquete=paquete,
                numero_invitados=numero_invitados,
                total_estimado=total_estimado,
                origen="cotizacion_manual",
            )
            if snapshot:
                return snapshot
        return snapshot_no_estoy_seguro(
            numero_invitados=numero_invitados,
            total_estimado=total_estimado,
            paquete=paquete,
            configuracion=configuracion,
            origen="cotizacion_manual",
        )

    @transaction.atomic
    def create(self, validated_data):
        persona_nueva = validated_data.pop("persona_nueva", None)
        if persona_nueva:
            try:
                validated_data["persona"] = crear_persona(
                    **persona_nueva,
                    origen=Persona.Origen.COTIZACION_MANUAL,
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
        validated_data["origen"] = Cotizacion.Origen.COTIZACION_MANUAL
        validated_data["oferta_snapshot"] = self._snapshot(validated_data)
        validated_data["oferta_requiere_revision"] = False
        return super().create(validated_data)

    def update(self, instance, validated_data):
        critical_fields = {
            "tipo_servicio",
            "paquete",
            "numero_invitados",
            "total_estimado",
        }
        if critical_fields.intersection(validated_data):
            validated_data["oferta_snapshot"] = self._snapshot(validated_data)
            validated_data["oferta_requiere_revision"] = False
        return super().update(instance, validated_data)

    def validate_numero_invitados(self, value):
        if value <= 0:
            raise serializers.ValidationError("El numero de invitados debe ser mayor que cero.")
        return value

    def validate_total_estimado(self, value):
        if value < 0:
            raise serializers.ValidationError("El total estimado no puede ser negativo.")
        return value


class PreCotizacionSerializer(serializers.Serializer):
    persona = serializers.IntegerField(required=False, write_only=True)
    nombre_persona = serializers.CharField(required=False, allow_blank=True)
    telefono_persona = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[validate_phone],
    )
    correo_persona = serializers.EmailField(required=False, allow_blank=True, write_only=True)
    observaciones_persona = serializers.CharField(required=False, allow_blank=True)
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
    tipo_servicio = serializers.ChoiceField(choices=Cotizacion.TipoServicioInteres.choices)
    observaciones = serializers.CharField(required=False, allow_blank=True)
    nivel_experiencia = serializers.ChoiceField(
        choices=["esencial", "equilibrado", "completo"],
        required=False,
        default="equilibrado",
        write_only=True,
    )
    entretenimiento = serializers.ChoiceField(
        choices=["indiferente", "importante"],
        required=False,
        default="indiferente",
        write_only=True,
    )

    def validate(self, attrs):
        nombre_persona = (attrs.get("nombre_persona") or "").strip()
        telefono_persona = (attrs.get("telefono_persona") or "").strip()
        paquete = attrs.get("paquete")
        tipo_servicio = attrs.get("tipo_servicio")

        errors = {}
        if "persona" in attrs:
            errors["persona"] = "El flujo público no permite seleccionar personas existentes."
        if not nombre_persona:
            errors["nombre_persona"] = "El nombre de la persona es obligatorio."
        if not telefono_persona:
            errors["telefono_persona"] = "El teléfono de la persona es obligatorio."

        if tipo_servicio == Cotizacion.TipoServicioInteres.ALQUILER and paquete:
            errors["paquete"] = "El alquiler del local no utiliza un paquete."
        if tipo_servicio == Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO and not paquete:
            errors["paquete"] = "Selecciona el paquete de servicio completo que prefieres."

        if errors:
            raise serializers.ValidationError(errors)

        attrs["nombre_persona"] = nombre_persona
        attrs["telefono_persona"] = telefono_persona
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
    tipo_servicio = serializers.ChoiceField(
        choices=Contrato.TipoServicio.choices,
        required=False,
    )
    fecha_evento = serializers.DateField(required=False)
    numero_invitados = serializers.IntegerField(min_value=1, required=False)
    paquete = serializers.PrimaryKeyRelatedField(
        queryset=Paquete.objects.filter(activo=True),
        required=False,
        allow_null=True,
    )
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
