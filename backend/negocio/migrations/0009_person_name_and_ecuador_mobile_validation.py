import re

import negocio.validators
from django.db import migrations, models


def normalize_ecuador_mobile_phones(apps, schema_editor):
    Persona = apps.get_model("negocio", "Persona")
    updates = []
    for persona in Persona.objects.all().only("id", "telefono"):
        digits = re.sub(r"[^0-9]", "", persona.telefono or "")
        if len(digits) == 10 and digits.startswith("09"):
            canonical = digits
        elif len(digits) == 12 and digits.startswith("5939"):
            canonical = f"0{digits[3:]}"
        else:
            continue
        updates.append((persona.id, canonical))

    for persona_id, _ in updates:
        Persona.objects.filter(pk=persona_id).update(
            telefono_normalizado=f"rfm-{persona_id}"
        )
    for persona_id, canonical in updates:
        Persona.objects.filter(pk=persona_id).update(
            telefono=canonical,
            telefono_normalizado=canonical,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("negocio", "0008_catalogo_real_y_retiro_tipo_paquete"),
    ]

    operations = [
        migrations.RunPython(
            normalize_ecuador_mobile_phones,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="persona",
            name="nombre",
            field=models.CharField(
                max_length=150,
                validators=[negocio.validators.validate_person_name],
            ),
        ),
        migrations.AlterField(
            model_name="nombrepersona",
            name="nombre",
            field=models.CharField(
                max_length=150,
                validators=[negocio.validators.validate_person_name],
            ),
        ),
    ]
