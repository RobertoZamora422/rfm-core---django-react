from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("financiero", "0003_costodirecto_eliminado_costodirecto_eliminado_en_and_more"),
        ("negocio", "0006_rename_cliente_persona"),
    ]

    operations = [
        migrations.RenameField(
            model_name="contrato",
            old_name="cliente",
            new_name="persona",
        ),
        migrations.RemoveField(
            model_name="contrato",
            name="es_demo",
        ),
        migrations.RemoveField(
            model_name="costodirecto",
            name="es_demo",
        ),
        migrations.RemoveField(
            model_name="gastofijomensual",
            name="es_demo",
        ),
    ]
