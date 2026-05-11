from datetime import date

from django.core.exceptions import ValidationError

from negocio.validators import validate_non_negative


def validate_month(value):
    if value < 1 or value > 12:
        raise ValidationError("El mes debe estar entre 1 y 12.")


def validate_year(value):
    current_year = date.today().year
    if value < 2000 or value > current_year + 10:
        raise ValidationError("El año no es válido para el registro del sistema.")
