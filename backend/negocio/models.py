from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from .validators import (
    normalizar_nombre,
    normalizar_nombre_persona,
    normalizar_telefono,
    normalizar_whatsapp_ecuador,
    validate_non_negative,
    validate_person_name,
    validate_phone,
    validate_positive_integer,
    validate_whatsapp_ecuador,
)


class CleanOnSaveModel(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class TimeStampedModel(CleanOnSaveModel):
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Persona(TimeStampedModel):
    class Origen(models.TextChoices):
        FORMULARIO_PUBLICO = "formulario_publico", "Formulario público"
        COTIZACION_MANUAL = "cotizacion_manual", "Cotización manual"
        CONTRATO_DIRECTO = "contrato_directo", "Contrato directo"
        REGISTRO_MANUAL = "registro_manual", "Registro manual"

    nombre = models.CharField(max_length=150, validators=[validate_person_name])
    telefono = models.CharField(max_length=30, validators=[validate_phone])
    telefono_normalizado = models.CharField(max_length=15, unique=True, editable=False)
    correo = models.EmailField(blank=True)
    observaciones = models.TextField(blank=True)
    origen = models.CharField(
        max_length=30,
        choices=Origen.choices,
        default=Origen.REGISTRO_MANUAL,
    )
    class Meta:
        ordering = ["nombre"]

    def clean(self):
        super().clean()
        self.nombre = normalizar_nombre_persona(self.nombre)
        self.telefono = normalizar_telefono(self.telefono)
        self.correo = (self.correo or "").strip()
        self.telefono_normalizado = self.telefono

    def __str__(self):
        return self.nombre


class NombrePersona(TimeStampedModel):
    persona = models.ForeignKey(
        Persona,
        on_delete=models.CASCADE,
        related_name="nombres_utilizados",
    )
    nombre = models.CharField(max_length=150, validators=[validate_person_name])
    nombre_normalizado = models.CharField(max_length=150, editable=False)
    origen = models.CharField(
        max_length=30,
        choices=Persona.Origen.choices,
        default=Persona.Origen.REGISTRO_MANUAL,
    )

    class Meta:
        ordering = ["creado_en", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["persona", "nombre_normalizado"],
                name="nombre_persona_unico_por_persona",
            )
        ]

    def clean(self):
        super().clean()
        self.nombre = normalizar_nombre_persona(self.nombre)
        self.nombre_normalizado = normalizar_nombre(self.nombre)

    def __str__(self):
        return f"{self.nombre} ({self.persona})"


class TipoEvento(TimeStampedModel):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Paquete(TimeStampedModel):
    class Categoria(models.TextChoices):
        ESTANDAR = "estandar", "Estándar"
        PREMIUM = "premium", "Premium"
        VIP = "vip", "VIP"

    nombre = models.CharField(max_length=120)
    categoria = models.CharField(
        max_length=20,
        choices=Categoria.choices,
        default=Categoria.ESTANDAR,
    )
    orden = models.PositiveSmallIntegerField(default=0)
    resumen_corto = models.CharField(max_length=240, blank=True)
    etiqueta_comercial = models.CharField(max_length=80, blank=True)
    destacado = models.BooleanField(default=False)
    precio_por_persona = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
    )
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["categoria", "orden", "precio_por_persona", "nombre"]
        constraints = [
            models.CheckConstraint(
                condition=Q(precio_por_persona__gt=0),
                name="paquete_precio_por_persona_positivo",
            ),
        ]

    def clean(self):
        super().clean()
        self.nombre = " ".join((self.nombre or "").strip().split())
        self.resumen_corto = " ".join((self.resumen_corto or "").strip().split())
        self.etiqueta_comercial = " ".join(
            (self.etiqueta_comercial or "").strip().split()
        )
        if self.precio_por_persona is not None and self.precio_por_persona <= 0:
            raise ValidationError(
                {
                    "precio_por_persona": "El paquete debe tener un precio por persona mayor que cero."
                }
            )

    def __str__(self):
        return self.nombre


