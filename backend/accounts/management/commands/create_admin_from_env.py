import os

from django.contrib.auth import get_user_model
from django.core.exceptions import FieldDoesNotExist
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Crea un superusuario inicial usando variables de entorno."

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")

        if not username:
            raise CommandError("Falta DJANGO_SUPERUSER_USERNAME.")

        if not password:
            raise CommandError("Falta DJANGO_SUPERUSER_PASSWORD.")

        UserModel = get_user_model()
        username_field = UserModel.USERNAME_FIELD

        if UserModel._default_manager.filter(**{username_field: username}).exists():
            self.stdout.write(
                self.style.WARNING(
                    f"El superusuario '{username}' ya existe. No se creo un duplicado."
                )
            )
            return

        create_kwargs = {
            username_field: username,
            "password": password,
        }

        try:
            email_field = UserModel._meta.get_field("email")
        except FieldDoesNotExist:
            email_field = None

        if email_field:
            if not email and not (
                getattr(email_field, "blank", False) or getattr(email_field, "null", False)
            ):
                raise CommandError(
                    "Falta DJANGO_SUPERUSER_EMAIL y el modelo de usuario lo requiere."
                )
            create_kwargs["email"] = email

        UserModel._default_manager.create_superuser(**create_kwargs)

        self.stdout.write(
            self.style.SUCCESS(f"Superusuario '{username}' creado correctamente.")
        )
