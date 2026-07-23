from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("comercial", "0006_oferta_historica_y_tipo_servicio"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="cotizacion",
            constraint=models.CheckConstraint(
                condition=models.Q(("oferta_requiere_revision", True))
                | models.Q(("paquete__isnull", True), ("tipo_servicio", "alquiler"))
                | models.Q(
                    ("paquete__isnull", False),
                    ("tipo_servicio", "servicio_completo"),
                )
                | models.Q(("tipo_servicio", "no_estoy_seguro")),
                name="cotizacion_tipo_servicio_paquete_coherente",
            ),
        ),
    ]
