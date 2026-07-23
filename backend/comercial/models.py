from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from negocio.models import Paquete, Persona, TimeStampedModel, TipoEvento
from negocio.validators import validate_non_negative, validate_positive_integer


class Cotizacion(TimeStampedModel):
    class Origen(models.TextChoices):
        FORMULARIO_PUBLICO = "formulario_publico", "Formulario público"
        COTIZACION_MANUAL = "cotizacion_manual", "Cotización manual"

    class Estado(models.TextChoices):
        NUEVA = "nueva", "Nueva"
        CONTACTADA = "contactada", "Contactada"
        CONFIRMADA = "confirmada", "Confirmada"
        CONVERTIDA = "convertida", "Convertida"
        DESCARTADA = "descartada", "Descartada"

    class TipoServicioInteres(models.TextChoices):
        ALQUILER = "alquiler", "Alquiler del local"
        SERVICIO_COMPLETO = "servicio_completo", "Servicio completo"
        NO_ESTOY_SEGURO = "no_estoy_seguro", "No estoy seguro"

    persona = models.ForeignKey(
        Persona,
        on_delete=models.PROTECT,
        related_name="cotizaciones",
    )
    tipo_evento = models.ForeignKey(
        TipoEvento,
        on_delete=models.PROTECT,
        related_name="cotizaciones",
    )
    paquete = models.ForeignKey(
        Paquete,
        on_delete=models.SET_NULL,
        related_name="cotizaciones",
        blank=True,
        null=True,
    )
    fecha_tentativa = models.DateField()
    numero_invitados = models.PositiveIntegerField(
        validators=[validate_positive_integer],
    )
    tipo_servicio = models.CharField(
        max_length=30,
        choices=TipoServicioInteres.choices,
    )
    oferta_snapshot = models.JSONField(default=dict, blank=True)
    oferta_requiere_revision = models.BooleanField(default=False)
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.NUEVA,
    )
    total_estimado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
        blank=True,
        null=True,
    )
    observaciones = models.TextField(blank=True)
    origen = models.CharField(
        max_length=30,
        choices=Origen.choices,
        default=Origen.COTIZACION_MANUAL,
    )
    class Meta:
        ordering = ["-creado_en"]
        constraints = [
            models.CheckConstraint(
                condition=Q(numero_invitados__gt=0),
                name="cotizacion_numero_invitados_positivo",
            ),
            models.CheckConstraint(
                condition=Q(total_estimado__gte=0),
                name="cotizacion_total_estimado_no_negativo",
            ),
            models.CheckConstraint(
                condition=Q(oferta_requiere_revision=True)
                | Q(tipo_servicio="alquiler", paquete__isnull=True)
                | Q(tipo_servicio="servicio_completo", paquete__isnull=False)
                | Q(
                    origen="formulario_publico",
                    tipo_servicio="servicio_completo",
                    paquete__isnull=True,
                )
                | Q(tipo_servicio="no_estoy_seguro"),
                name="cotizacion_tipo_servicio_paquete_coherente",
            ),
        ]

    @property
    def esta_convertida(self):
        return self.estado == self.Estado.CONVERTIDA

    def clean(self):
        super().clean()
        if self.tipo_servicio == self.TipoServicioInteres.ALQUILER and self.paquete_id:
            raise ValidationError(
                {"paquete": "El alquiler del local no utiliza un paquete."}
            )
        if (
            self.tipo_servicio == self.TipoServicioInteres.SERVICIO_COMPLETO
            and not self.paquete_id
            and self.origen != self.Origen.FORMULARIO_PUBLICO
            and not self.oferta_requiere_revision
        ):
            raise ValidationError(
                {"paquete": "El servicio completo requiere seleccionar un paquete."}
            )

    def __str__(self):
        return f"Cotización #{self.pk or 'nueva'} - {self.persona}"
