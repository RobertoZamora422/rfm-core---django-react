from datetime import date
from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APITestCase

from comercial.models import Cotizacion
from financiero.models import Contrato, CostoDirecto

from .models import Persona, NombrePersona, TipoEvento
from .validators import normalizar_nombre, normalizar_telefono


class PersonaIdentityTests(TestCase):
    def test_telefonos_ecuatorianos_equivalentes_comparten_identidad(self):
        values = ["0912345678", "+593 91 234 5678", "593912345678", "(091) 234-5678"]

        self.assertEqual(
            {normalizar_telefono(value) for value in values},
            {"593912345678"},
        )

    def test_restriccion_unica_impide_duplicados_y_no_fusiona_por_nombre(self):
        Persona.objects.create(nombre="Persona repetida", telefono="0912345678")
        Persona.objects.create(nombre="Persona repetida", telefono="0998765432")

        with self.assertRaises(ValidationError):
            Persona.objects.create(
                nombre="Otro nombre",
                telefono="+593 91 234 5678",
            )

        self.assertEqual(Persona.objects.count(), 2)

    def test_cambio_de_nombre_conserva_el_anterior_como_alias(self):
        persona = Persona.objects.create(nombre="Roberto Zamora", telefono="0912345678")
        from .persona_services import actualizar_persona

        actualizar_persona(persona, nombre="Robert Z")

        alias = NombrePersona.objects.get(persona=persona)
        self.assertEqual(alias.nombre, "Roberto Zamora")
        self.assertEqual(alias.nombre_normalizado, normalizar_nombre("Roberto Zamora"))


class PersonaApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="personas",
            password="test",
            is_staff=True,
        )
        self.client.force_authenticate(self.user)
        self.tipo_evento = TipoEvento.objects.create(nombre="Boda personas")

    def test_clasificacion_resumen_y_cancelados_conservan_cliente_historico(self):
        persona = Persona.objects.create(
            nombre="Interesada",
            telefono="0912345678",
            origen=Persona.Origen.FORMULARIO_PUBLICO,
        )

        interested = self.client.get(f"/api/personas/{persona.id}/")
        self.assertEqual(interested.data["clasificacion"], "interesado")

        Contrato.objects.create(
            persona=persona,
            tipo_evento=self.tipo_evento,
            tipo_servicio=Contrato.TipoServicio.ALQUILER,
            fecha_evento=date(2026, 10, 10),
            numero_invitados=50,
            valor_final=Decimal("1000.00"),
            estado_contrato=Contrato.EstadoContrato.CANCELADO,
        )

        customer = self.client.get(f"/api/personas/{persona.id}/")
        summary = self.client.get("/api/personas/resumen/")
        self.assertEqual(customer.data["clasificacion"], "cliente")
        self.assertEqual(customer.data["origen"], Persona.Origen.FORMULARIO_PUBLICO)
        self.assertEqual(summary.data, {"total": 1, "clientes": 1, "interesados": 0})

    def test_coincidencias_por_nombre_sugieren_y_por_telefono_identifican_exacta(self):
        persona = Persona.objects.create(nombre="Roberto Zamora", telefono="0912345678")
        Persona.objects.create(nombre="Roberto Silva", telefono="0998765432")

        name_response = self.client.get("/api/personas/coincidencias/", {"buscar": "Roberto"})
        phone_response = self.client.get(
            "/api/personas/coincidencias/",
            {"buscar": "+593 91 234 5678"},
        )

        self.assertEqual(len(name_response.data["sugerencias"]), 2)
        self.assertIsNone(name_response.data["exacta_telefono"])
        self.assertEqual(phone_response.data["exacta_telefono"]["id"], persona.id)

    def test_detalle_persona_incluye_alias_relaciones_resumen_e_historial(self):
        persona = Persona.objects.create(
            nombre="Roberto Zamora",
            telefono="0912345678",
            origen=Persona.Origen.FORMULARIO_PUBLICO,
        )
        NombrePersona.objects.create(
            persona=persona,
            nombre="Robert Z",
            origen=Persona.Origen.FORMULARIO_PUBLICO,
        )
        quote = Cotizacion.objects.create(
            persona=persona,
            tipo_evento=self.tipo_evento,
            fecha_tentativa=date(2026, 9, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            total_estimado=Decimal("1200.00"),
            origen=Cotizacion.Origen.FORMULARIO_PUBLICO,
        )
        contract = Contrato.objects.create(
            persona=persona,
            tipo_evento=self.tipo_evento,
            tipo_servicio=Contrato.TipoServicio.ALQUILER,
            fecha_evento=date(2026, 9, 1),
            numero_invitados=80,
            valor_final=Decimal("1200.00"),
        )

        response = self.client.get(f"/api/personas/{persona.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resumen_relacion"]["cotizaciones"], 1)
        self.assertEqual(response.data["resumen_relacion"]["contratos"], 1)
        self.assertEqual(
            {item["nombre"] for item in response.data["nombres_utilizados"]},
            {"Roberto Zamora", "Robert Z"},
        )
        self.assertEqual(response.data["cotizaciones_relacionadas"][0]["id"], quote.id)
        self.assertEqual(response.data["contratos_relacionados"][0]["id"], contract.id)
        self.assertTrue(any(item["tipo"] == "registro" for item in response.data["historial"]))


