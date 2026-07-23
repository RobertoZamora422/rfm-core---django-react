from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("comercial", "0004_cotizacion_origen"),
        ("negocio", "0006_rename_cliente_persona"),
    ]

    operations = [
        migrations.RenameField(
            model_name="cotizacion",
            old_name="cliente",
            new_name="persona",
        ),
        migrations.RemoveField(
            model_name="cotizacion",
            name="es_demo",
        ),
    ]
