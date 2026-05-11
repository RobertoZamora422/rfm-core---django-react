from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from .validators import (
    validate_non_negative,
    validate_phone,
    validate_positive_integer,
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


class Cliente(TimeStampedModel):
    nombre = models.CharField(max_length=150)
    telefono = models.CharField(max_length=30, validators=[validate_phone])
    correo = models.EmailField(blank=True)
    observaciones = models.TextField(blank=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class TipoEvento(TimeStampedModel):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Paquete(TimeStampedModel):
    class TipoServicio(models.TextChoices):
        ALQUILER = "alquiler", "Alquiler"
        SERVICIO_COMPLETO = "servicio_completo", "Servicio completo"

    nombre = models.CharField(max_length=120)
    tipo_servicio = models.CharField(
        max_length=30,
        choices=TipoServicio.choices,
    )
    precio_por_persona = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[validate_non_negative],
    )
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        constraints = [
            models.CheckConstraint(
                condition=Q(precio_por_persona__gte=0),
                name="paquete_precio_por_persona_no_negativo",
            ),
        ]

    def clean(self):
        super().clean()
        if (
            self.tipo_servicio == self.TipoServicio.SERVICIO_COMPLETO
            and self.precio_por_persona <= 0
        ):
            raise ValidationError(
                {
                    "precio_por_persona": "El servicio completo debe tener precio por persona mayor que cero."
                }
            )

    def __str__(self):
        return self.nombre


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
    capacidad_maxima = models.PositiveIntegerField(
        validators=[validate_positive_integer],
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
            models.CheckConstraint(
                condition=Q(capacidad_maxima__gt=0),
                name="config_capacidad_maxima_positiva",
            ),
        ]

    def clean(self):
        super().clean()
        if self.capacidad_maxima < self.invitados_incluidos_alquiler:
            raise ValidationError(
                {
                    "capacidad_maxima": "La capacidad máxima no puede ser menor que los invitados incluidos."
                }
            )

    def __str__(self):
        return self.nombre_negocio