class PersonaConsolidationCommandTests(TestCase):
    def setUp(self):
        self.tipo_evento = TipoEvento.objects.create(nombre="Boda consolidación")
        self.canonical = Persona.objects.create(
            nombre="Roberto Zamora",
            telefono="0912345678",
            correo="principal@example.com",
            origen=Persona.Origen.FORMULARIO_PUBLICO,
        )
        self.duplicate = Persona.objects.create(
            nombre="Robert Z",
            telefono="0998765432",
            correo="alterno@example.com",
            observaciones="Prefiere contacto por WhatsApp.",
            origen=Persona.Origen.COTIZACION_MANUAL,
        )
        Persona.objects.filter(pk=self.duplicate.pk).update(
            telefono="+593 91 234 5678",
            telefono_normalizado="legacy-duplicate",
        )
        self.quote = Cotizacion.objects.create(
            persona=self.duplicate,
            tipo_evento=self.tipo_evento,
            fecha_tentativa=date(2026, 11, 1),
            numero_invitados=40,
            tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            total_estimado=Decimal("800.00"),
        )
        self.contract = Contrato.objects.create(
            persona=self.duplicate,
            tipo_evento=self.tipo_evento,
            tipo_servicio=Contrato.TipoServicio.ALQUILER,
            fecha_evento=date(2026, 11, 1),
            numero_invitados=40,
            valor_final=Decimal("800.00"),
        )
        self.cost = CostoDirecto.objects.create(
            contrato=self.contract,
            concepto="Catering",
            valor=Decimal("200.00"),
            fecha=date(2026, 11, 1),
        )

    def test_dry_run_reporta_sin_modificar(self):
        output = StringIO()
        call_command("consolidar_personas_duplicadas", "--dry-run", stdout=output)

        self.assertEqual(Persona.objects.count(), 2)
        self.assertIn("1 grupos, 1 duplicados", output.getvalue())
        self.assertIn("1 cotizaciones", output.getvalue())
        self.assertIn("1 contratos", output.getvalue())

    def test_ejecucion_reasigna_relaciones_preserva_alias_y_costos(self):
        call_command("consolidar_personas_duplicadas", "--execute", stdout=StringIO())

        self.assertEqual(Persona.objects.count(), 1)
        self.quote.refresh_from_db()
        self.contract.refresh_from_db()
        self.cost.refresh_from_db()
        self.canonical.refresh_from_db()
        self.assertEqual(self.quote.persona_id, self.canonical.id)
        self.assertEqual(self.contract.persona_id, self.canonical.id)
        self.assertEqual(self.cost.contrato_id, self.contract.id)
        self.assertTrue(
            NombrePersona.objects.filter(persona=self.canonical, nombre="Robert Z").exists()
        )
        self.assertIn("alterno@example.com", self.canonical.observaciones)
        self.assertIn("Prefiere contacto por WhatsApp", self.canonical.observaciones)
