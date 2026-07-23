import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("negocio", "0006_rename_cliente_persona"),
    ]

    operations = [
        migrations.AddField(
            model_name="paquete",
            name="categoria",
            field=models.CharField(
                choices=[
                    ("estandar", "Estándar"),
                    ("premium", "Premium"),
                    ("vip", "VIP"),
                ],
                default="estandar",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="paquete",
            name="destacado",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="paquete",
            name="etiqueta_comercial",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="paquete",
            name="orden",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="paquete",
            name="resumen_corto",
            field=models.CharField(blank=True, max_length=240),
        ),
        migrations.CreateModel(
            name="BeneficioPaquete",
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
                    "tipo",
                    models.CharField(
                        choices=[
                            ("principal", "Beneficio principal"),
                            ("detalle", "Detalle adicional"),
                            ("condicion", "Condición"),
                        ],
                        default="principal",
                        max_length=20,
                    ),
                ),
                ("titulo", models.CharField(max_length=180)),
                ("detalle", models.CharField(blank=True, max_length=300)),
                ("orden", models.PositiveSmallIntegerField(default=0)),
                (
                    "minimo_invitados",
                    models.PositiveIntegerField(blank=True, null=True),
                ),
                (
                    "maximo_invitados",
                    models.PositiveIntegerField(blank=True, null=True),
                ),
                ("activo", models.BooleanField(default=True)),
                (
                    "paquete",
                    models.ForeignKey(
                        blank=True,
                        help_text="Vacío cuando el beneficio está incluido en todos los paquetes.",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="beneficios",
                        to="negocio.paquete",
                    ),
                ),
            ],
            options={"ordering": ["orden", "id"]},
        ),
        migrations.AddConstraint(
            model_name="beneficiopaquete",
            constraint=models.CheckConstraint(
                condition=models.Q(("minimo_invitados__isnull", True))
                | models.Q(("minimo_invitados__gt", 0)),
                name="beneficio_minimo_invitados_positivo",
            ),
        ),
        migrations.AddConstraint(
            model_name="beneficiopaquete",
            constraint=models.CheckConstraint(
                condition=models.Q(("maximo_invitados__isnull", True))
                | models.Q(("maximo_invitados__gt", 0)),
                name="beneficio_maximo_invitados_positivo",
            ),
        ),
        migrations.AddConstraint(
            model_name="beneficiopaquete",
            constraint=models.CheckConstraint(
                condition=models.Q(("minimo_invitados__isnull", True))
                | models.Q(("maximo_invitados__isnull", True))
                | models.Q(("maximo_invitados__gte", models.F("minimo_invitados"))),
                name="beneficio_rango_invitados_valido",
            ),
        ),
    ]
