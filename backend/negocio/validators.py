import re
import unicodedata
from decimal import Decimal

from django.core.exceptions import ValidationError


PHONE_PATTERN = re.compile(r"^\+?[0-9\s\-()]{7,20}$")
WHATSAPP_ECUADOR_PATTERN = re.compile(r"^09\d{8}$")


def validate_phone(value):
    if not PHONE_PATTERN.match(value or ""):
        raise ValidationError(
            "Ingrese un telefono valido. Use numeros y, opcionalmente, +, espacios, guiones o parentesis."
        )
    normalizar_telefono(value)


def extraer_digitos_telefono(value):
    return re.sub(r"[^0-9]", "", value or "")


def normalizar_telefono(value):
    """Devuelve la identidad telefónica canónica sin alterar el valor visible."""
    digits = extraer_digitos_telefono(value)
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) == 10 and digits.startswith("0"):
        digits = f"593{digits[1:]}"
    if not 7 <= len(digits) <= 15:
        raise ValidationError("Ingrese un telefono valido de entre 7 y 15 digitos.")
    return digits


def normalizar_telefono_busqueda(value):
    """Compatibilidad para consumidores anteriores de la normalización telefónica."""
    return normalizar_telefono(value)


def normalizar_telefono_parcial(value):
    digits = extraer_digitos_telefono(value)
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("0"):
        return f"593{digits[1:]}"
    return digits


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
