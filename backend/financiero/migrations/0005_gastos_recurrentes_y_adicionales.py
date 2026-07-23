from datetime import date

import django.db.models.deletion
import financiero.validators
import negocio.validators
from django.db import migrations, models


def conservar_gastos_mensuales_como_adicionales(apps, schema_editor):
    GastoAdicional = apps.get_model("financiero", "GastoAdicional")
    for gasto in GastoAdicional.objects.all().iterator():
        gasto.fecha = date(gasto.anio, gasto.mes, 1)
        gasto.origen_legacy = True
        gasto.save(update_fields=["fecha", "origen_legacy"])


class Migration(migrations.Migration):
    dependencies = [
        ("financiero", "0004_rename_cliente_persona"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="GastoFijoMensual",
            new_name="GastoAdicional",
        ),
        migrations.RemoveConstraint(
            model_name="gastoadicional",
            name="gasto_fijo_valor_no_negativo",
        ),
        migrations.RemoveConstraint(
            model_name="gastoadicional",
            name="gasto_fijo_mes_valido",
        ),
        migrations.AddField(
            model_name="gastoadicional",
            name="fecha",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gastoadicional",
            name="origen_legacy",
            field=models.BooleanField(
                default=False,
                editable=False,
                help_text="Indica que el registro proviene del modelo mensual anterior.",
            ),
        ),
        migrations.RunPython(
            conservar_gastos_mensuales_como_adicionales,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="gastoadicional",
            name="fecha",
            field=models.DateField(),
        ),
        migrations.RemoveField(
            model_name="gastoadicional",
            name="anio",
        ),
        migrations.RemoveField(
            model_name="gastoadicional",
            name="mes",
        ),
        migrations.AlterModelOptions(
            name="gastoadicional",
            options={"ordering": ["-fecha", "concepto", "-creado_en"]},
        ),
        migrations.AddConstraint(
            model_name="gastoadicional",
            constraint=models.CheckConstraint(
                condition=models.Q(valor__gte=0),
                name="gasto_adicional_valor_no_negativo",
            ),
        ),
        migrations.CreateModel(
            name="GastoRecurrente",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                ("concepto", models.CharField(max_length=150)),
                ("observaciones", models.TextField(blank=True)),
                (
                    "inicio_periodo",
                    models.DateField(
                        validators=[financiero.validators.validate_period_start]
                    ),
                ),
                (
                    "fin_periodo",
                    models.DateField(
                        blank=True,
                        null=True,
                        validators=[financiero.validators.validate_period_start],
                    ),
                ),
                ("activo", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["concepto", "id"],
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(fin_periodo__isnull=True)
                        | models.Q(fin_periodo__gte=models.F("inicio_periodo")),
                        name="gasto_recurrente_vigencia_valida",
                    )
                ],
            },
        ),
        migrations.CreateModel(
            name="GastoRecurrenteVersion",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                (
                    "valor_mensual",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=12,
                        validators=[negocio.validators.validate_non_negative],
                    ),
                ),
                (
                    "vigente_desde",
                    models.DateField(
                        validators=[financiero.validators.validate_period_start]
                    ),
                ),
                (
                    "vigente_hasta",
                    models.DateField(
                        blank=True,
                        null=True,
                        validators=[financiero.validators.validate_period_start],
                    ),
                ),
                (
                    "gasto_recurrente",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="versiones",
                        to="financiero.gastorecurrente",
                    ),
                ),
            ],
            options={
                "ordering": ["vigente_desde", "id"],
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(valor_mensual__gte=0),
                        name="gasto_recurrente_version_valor_no_negativo",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(vigente_hasta__isnull=True)
                        | models.Q(vigente_hasta__gte=models.F("vigente_desde")),
                        name="gasto_recurrente_version_vigencia_valida",
                    ),
                    models.UniqueConstraint(
                        fields=("gasto_recurrente", "vigente_desde"),
                        name="gasto_recurrente_version_inicio_unico",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="GastoRecurrenteAjuste",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                (
                    "periodo",
                    models.DateField(
                        validators=[financiero.validators.validate_period_start]
                    ),
                ),
                (
                    "valor",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=12,
                        validators=[negocio.validators.validate_non_negative],
                    ),
                ),
                ("observaciones", models.TextField(blank=True)),
                ("eliminado", models.BooleanField(default=False)),
                ("eliminado_en", models.DateTimeField(blank=True, null=True)),
                (
                    "gasto_recurrente",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="ajustes",
                        to="financiero.gastorecurrente",
                    ),
                ),
            ],
            options={
                "ordering": ["-periodo", "-creado_en"],
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(valor__gte=0),
                        name="gasto_recurrente_ajuste_valor_no_negativo",
                    ),
                    models.UniqueConstraint(
                        fields=("gasto_recurrente", "periodo"),
                        name="gasto_recurrente_ajuste_periodo_unico",
                    ),
                ],
            },
        ),
    ]
