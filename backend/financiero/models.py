from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, Sum

from comercial.models import Cotizacion
from financiero.validators import validate_non_negative, validate_period_start
from negocio.models import Paquete, Persona, TimeStampedModel, TipoEvento
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
    persona = models.ForeignKey(
        Persona,
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
        annotated_total = getattr(self, "total_costos_directos_anotado", None)
        if annotated_total is not None:
            return annotated_total or Decimal("0.00")

        total = self.costos_directos.filter(eliminado=False).aggregate(total=Sum("valor"))[
            "total"
        ]
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
        return f"Contrato #{self.pk or 'nuevo'} - {self.persona}"


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
    eliminado = models.BooleanField(default=False)
    eliminado_en = models.DateTimeField(blank=True, null=True)

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


class GastoAdicional(TimeStampedModel):
    concepto = models.CharField(max_length=150)
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
    )
    fecha = models.DateField()
    observaciones = models.TextField(blank=True)
    eliminado = models.BooleanField(default=False)
    eliminado_en = models.DateTimeField(blank=True, null=True)
    origen_legacy = models.BooleanField(
        default=False,
        editable=False,
        help_text="Indica que el registro proviene del modelo mensual anterior.",
    )

    class Meta:
        ordering = ["-fecha", "concepto", "-creado_en"]
        constraints = [
            models.CheckConstraint(
                condition=Q(valor__gte=0),
                name="gasto_adicional_valor_no_negativo",
            ),
        ]

    def __str__(self):
        return f"{self.concepto} ({self.fecha:%d/%m/%Y})"


class GastoRecurrente(TimeStampedModel):
    concepto = models.CharField(max_length=150)
    observaciones = models.TextField(blank=True)
    inicio_periodo = models.DateField(validators=[validate_period_start])
    fin_periodo = models.DateField(
        blank=True,
        null=True,
        validators=[validate_period_start],
    )
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["concepto", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(fin_periodo__isnull=True)
                | Q(fin_periodo__gte=models.F("inicio_periodo")),
                name="gasto_recurrente_vigencia_valida",
            ),
        ]

    def clean(self):
        super().clean()
        self.concepto = " ".join((self.concepto or "").strip().split())
        self.observaciones = (self.observaciones or "").strip()
        if self.fin_periodo and self.fin_periodo < self.inicio_periodo:
            raise ValidationError(
                {"fin_periodo": "El periodo final no puede ser anterior al inicial."}
            )

    def __str__(self):
        return self.concepto


class GastoRecurrenteVersion(TimeStampedModel):
    gasto_recurrente = models.ForeignKey(
        GastoRecurrente,
        on_delete=models.PROTECT,
        related_name="versiones",
    )
    valor_mensual = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
    )
    vigente_desde = models.DateField(validators=[validate_period_start])
    vigente_hasta = models.DateField(
        blank=True,
        null=True,
        validators=[validate_period_start],
    )

    class Meta:
        ordering = ["vigente_desde", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(valor_mensual__gte=0),
                name="gasto_recurrente_version_valor_no_negativo",
            ),
            models.CheckConstraint(
                condition=Q(vigente_hasta__isnull=True)
                | Q(vigente_hasta__gte=models.F("vigente_desde")),
                name="gasto_recurrente_version_vigencia_valida",
            ),
            models.UniqueConstraint(
                fields=["gasto_recurrente", "vigente_desde"],
                name="gasto_recurrente_version_inicio_unico",
            ),
        ]

    def clean(self):
        super().clean()
        if self.vigente_hasta and self.vigente_hasta < self.vigente_desde:
            raise ValidationError(
                {"vigente_hasta": "El periodo final no puede ser anterior al inicial."}
            )

        overlapping = type(self).objects.filter(
            gasto_recurrente=self.gasto_recurrente,
            vigente_desde__lte=self.vigente_hasta or date.max,
        ).filter(
            Q(vigente_hasta__isnull=True) | Q(vigente_hasta__gte=self.vigente_desde)
        )
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)
        if overlapping.exists():
            raise ValidationError(
                "Ya existe un valor recurrente vigente dentro de ese periodo."
            )

    def __str__(self):
        return f"{self.gasto_recurrente} - {self.valor_mensual}"


class GastoRecurrenteAjuste(TimeStampedModel):
    gasto_recurrente = models.ForeignKey(
        GastoRecurrente,
        on_delete=models.PROTECT,
        related_name="ajustes",
    )
    periodo = models.DateField(validators=[validate_period_start])
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[validate_non_negative],
    )
    observaciones = models.TextField(blank=True)
    eliminado = models.BooleanField(default=False)
    eliminado_en = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-periodo", "-creado_en"]
        constraints = [
            models.CheckConstraint(
                condition=Q(valor__gte=0),
                name="gasto_recurrente_ajuste_valor_no_negativo",
            ),
            models.UniqueConstraint(
                fields=["gasto_recurrente", "periodo"],
                name="gasto_recurrente_ajuste_periodo_unico",
            ),
        ]

    def clean(self):
        super().clean()
        self.observaciones = (self.observaciones or "").strip()
        if not self.gasto_recurrente.versiones.filter(
            vigente_desde__lte=self.periodo,
        ).filter(
            Q(vigente_hasta__isnull=True) | Q(vigente_hasta__gte=self.periodo)
        ).exists():
            raise ValidationError(
                {"periodo": "El gasto recurrente no se aplica en ese periodo."}
            )

    def __str__(self):
        return f"{self.gasto_recurrente} ({self.periodo:%m/%Y})"
