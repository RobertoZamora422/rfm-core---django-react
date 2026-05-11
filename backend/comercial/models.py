from django.db import models
from django.db.models import Q

from negocio.models import Cliente, Paquete, TimeStampedModel, TipoEvento
from negocio.validators import validate_non_negative, validate_positive_integer


class Cotizacion(TimeStampedModel):
    class Estado(models.TextChoices):
        NUEVA = "nueva", "Nueva"
        CONTACTADA = "contactada", "Contactada"
        CONFIRMADA = "confirmada", "Confirmada"
        CONVERTIDA = "convertida", "Convertida"
        DESCARTADA = "descartada", "Descartada"

    cliente = models.ForeignKey(
        Cliente,
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
        choices=Paquete.TipoServicio.choices,
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.NUEVA,
    )
    total_estimado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
    )
    observaciones = models.TextField(blank=True)

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
        ]

    @property
    def esta_convertida(self):
        return self.estado == self.Estado.CONVERTIDA

    def __str__(self):
        return f"Cotización #{self.pk or 'nueva'} - {self.cliente}"
