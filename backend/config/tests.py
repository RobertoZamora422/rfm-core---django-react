from django.test import SimpleTestCase, override_settings


@override_settings(ALLOWED_HOSTS=["testserver"])
class HealthCheckTests(SimpleTestCase):
    def test_health_check_returns_ok(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "service": "rfm-core-backend"},
        )

    def test_backend_root_returns_useful_json(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["service"], "RFM Core API")
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["health"], "/api/health/")
        self.assertEqual(data["public_precotizacion"], "http://localhost:5173/pre-cotizacion")
