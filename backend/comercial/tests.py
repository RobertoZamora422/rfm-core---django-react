from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APITestCase

from negocio.models import Cliente, Paquete, TipoEvento

from .models import Cotizacion


class CotizacionModelTests(TestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(
            nombre="Cliente Test",
            telefono="+593 999999999",
        )
        self.tipo_evento = TipoEvento.objects.create(nombre="Boda")
        self.paquete = Paquete.objects.create(
            nombre="Alquiler base",
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            precio_por_persona=Decimal("0.00"),
        )

    def test_numero_invitados_debe_ser_positivo(self):
        cotizacion = Cotizacion(
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=0,
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            total_estimado=Decimal("1000.00"),
        )

        with self.assertRaises(ValidationError):
            cotizacion.save()


class CotizacionApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="test-pass",
        )
        self.client.force_authenticate(self.user)
        self.cliente = Cliente.objects.create(
            nombre="Cliente API",
            telefono="+593 999999111",
        )
        self.tipo_evento = TipoEvento.objects.create(nombre="Boda")
        self.paquete = Paquete.objects.create(
            nombre="Servicio completo",
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            precio_por_persona=Decimal("30.00"),
        )

    def test_crea_cotizacion(self):
        response = self.client.post(
            "/api/cotizaciones/",
            {
                "cliente": self.cliente.id,
                "tipo_evento": self.tipo_evento.id,
                "paquete": self.paquete.id,
                "fecha_tentativa": "2026-08-01",
                "numero_invitados": 80,
                "tipo_servicio": Paquete.TipoServicio.SERVICIO_COMPLETO,
                "estado": Cotizacion.Estado.NUEVA,
                "total_estimado": "2400.00",
                "observaciones": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["cliente_nombre"], "Cliente API")

    def test_rechaza_paquete_de_otro_tipo_servicio(self):
        paquete_alquiler = Paquete.objects.create(
            nombre="Alquiler",
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            precio_por_persona=Decimal("0.00"),
        )
        response = self.client.post(
            "/api/cotizaciones/",
            {
                "cliente": self.cliente.id,
                "tipo_evento": self.tipo_evento.id,
                "paquete": paquete_alquiler.id,
                "fecha_tentativa": "2026-08-01",
                "numero_invitados": 80,
                "tipo_servicio": Paquete.TipoServicio.SERVICIO_COMPLETO,
                "estado": Cotizacion.Estado.NUEVA,
                "total_estimado": "2400.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("paquete", response.data)

    def test_total_estimado_no_puede_ser_negativo(self):
        cotizacion = Cotizacion(
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=50,
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            total_estimado=Decimal("-1.00"),
        )

        with self.assertRaises(ValidationError):
            cotizacion.save()
