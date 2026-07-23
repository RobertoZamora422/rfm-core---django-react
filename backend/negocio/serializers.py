from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import ConfiguracionNegocio, NombrePersona, Paquete, Persona, TipoEvento
from .persona_services import (
    PersonaDuplicadaError,
    actualizar_persona,
    crear_persona,
)
from .selectors import buscar_persona_por_telefono


def _raise_persona_validation_error(exc):
    if isinstance(exc, PersonaDuplicadaError):
        raise serializers.ValidationError(
            {
                "telefono": exc.message_dict["telefono"],
                "persona_existente_id": exc.persona.id,
            }
        )
    if hasattr(exc, "message_dict"):
        raise serializers.ValidationError(exc.message_dict)
    raise serializers.ValidationError(exc.messages)


class PersonaNuevaSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=150)
    telefono = serializers.CharField(max_length=30)
    correo = serializers.EmailField(required=False, allow_blank=True)
    observaciones = serializers.CharField(required=False, allow_blank=True)

    def validate_nombre(self, value):
        value = " ".join((value or "").strip().split())
        if not value:
            raise serializers.ValidationError("El nombre es obligatorio.")
        return value

    def validate_telefono(self, value):
        value = (value or "").strip()
        from .validators import validate_phone

        try:
            validate_phone(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        duplicate = buscar_persona_por_telefono(value)
        if duplicate:
            raise serializers.ValidationError(
                "Esta persona ya está registrada. Puedes seleccionarla para continuar."
            )
        return value


class PersonaSerializer(serializers.ModelSerializer):
    cotizaciones_count = serializers.SerializerMethodField()
    contratos_count = serializers.SerializerMethodField()
    clasificacion = serializers.SerializerMethodField()
    clasificacion_display = serializers.SerializerMethodField()
    origen_display = serializers.CharField(source="get_origen_display", read_only=True)

    class Meta:
        model = Persona
        fields = [
            "id",
            "nombre",
            "telefono",
            "correo",
            "observaciones",
            "origen",
            "origen_display",
            "clasificacion",
            "clasificacion_display",
            "cotizaciones_count",
            "contratos_count",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = [
            "id",
            "origen",
            "origen_display",
            "clasificacion",
            "clasificacion_display",
            "creado_en",
            "actualizado_en",
        ]

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

    def get_clasificacion(self, obj):
        return "cliente" if self.get_contratos_count(obj) > 0 else "interesado"

    def get_clasificacion_display(self, obj):
        return "Cliente" if self.get_clasificacion(obj) == "cliente" else "Interesado"

    def validate_telefono(self, value):
        value = (value or "").strip()
        duplicate = buscar_persona_por_telefono(
            value,
            exclude_id=getattr(self.instance, "id", None),
        )
        if duplicate:
            raise serializers.ValidationError(
                "Esta persona ya está registrada. Puedes seleccionarla para continuar."
            )
        return value

    def create(self, validated_data):
        try:
            return crear_persona(
                **validated_data,
                origen=Persona.Origen.REGISTRO_MANUAL,
            )
        except DjangoValidationError as exc:
            _raise_persona_validation_error(exc)

    def update(self, instance, validated_data):
        try:
            return actualizar_persona(instance, **validated_data)
        except DjangoValidationError as exc:
            _raise_persona_validation_error(exc)


class NombrePersonaSerializer(serializers.ModelSerializer):
    origen_display = serializers.CharField(source="get_origen_display", read_only=True)

    class Meta:
        model = NombrePersona
        fields = ["id", "nombre", "origen", "origen_display", "creado_en"]
        read_only_fields = fields


class PersonaDetalleSerializer(PersonaSerializer):
    nombres_utilizados = serializers.SerializerMethodField()
    resumen_relacion = serializers.SerializerMethodField()
    cotizaciones_relacionadas = serializers.SerializerMethodField()
    contratos_relacionados = serializers.SerializerMethodField()
    historial = serializers.SerializerMethodField()

    class Meta(PersonaSerializer.Meta):
        fields = [
            *PersonaSerializer.Meta.fields,
            "nombres_utilizados",
            "resumen_relacion",
            "cotizaciones_relacionadas",
            "contratos_relacionados",
            "historial",
        ]
        read_only_fields = fields

    def _cotizaciones(self, obj):
        return list(obj.cotizaciones.all())

    def _contratos(self, obj):
        return list(obj.contratos.all())

    def get_nombres_utilizados(self, obj):
        principal = {
            "id": None,
            "nombre": obj.nombre,
            "es_principal": True,
            "origen": obj.origen,
            "origen_display": obj.get_origen_display(),
            "creado_en": obj.creado_en,
        }
        aliases = [
            {
                **NombrePersonaSerializer(alias).data,
                "es_principal": False,
            }
            for alias in obj.nombres_utilizados.all()
        ]
        return [principal, *aliases]

    def get_resumen_relacion(self, obj):
        interacciones = [obj.creado_en]
        for item in [*self._cotizaciones(obj), *self._contratos(obj)]:
            interacciones.extend([item.creado_en, item.actualizado_en])
        return {
            "cotizaciones": self.get_cotizaciones_count(obj),
            "contratos": self.get_contratos_count(obj),
            "primera_interaccion": min(interacciones),
            "ultima_interaccion": max(interacciones),
        }

    def get_cotizaciones_relacionadas(self, obj):
        return [
            {
                "id": item.id,
                "tipo_evento": item.tipo_evento.nombre,
                "fecha_tentativa": item.fecha_tentativa,
                "estado": item.estado,
                "estado_display": item.get_estado_display(),
                "total_estimado": item.total_estimado,
                "origen": item.origen,
                "origen_display": item.get_origen_display(),
                "creado_en": item.creado_en,
            }
            for item in self._cotizaciones(obj)
        ]

    def get_contratos_relacionados(self, obj):
        return [
            {
                "id": item.id,
                "tipo_evento": item.tipo_evento.nombre,
                "fecha_evento": item.fecha_evento,
                "estado_contrato": item.estado_contrato,
                "estado_contrato_display": item.get_estado_contrato_display(),
                "estado_pago": item.estado_pago,
                "estado_pago_display": item.get_estado_pago_display(),
                "valor_final": item.valor_final,
                "saldo_pendiente": item.saldo_pendiente,
                "creado_en": item.creado_en,
            }
            for item in self._contratos(obj)
        ]

    def get_historial(self, obj):
        eventos = [
            {
                "tipo": "registro",
                "titulo": f"Se registró desde {obj.get_origen_display().lower()}",
                "fecha": obj.creado_en,
            }
        ]
        for alias in obj.nombres_utilizados.all():
            eventos.append(
                {
                    "tipo": "nombre",
                    "titulo": f"Utilizó el nombre {alias.nombre}",
                    "detalle": alias.get_origen_display(),
                    "fecha": alias.creado_en,
                }
            )
        for cotizacion in self._cotizaciones(obj):
            eventos.append(
                {
                    "tipo": "cotizacion",
                    "titulo": (
                        "Generó una pre-cotización"
                        if cotizacion.origen == cotizacion.Origen.FORMULARIO_PUBLICO
                        else "Se creó una cotización administrativa"
                    ),
                    "detalle": f"Cotización #{cotizacion.id} · {cotizacion.get_estado_display()}",
                    "fecha": cotizacion.creado_en,
                    "ruta": f"/cotizaciones/{cotizacion.id}",
                }
            )
        for contrato in self._contratos(obj):
            eventos.append(
                {
                    "tipo": "contrato",
                    "titulo": (
                        "Una cotización se convirtió en contrato"
                        if contrato.cotizacion_id
                        else "Se creó un contrato directo"
                    ),
                    "detalle": f"Contrato #{contrato.id} · {contrato.get_estado_contrato_display()}",
                    "fecha": contrato.creado_en,
                    "ruta": f"/contratos/{contrato.id}",
                }
            )
        return sorted(eventos, key=lambda item: item["fecha"], reverse=True)


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
