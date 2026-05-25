import os
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


class CreateAdminFromEnvCommandTests(TestCase):
    def test_crea_superusuario_si_no_existe(self):
        output = StringIO()
        env = {
            "DJANGO_SUPERUSER_USERNAME": "admin-prod",
            "DJANGO_SUPERUSER_EMAIL": "admin@example.com",
            "DJANGO_SUPERUSER_PASSWORD": "clave-segura",
        }

        with patch.dict(os.environ, env, clear=True):
            call_command("create_admin_from_env", stdout=output)

        user = get_user_model().objects.get(username="admin-prod")
        self.assertEqual(user.email, "admin@example.com")
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.check_password("clave-segura"))
        self.assertIn("creado correctamente", output.getvalue())
        self.assertNotIn("clave-segura", output.getvalue())

    def test_no_duplica_si_el_usuario_ya_existe(self):
        existing = get_user_model().objects.create_superuser(
            username="admin-prod",
            email="original@example.com",
            password="clave-original",
        )
        output = StringIO()
        env = {
            "DJANGO_SUPERUSER_USERNAME": "admin-prod",
            "DJANGO_SUPERUSER_EMAIL": "nuevo@example.com",
            "DJANGO_SUPERUSER_PASSWORD": "clave-nueva",
        }

        with patch.dict(os.environ, env, clear=True):
            call_command("create_admin_from_env", stdout=output)

        self.assertEqual(
            get_user_model().objects.filter(username="admin-prod").count(),
            1,
        )
        existing.refresh_from_db()
        self.assertEqual(existing.email, "original@example.com")
        self.assertTrue(existing.check_password("clave-original"))
        self.assertIn("ya existe", output.getvalue())
        self.assertNotIn("clave-nueva", output.getvalue())

    def test_falla_si_faltan_variables_obligatorias(self):
        with patch.dict(
            os.environ,
            {"DJANGO_SUPERUSER_PASSWORD": "clave-segura"},
            clear=True,
        ):
            with self.assertRaisesMessage(CommandError, "DJANGO_SUPERUSER_USERNAME"):
                call_command("create_admin_from_env")

        with patch.dict(
            os.environ,
            {"DJANGO_SUPERUSER_USERNAME": "admin-prod"},
            clear=True,
        ):
            with self.assertRaisesMessage(CommandError, "DJANGO_SUPERUSER_PASSWORD"):
                call_command("create_admin_from_env")


class AuthApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="test-pass",
            email="admin@example.com",
        )

    def test_login_devuelve_usuario_y_token(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "admin", "password": "test-pass"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["username"], "admin")
        self.assertEqual(response.data["auth"]["type"], "token")
        self.assertTrue(response.data["auth"]["token"])
        self.assertTrue(Token.objects.filter(user=self.user).exists())

    def test_login_rechaza_credenciales_invalidas(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "admin", "password": "incorrecta"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_me_requiere_autenticacion(self):
        anonymous = self.client.get("/api/auth/me/")

        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        authenticated = self.client.get("/api/auth/me/")

        self.assertEqual(anonymous.status_code, 401)
        self.assertEqual(authenticated.status_code, 200)
        self.assertEqual(authenticated.data["username"], "admin")

    def test_logout_invalida_token_actual(self):
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.post("/api/auth/logout/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Token.objects.filter(key=token.key).exists())
