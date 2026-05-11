from decimal import Decimal
from io import StringIO

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase

from comercial.models import Cotizacion
from financiero.models import Contrato, CostoDirecto, GastoFijoMensual
from .models import Cliente, ConfiguracionNegocio, Paquete, TipoEvento


class NegocioModelTests(TestCase):
    def test_cliente_requiere_telefono_valido(self):
        cliente = Cliente(nombre="Cliente Test", telefono="abc")

        with self.assertRaises(ValidationError):
            cliente.save()

    def test_tipo_evento_no_duplica_nombre(self):
        TipoEvento.objects.create(nombre="Boda")

        with self.assertRaises(ValidationError):
            TipoEvento.objects.create(nombre="Boda")

    def test_servicio_completo_requiere_precio_por_persona(self):
        paquete = Paquete(
            nombre="Paquete completo",
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            precio_por_persona=Decimal("0.00"),
        )

        with self.assertRaises(ValidationError):
            paquete.save()

    def test_configuracion_negocio_activa_es_unica(self):
        ConfiguracionNegocio.objects.create(
            nombre_negocio="RFM",
            tarifa_base_alquiler=Decimal("1000.00"),
            invitados_incluidos_alquiler=50,
            costo_invitado_adicional=Decimal("10.00"),
            capacidad_maxima=200,
            activo=True,
        )

        with self.assertRaises(ValidationError):
            ConfiguracionNegocio.objects.create(
                nombre_negocio="RFM secundaria",
                tarifa_base_alquiler=Decimal("1200.00"),
                invitados_incluidos_alquiler=60,
                costo_invitado_adicional=Decimal("12.00"),
                capacidad_maxima=220,
                activo=True,
            )


class SeedCommandTests(TestCase):
    def call_command(self, name):
        output = StringIO()
        call_command(name, stdout=output)
        return output.getvalue()

    def test_seed_base_es_idempotente(self):
        self.call_command("seed_base")
        self.call_command("seed_base")

        self.assertEqual(TipoEvento.objects.count(), 5)
        self.assertEqual(Paquete.objects.count(), 3)
        self.assertEqual(ConfiguracionNegocio.objects.filter(activo=True).count(), 1)

    def test_seed_demo_es_idempotente(self):
        self.call_command("seed_demo")
        self.call_command("seed_demo")

        self.assertEqual(Cliente.objects.filter(es_demo=True).count(), 6)
        self.assertEqual(Cotizacion.objects.filter(es_demo=True).count(), 6)
        self.assertEqual(Contrato.objects.filter(es_demo=True).count(), 2)
        self.assertEqual(CostoDirecto.objects.filter(es_demo=True).count(), 3)
        self.assertEqual(GastoFijoMensual.objects.filter(es_demo=True).count(), 2)

    def test_clear_demo_no_elimina_datos_reales(self):
        self.call_command("seed_demo")
        Cliente.objects.create(
            nombre="Cliente Real",
            telefono="+593 988888888",
            correo="real@example.com",
        )

        self.call_command("clear_demo")

        self.assertEqual(Cliente.objects.filter(es_demo=True).count(), 0)
        self.assertTrue(Cliente.objects.filter(nombre="Cliente Real").exists())
        self.assertEqual(TipoEvento.objects.count(), 5)
        self.assertEqual(Paquete.objects.count(), 3)


class NegocioApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="test-pass",
        )
        self.client.force_authenticate(self.user)

    def test_cliente_crud_basico(self):
        response = self.client.post(
            "/api/clientes/",
            {
                "nombre": "Cliente API",
                "telefono": "+593 999999111",
                "correo": "cliente.api@example.com",
                "observaciones": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["nombre"], "Cliente API")

        list_response = self.client.get("/api/clientes/")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)

    def test_cliente_api_valida_telefono(self):
        response = self.client.post(
            "/api/clientes/",
            {
                "nombre": "Cliente API",
                "telefono": "telefono-invalido",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("telefono", response.data)

    def test_configuracion_activa_es_unica_en_api(self):
        payload = {
            "nombre_negocio": "Rancho Flor María",
            "tarifa_base_alquiler": "1200.00",
            "invitados_incluidos_alquiler": 80,
            "costo_invitado_adicional": "12.00",
            "capacidad_maxima": 250,
            "activo": True,
        }

        first = self.client.post("/api/configuracion-negocio/", payload, format="json")
        second = self.client.post(
            "/api/configuracion-negocio/",
            {**payload, "nombre_negocio": "Otra configuración"},
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 400)
        self.assertIn("activo", second.data)
        self.assertEqual(ConfiguracionNegocio.objects.filter(activo=True).count(), 1)
