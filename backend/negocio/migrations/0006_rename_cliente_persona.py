from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("negocio", "0005_consolidate_personas_and_unique_phone"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="Cliente",
            new_name="Persona",
        ),
        migrations.RemoveConstraint(
            model_name="nombrepersona",
            name="nombre_persona_unico_por_cliente",
        ),
        migrations.RenameField(
            model_name="nombrepersona",
            old_name="cliente",
            new_name="persona",
        ),
        migrations.AddConstraint(
            model_name="nombrepersona",
            constraint=models.UniqueConstraint(
                fields=("persona", "nombre_normalizado"),
                name="nombre_persona_unico_por_persona",
            ),
        ),
        migrations.RemoveField(
            model_name="persona",
            name="es_demo",
        ),
    ]
