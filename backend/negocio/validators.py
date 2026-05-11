import re
from decimal import Decimal

from django.core.exceptions import ValidationError


PHONE_PATTERN = re.compile(r"^\+?[0-9\s\-()]{7,20}$")


def validate_phone(value):
    if not PHONE_PATTERN.match(value or ""):
        raise ValidationError(
            "Ingrese un teléfono válido. Use números y, opcionalmente, +, espacios, guiones o paréntesis."
        )


def validate_non_negative(value):
    if value is not None and Decimal(value) < Decimal("0"):
        raise ValidationError("El valor no puede ser negativo.")


def validate_positive_integer(value):
    if value is not None and int(value) <= 0:
        raise ValidationError("El valor debe ser mayor que cero.")