class BeneficioPaquete(TimeStampedModel):
    class Tipo(models.TextChoices):
        PRINCIPAL = "principal", "Beneficio principal"
        DETALLE = "detalle", "Detalle adicional"
        CONDICION = "condicion", "Condición"

    paquete = models.ForeignKey(
        Paquete,
        on_delete=models.CASCADE,
        related_name="beneficios",
        blank=True,
        null=True,
        help_text="Vacío cuando el beneficio está incluido en todos los paquetes.",
    )
    tipo = models.CharField(
        max_length=20,
        choices=Tipo.choices,
        default=Tipo.PRINCIPAL,
    )
    titulo = models.CharField(max_length=180)
    detalle = models.CharField(max_length=300, blank=True)
    orden = models.PositiveSmallIntegerField(default=0)
    minimo_invitados = models.PositiveIntegerField(blank=True, null=True)
    maximo_invitados = models.PositiveIntegerField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["orden", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(minimo_invitados__isnull=True)
                | Q(minimo_invitados__gt=0),
                name="beneficio_minimo_invitados_positivo",
            ),
            models.CheckConstraint(
                condition=Q(maximo_invitados__isnull=True)
                | Q(maximo_invitados__gt=0),
                name="beneficio_maximo_invitados_positivo",
            ),
            models.CheckConstraint(
                condition=Q(minimo_invitados__isnull=True)
                | Q(maximo_invitados__isnull=True)
                | Q(maximo_invitados__gte=models.F("minimo_invitados")),
                name="beneficio_rango_invitados_valido",
            ),
        ]

    @property
    def es_comun(self):
        return self.paquete_id is None

    def clean(self):
        super().clean()
        self.titulo = " ".join((self.titulo or "").strip().split())
        self.detalle = " ".join((self.detalle or "").strip().split())
        if not self.titulo:
            raise ValidationError({"titulo": "El beneficio debe tener un título."})
        if (
            self.minimo_invitados
            and self.maximo_invitados
            and self.maximo_invitados < self.minimo_invitados
        ):
            raise ValidationError(
                {
                    "maximo_invitados": "El máximo no puede ser menor que el mínimo de invitados."
                }
            )

    def __str__(self):
        alcance = self.paquete.nombre if self.paquete_id else "Todos los paquetes"
        return f"{self.titulo} · {alcance}"


class ConfiguracionNegocio(TimeStampedModel):
    nombre_negocio = models.CharField(max_length=150)
    tarifa_base_alquiler = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
    )
    invitados_incluidos_alquiler = models.PositiveIntegerField(
        validators=[validate_positive_integer],
    )
    costo_invitado_adicional = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
    )
    whatsapp_negocio = models.CharField(
        max_length=10,
        blank=True,
        validators=[validate_whatsapp_ecuador],
    )
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["-activo", "nombre_negocio"]
        constraints = [
            models.UniqueConstraint(
                fields=["activo"],
                condition=Q(activo=True),
                name="configuracion_negocio_unica_activa",
            ),
            models.CheckConstraint(
                condition=Q(tarifa_base_alquiler__gte=0),
                name="config_tarifa_base_no_negativa",
            ),
            models.CheckConstraint(
                condition=Q(costo_invitado_adicional__gte=0),
                name="config_costo_invitado_adicional_no_negativo",
            ),
            models.CheckConstraint(
                condition=Q(invitados_incluidos_alquiler__gt=0),
                name="config_invitados_incluidos_positivo",
            ),
        ]

    @property
    def whatsapp_numero_url(self):
        if not self.whatsapp_negocio:
            return ""
        return normalizar_whatsapp_ecuador(self.whatsapp_negocio)

    def clean(self):
        super().clean()
        if not self.activo:
            raise ValidationError(
                {
                    "activo": "Debe existir una configuracion vigente para calcular pre-cotizaciones."
                }
            )

    def __str__(self):
        return self.nombre_negocio
