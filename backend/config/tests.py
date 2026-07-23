from django.test import TestCase, override_settings


@override_settings(ALLOWED_HOSTS=["testserver"])
class HealthCheckTests(TestCase):
    def test_health_check_returns_ok(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "service": "rfm-core-backend"},
        )

    def test_readiness_check_confirma_conexion_a_base_de_datos(self):
        response = self.client.get("/api/ready/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ready", "service": "rfm-core-backend"},
        )

    def test_backend_root_returns_useful_json(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["service"], "RFM Core API")
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["health"], "/api/health/")
        self.assertEqual(data["readiness"], "/api/ready/")
        self.assertEqual(
            data["public_precotizacion"],
            "http://localhost:5173/pre-cotizacion",
        )
        self.assertEqual(data["frontend"], "http://localhost:5173")

    @override_settings(FRONTEND_PUBLIC_URL="https://rfm-core-frontend.onrender.com")
    def test_backend_root_usa_frontend_public_url_configurable(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["frontend"], "https://rfm-core-frontend.onrender.com")
        self.assertEqual(
            data["public_precotizacion"],
            "https://rfm-core-frontend.onrender.com/pre-cotizacion",
        )
