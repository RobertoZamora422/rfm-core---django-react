from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from negocio.models import Cliente, ConfiguracionNegocio, NombrePersona, TipoEvento

from .models import Cotizacion


class PublicPersonFlowTests(APITestCase):
    def setUp(self):
        self.tipo_evento = TipoEvento.objects.create(nombre="Evento público")
        ConfiguracionNegocio.objects.create(
            nombre_negocio="RFM",
            tarifa_base_alquiler=Decimal("1000.00"),
            invitados_incluidos_alquiler=50,
            costo_invitado_adicional=Decimal("10.00"),
            whatsapp_negocio="0991234567",
        )

    def payload(self, nombre, telefono):
        return {
            "nombre": nombre,
            "telefono": telefono,
            "tipo_evento": self.tipo_evento.id,
            "fecha_tentativa": "2026-12-10",
            "numero_invitados": 60,
            "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
        }

    def test_dos_precotizaciones_mismo_telefono_reutilizan_persona_y_guardan_alias(self):
        first = self.client.post(
            "/api/pre-cotizacion/",
            self.payload("Roberto Zamora", "0912345678"),
            format="json",
        )
        second = self.client.post(
            "/api/pre-cotizacion/",
            self.payload("Robert Z", "+593 91 234 5678"),
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(Cliente.objects.count(), 1)
        persona = Cliente.objects.get()
        self.assertEqual(persona.origen, Cliente.Origen.FORMULARIO_PUBLICO)
        self.assertEqual(persona.cotizaciones.count(), 2)
        self.assertTrue(NombrePersona.objects.filter(cliente=persona, nombre="Robert Z").exists())
        self.assertNotIn("persona_existente", second.data)

    def test_mismo_nombre_con_telefonos_distintos_no_fusiona_personas(self):
        self.client.post(
            "/api/pre-cotizacion/",
            self.payload("Nombre compartido", "0912345678"),
            format="json",
        )
        self.client.post(
            "/api/pre-cotizacion/",
            self.payload("Nombre compartido", "0998765432"),
            format="json",
        )

        self.assertEqual(Cliente.objects.count(), 2)


class ManualQuotePersonFlowTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="quotes-person", password="test")
        self.client.force_authenticate(self.user)
        self.tipo_evento = TipoEvento.objects.create(nombre="Evento manual")

    def quote_payload(self):
        return {
            "tipo_evento": self.tipo_evento.id,
            "fecha_tentativa": "2026-12-10",
            "numero_invitados": 60,
            "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
            "total_estimado": "1200.00",
        }

    def test_crea_persona_y_cotizacion_en_una_operacion(self):
        response = self.client.post(
            "/api/cotizaciones/",
            {
                **self.quote_payload(),
                "persona_nueva": {
                    "nombre": "Interesada manual",
                    "telefono": "0912345678",
                    "correo": "manual@example.com",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        persona = Cliente.objects.get()
        quote = Cotizacion.objects.get()
        self.assertEqual(persona.origen, Cliente.Origen.COTIZACION_MANUAL)
        self.assertEqual(quote.origen, Cotizacion.Origen.COTIZACION_MANUAL)
        self.assertEqual(quote.cliente_id, persona.id)
        self.assertIn("creado_en", response.data)
        self.assertIn("actualizado_en", response.data)

    def test_reutiliza_persona_existente_y_rechaza_persona_nueva_duplicada(self):
        persona = Cliente.objects.create(nombre="Existente", telefono="0912345678")
        reused = self.client.post(
            "/api/cotizaciones/",
            {**self.quote_payload(), "cliente": persona.id},
            format="json",
        )
        duplicate = self.client.post(
            "/api/cotizaciones/",
            {
                **self.quote_payload(),
                "persona_nueva": {"nombre": "Otro", "telefono": "+593 91 234 5678"},
            },
            format="json",
        )

        self.assertEqual(reused.status_code, 201)
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(Cliente.objects.count(), 1)

    def test_error_posterior_revierte_persona_nueva(self):
        with patch("comercial.serializers.Cotizacion.objects.create", side_effect=RuntimeError("fallo")):
            with self.assertRaises(RuntimeError):
                self.client.post(
                    "/api/cotizaciones/",
                    {
                        **self.quote_payload(),
                        "persona_nueva": {"nombre": "Temporal", "telefono": "0912345678"},
                    },
                    format="json",
                )

        self.assertEqual(Cliente.objects.count(), 0)
