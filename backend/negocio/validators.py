import re
from decimal import Decimal

from django.core.exceptions import ValidationError


PHONE_PATTERN = re.compile(r"^\+?[0-9\s\-()]{7,20}$")
WHATSAPP_ECUADOR_PATTERN = re.compile(r"^09\d{8}$")


def validate_phone(value):
    if not PHONE_PATTERN.match(value or ""):
        raise ValidationError(
            "Ingrese un telefono valido. Use numeros y, opcionalmente, +, espacios, guiones o parentesis."
        )


def normalizar_telefono_busqueda(value):
    """Quita los separadores permitidos para comparar teléfonos sin cambiar su presentación."""
    return re.sub(r"[^0-9]", "", value or "")


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
