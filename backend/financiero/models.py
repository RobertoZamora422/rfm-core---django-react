from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, Sum

from comercial.models import Cotizacion
from financiero.validators import validate_month, validate_non_negative, validate_year
from negocio.models import Cliente, Paquete, TimeStampedModel, TipoEvento
from negocio.validators import validate_positive_integer


class Contrato(TimeStampedModel):
    class EstadoContrato(models.TextChoices):
        CONFIRMADO = "confirmado", "Confirmado"
        CANCELADO = "cancelado", "Cancelado"

    class EstadoPago(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        ABONADO = "abonado", "Abonado"
        PAGADO = "pagado", "Pagado"

    cotizacion = models.OneToOneField(
        Cotizacion,
        on_delete=models.SET_NULL,
        related_name="contrato",
        blank=True,
        null=True,
    )
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name="contratos",
    )
    tipo_evento = models.ForeignKey(
        TipoEvento,
        on_delete=models.PROTECT,
        related_name="contratos",
    )
    paquete = models.ForeignKey(
        Paquete,
        on_delete=models.SET_NULL,
        related_name="contratos",
        blank=True,
        null=True,
    )
    fecha_evento = models.DateField()
    numero_invitados = models.PositiveIntegerField(
        validators=[validate_positive_integer],
    )
    valor_final = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
    )
    monto_abonado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[validate_non_negative],
    )
    estado_contrato = models.CharField(
        max_length=20,
        choices=EstadoContrato.choices,
        default=EstadoContrato.CONFIRMADO,
    )
    estado_pago = models.CharField(
        max_length=20,
        choices=EstadoPago.choices,
        default=EstadoPago.PENDIENTE,
    )
    observaciones = models.TextField(blank=True)

    class Meta:
        ordering = ["-fecha_evento", "-creado_en"]
        constraints = [
            models.CheckConstraint(
                condition=Q(numero_invitados__gt=0),
                name="contrato_numero_invitados_positivo",
            ),
            models.CheckConstraint(
                condition=Q(valor_final__gte=0),
                name="contrato_valor_final_no_negativo",
            ),
            models.CheckConstraint(
                condition=Q(monto_abonado__gte=0),
                name="contrato_monto_abonado_no_negativo",
            ),
            models.CheckConstraint(
                condition=Q(monto_abonado__lte=models.F("valor_final")),
                name="contrato_monto_abonado_no_supera_valor_final",
            ),
        ]

    @property
    def saldo_pendiente(self):
        return self.valor_final - self.monto_abonado

    @property
    def total_costos_directos(self):
        total = self.costos_directos.aggregate(total=Sum("valor"))["total"]
        return total or Decimal("0.00")

    @property
    def utilidad_bruta(self):
        return self.valor_final - self.total_costos_directos

    @property
    def margen_bruto(self):
        if self.valor_final == 0:
            return Decimal("0.00")
        return (self.utilidad_bruta / self.valor_final) * Decimal("100")

    def calcular_estado_pago(self):
        if self.monto_abonado == 0:
            return self.EstadoPago.PENDIENTE
        if self.monto_abonado < self.valor_final:
            return self.EstadoPago.ABONADO
        return self.EstadoPago.PAGADO

    def clean(self):
        super().clean()
        if self.monto_abonado > self.valor_final:
            raise ValidationError(
                {
                    "monto_abonado": "El monto abonado no puede superar el valor final."
                }
            )
        self.estado_pago = self.calcular_estado_pago()

    def __str__(self):
        return f"Contrato #{self.pk or 'nuevo'} - {self.cliente}"


class CostoDirecto(TimeStampedModel):
    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.CASCADE,
        related_name="costos_directos",
    )
    concepto = models.CharField(max_length=150)
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
    )
    fecha = models.DateField()
    observaciones = models.TextField(blank=True)

    class Meta:
        ordering = ["-fecha", "-creado_en"]
        constraints = [
            models.CheckConstraint(
                condition=Q(valor__gte=0),
                name="costo_directo_valor_no_negativo",
            ),
        ]

    def __str__(self):
        return f"{self.concepto} - {self.contrato}"


class GastoFijoMensual(TimeStampedModel):
    concepto = models.CharField(max_length=150)
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
    )
    mes = models.PositiveSmallIntegerField(validators=[validate_month])
    anio = models.PositiveIntegerField(validators=[validate_year])
    observaciones = models.TextField(blank=True)

    class Meta:
        ordering = ["-anio", "-mes", "concepto"]
        constraints = [
            models.CheckConstraint(
                condition=Q(valor__gte=0),
                name="gasto_fijo_valor_no_negativo",
            ),
            models.CheckConstraint(
                condition=Q(mes__gte=1, mes__lte=12),
                name="gasto_fijo_mes_valido",
            ),
        ]

    def __str__(self):
        return f"{self.concepto} ({self.mes}/{self.anio})"
