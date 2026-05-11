from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


class AuthApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="test-pass",
            email="admin@example.com",
        )

    def test_login_devuelve_usuario_y_token_basic(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "admin", "password": "test-pass"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["username"], "admin")
        self.assertEqual(response.data["auth"]["type"], "basic")
        self.assertTrue(response.data["auth"]["token"])

    def test_login_rechaza_credenciales_invalidas(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "admin", "password": "incorrecta"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_me_requiere_autenticacion(self):
        anonymous = self.client.get("/api/auth/me/")

        self.client.force_authenticate(self.user)
        authenticated = self.client.get("/api/auth/me/")

        self.assertEqual(anonymous.status_code, 403)
        self.assertEqual(authenticated.status_code, 200)
        self.assertEqual(authenticated.data["username"], "admin")
