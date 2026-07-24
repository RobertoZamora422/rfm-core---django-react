import re
import unicodedata
from decimal import Decimal

from django.core.exceptions import ValidationError


PERSON_NAME_PATTERN = re.compile(
    r"^[^\W\d_]+(?:[ '\-’][^\W\d_]+)*$",
    flags=re.UNICODE,
)
PHONE_PATTERN = re.compile(r"^\+?[0-9\s\-()]+$")
WHATSAPP_ECUADOR_PATTERN = re.compile(r"^09\d{8}$")
PERSON_NAME_ERROR = "Ingrese su nombre."
PHONE_ERROR = "Ingrese su teléfono para validar su solicitud."


def validate_phone(value):
    if not PHONE_PATTERN.match(value or ""):
        raise ValidationError(PHONE_ERROR)
    normalizar_telefono(value)


def extraer_digitos_telefono(value):
    return re.sub(r"[^0-9]", "", value or "")


def normalizar_telefono(value):
    """Devuelve un celular ecuatoriano en formato canónico 09XXXXXXXX."""
    if not PHONE_PATTERN.fullmatch(value or ""):
        raise ValidationError(PHONE_ERROR)
    digits = extraer_digitos_telefono(value)
    if len(digits) == 10 and digits.startswith("09"):
        canonical = digits
    elif len(digits) == 12 and digits.startswith("5939"):
        canonical = f"0{digits[3:]}"
    else:
        raise ValidationError(PHONE_ERROR)

    return canonical


def normalizar_telefono_busqueda(value):
    """Compatibilidad para consumidores anteriores de la normalización telefónica."""
    return normalizar_telefono(value)


def normalizar_telefono_parcial(value):
    digits = extraer_digitos_telefono(value)
    if digits.startswith("593") and len(digits) > 3:
        return f"0{digits[3:]}"
    return digits


def normalizar_nombre_persona(value):
    value = " ".join((value or "").strip().split())
    if (
        len([character for character in value if character.isalpha()]) < 3
        or not PERSON_NAME_PATTERN.fullmatch(value)
    ):
        raise ValidationError(PERSON_NAME_ERROR)
    return value


def validate_person_name(value):
    normalizar_nombre_persona(value)


def normalizar_nombre(value):
    value = " ".join((value or "").strip().split()).casefold()
    return "".join(
        character
        for character in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(character)
    )


def normalizar_whatsapp_ecuador(value):
    value = value or ""
    if not WHATSAPP_ECUADOR_PATTERN.match(value):
        raise ValidationError(
            "Ingrese un WhatsApp ecuatoriano valido en formato 09XXXXXXXX."
        )
    return f"593{value[1:]}"


def validate_whatsapp_ecuador(value):
    if value in (None, ""):
        return
    normalizar_whatsapp_ecuador(value)


def validate_non_negative(value):
    if value is not None and Decimal(value) < Decimal("0"):
        raise ValidationError("El valor no puede ser negativo.")


def validate_positive_integer(value):
    if value is not None and int(value) <= 0:
        raise ValidationError("El valor debe ser mayor que cero.")
