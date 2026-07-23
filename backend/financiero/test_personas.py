from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from negocio.models import Persona, TipoEvento

from .models import Contrato


class DirectContractPersonFlowTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="contracts-person", password="test")
        self.client.force_authenticate(self.user)
        self.tipo_evento = TipoEvento.objects.create(nombre="Evento contrato")

    def contract_payload(self):
        return {
            "tipo_evento": self.tipo_evento.id,
            "tipo_servicio": Contrato.TipoServicio.ALQUILER,
            "fecha_evento": "2026-12-10",
            "numero_invitados": 60,
            "valor_final": "1500.00",
            "monto_abonado": "300.00",
        }

    def test_persona_nueva_desde_contrato_nace_como_cliente_y_origen_directo(self):
        response = self.client.post(
            "/api/contratos/",
            {
                **self.contract_payload(),
                "persona_nueva": {
                    "nombre": "Persona directa",
                    "telefono": "0912345678",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        persona = Persona.objects.get()
        detail = self.client.get(f"/api/personas/{persona.id}/")
        self.assertEqual(persona.origen, Persona.Origen.CONTRATO_DIRECTO)
        self.assertEqual(detail.data["clasificacion"], "cliente")

    def test_interesado_existente_se_reutiliza_y_conserva_origen(self):
        persona = Persona.objects.create(
            nombre="Interesado público",
            telefono="0912345678",
            origen=Persona.Origen.FORMULARIO_PUBLICO,
        )

        response = self.client.post(
            "/api/contratos/",
            {**self.contract_payload(), "persona": persona.id},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        persona.refresh_from_db()
        self.assertEqual(Persona.objects.count(), 1)
        self.assertEqual(persona.origen, Persona.Origen.FORMULARIO_PUBLICO)
        self.assertEqual(persona.contratos.count(), 1)

    def test_error_posterior_revierte_persona_nueva(self):
        with patch("financiero.serializers.Contrato.objects.create", side_effect=RuntimeError("fallo")):
            with self.assertRaises(RuntimeError):
                self.client.post(
                    "/api/contratos/",
                    {
                        **self.contract_payload(),
                        "persona_nueva": {"nombre": "Temporal", "telefono": "0912345678"},
                    },
                    format="json",
                )

        self.assertEqual(Persona.objects.count(), 0)
        self.assertEqual(Contrato.objects.count(), 0)
