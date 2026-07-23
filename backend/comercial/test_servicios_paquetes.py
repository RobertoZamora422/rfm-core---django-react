from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from financiero.models import Contrato
from negocio.models import (
    BeneficioPaquete,
    ConfiguracionNegocio,
    Paquete,
    Persona,
    TipoEvento,
)

from .models import Cotizacion


class ServiciosPaquetesDomainTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="servicios-paquetes",
            password="test-pass",
        )
        self.client.force_authenticate(self.user)
        self.persona = Persona.objects.create(
            nombre="Persona Servicios",
            telefono="0991112233",
        )
        self.tipo_evento = TipoEvento.objects.create(nombre="Boda servicios")
        self.configuracion = ConfiguracionNegocio.objects.create(
            nombre_negocio="Rancho Flor María",
            tarifa_base_alquiler=Decimal("1000.00"),
            invitados_incluidos_alquiler=50,
            costo_invitado_adicional=Decimal("10.00"),
            whatsapp_negocio="0991234567",
        )
        self.paquete = Paquete.objects.create(
            nombre="Premium 18",
            categoria=Paquete.Categoria.PREMIUM,
            orden=2,
            resumen_corto="Una experiencia completa.",
            etiqueta_comercial="Más elegido",
            destacado=True,
            precio_por_persona=Decimal("18.00"),
        )
        self.beneficio_principal = BeneficioPaquete.objects.create(
            paquete=self.paquete,
            tipo=BeneficioPaquete.Tipo.PRINCIPAL,
            titulo="Catering completo",
            detalle="Proteína, arroz y ensalada.",
            orden=1,
        )
        self.condicion = BeneficioPaquete.objects.create(
            paquete=self.paquete,
            tipo=BeneficioPaquete.Tipo.CONDICION,
            titulo="Decoración sin costo",
            detalle="Aplica desde 125 invitados.",
            minimo_invitados=125,
            orden=2,
        )
        self.beneficio_comun = BeneficioPaquete.objects.create(
            paquete=None,
            tipo=BeneficioPaquete.Tipo.DETALLE,
            titulo="Local iluminado",
            orden=1,
        )

    def public_payload(self, *, telefono, tipo_servicio, paquete=None):
        payload = {
            "nombre_persona": "Persona Pública",
            "telefono_persona": telefono,
            "tipo_evento": self.tipo_evento.id,
            "fecha_tentativa": "2026-10-20",
            "numero_invitados": 80,
            "tipo_servicio": tipo_servicio,
        }
        if paquete is not None:
            payload["paquete"] = paquete
        return payload

    def confirmar(self, cotizacion):
        cotizacion.estado = Cotizacion.Estado.CONFIRMADA
        cotizacion.save(update_fields=["estado", "actualizado_en"])

    def test_cotizacion_alquiler_sin_paquete(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            self.public_payload(
                telefono="0991112201",
                tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["cotizacion"]["paquete"])
        self.assertEqual(response.data["cotizacion"]["tipo_servicio"], "alquiler")
        self.assertEqual(response.data["cotizacion"]["total_estimado"], "1300.00")
        self.assertEqual(
            response.data["cotizacion"]["oferta_snapshot"]["alquiler"]["tarifa_base"],
            "1000.00",
        )

    def test_cotizacion_servicio_completo_con_paquete(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            self.public_payload(
                telefono="0991112202",
                tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
                paquete=self.paquete.id,
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["cotizacion"]["paquete"], self.paquete.id)
        self.assertEqual(response.data["cotizacion"]["total_estimado"], "1440.00")
        self.assertEqual(
            response.data["cotizacion"]["oferta_snapshot"]["paquete"]["nombre"],
            "Premium 18",
        )

    def test_cotizacion_servicio_completo_sin_paquete_es_una_oportunidad_valida(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            self.public_payload(
                telefono="0991112205",
                tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["cotizacion"]["paquete"])
        self.assertIsNone(response.data["cotizacion"]["total_estimado"])
        self.assertEqual(
            response.data["cotizacion"]["paquete_nombre"],
            "Por definir",
        )
        self.assertIn(
            "catalogo",
            response.data["cotizacion"]["oferta_snapshot"],
        )

    def test_cotizacion_no_estoy_seguro_devuelve_comparacion_resumida(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            self.public_payload(
                telefono="0991112203",
                tipo_servicio=Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO,
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["cotizacion"]["tipo_servicio"],
            Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO,
        )
        self.assertNotIn("paquetes", response.data["calculo"]["servicio_completo"])
        self.assertEqual(
            response.data["calculo"]["servicio_completo"]["categorias"][0][
                "categoria"
            ],
            "premium",
        )
        self.assertIn(
            "alternativa_alquiler",
            response.data["cotizacion"]["oferta_snapshot"],
        )
        self.assertIn(
            "comparacion",
            response.data["cotizacion"]["oferta_snapshot"],
        )

    def test_contrato_manual_de_alquiler(self):
        response = self.client.post(
            "/api/contratos/",
            {
                "persona": self.persona.id,
                "tipo_evento": self.tipo_evento.id,
                "tipo_servicio": Contrato.TipoServicio.ALQUILER,
                "paquete": None,
                "fecha_evento": "2026-10-20",
                "numero_invitados": 80,
                "valor_final": "1300.00",
                "monto_abonado": "0.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["paquete"])
        self.assertEqual(response.data["paquete_nombre"], "Alquiler del local")
        self.assertEqual(response.data["oferta_snapshot"]["tipo_servicio"], "alquiler")

    def test_contrato_manual_de_servicio_completo(self):
        response = self.client.post(
            "/api/contratos/",
            {
                "persona": self.persona.id,
                "tipo_evento": self.tipo_evento.id,
                "tipo_servicio": Contrato.TipoServicio.SERVICIO_COMPLETO,
                "paquete": self.paquete.id,
                "fecha_evento": "2026-10-20",
                "numero_invitados": 80,
                "valor_final": "1440.00",
                "monto_abonado": "200.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["paquete"], self.paquete.id)
        self.assertEqual(
            response.data["oferta_snapshot"]["paquete"]["precio_por_persona"],
            "18.00",
        )

    def test_conversion_de_alquiler(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            fecha_tentativa=date(2026, 10, 20),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("1300.00"),
        )

        response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["contrato"]["tipo_servicio"], "alquiler")
        self.assertIsNone(response.data["contrato"]["paquete"])

    def test_conversion_de_servicio_completo(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 10, 20),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("1440.00"),
        )

        response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["contrato"]["tipo_servicio"],
            Contrato.TipoServicio.SERVICIO_COMPLETO,
        )
        self.assertEqual(response.data["contrato"]["paquete"], self.paquete.id)

    def test_conversion_no_estoy_seguro_exige_resolucion(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            fecha_tentativa=date(2026, 10, 20),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("1300.00"),
        )

        pendiente = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )
        resuelta = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {
                "tipo_servicio": Contrato.TipoServicio.SERVICIO_COMPLETO,
                "paquete": self.paquete.id,
                "valor_final": "1440.00",
            },
            format="json",
        )

        self.assertEqual(pendiente.status_code, 400)
        self.assertIn("tipo_servicio", pendiente.data)
        self.assertEqual(resuelta.status_code, 201)
        self.assertEqual(
            resuelta.data["contrato"]["tipo_servicio"],
            Contrato.TipoServicio.SERVICIO_COMPLETO,
        )

    def test_conversion_no_estoy_seguro_a_alquiler_descarta_paquete_orientativo(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 10, 20),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("1300.00"),
        )

        response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {"tipo_servicio": Contrato.TipoServicio.ALQUILER},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["contrato"]["tipo_servicio"], "alquiler")
        self.assertIsNone(response.data["contrato"]["paquete"])

    def test_rechaza_alquiler_con_paquete_y_servicio_sin_paquete(self):
        alquiler = self.client.post(
            "/api/contratos/",
            {
                "persona": self.persona.id,
                "tipo_evento": self.tipo_evento.id,
                "tipo_servicio": Contrato.TipoServicio.ALQUILER,
                "paquete": self.paquete.id,
                "fecha_evento": "2026-10-20",
                "numero_invitados": 80,
                "valor_final": "1300.00",
                "monto_abonado": "0.00",
            },
            format="json",
        )
        servicio = self.client.post(
            "/api/contratos/",
            {
                "persona": self.persona.id,
                "tipo_evento": self.tipo_evento.id,
                "tipo_servicio": Contrato.TipoServicio.SERVICIO_COMPLETO,
                "paquete": None,
                "fecha_evento": "2026-10-20",
                "numero_invitados": 80,
                "valor_final": "1440.00",
                "monto_abonado": "0.00",
            },
            format="json",
        )

        self.assertEqual(alquiler.status_code, 400)
        self.assertIn("paquete", alquiler.data)
        self.assertEqual(servicio.status_code, 400)
        self.assertIn("paquete", servicio.data)

    def test_conserva_precio_beneficios_y_condiciones_historicas(self):
        response = self.client.post(
            "/api/cotizaciones/",
            {
                "persona": self.persona.id,
                "tipo_evento": self.tipo_evento.id,
                "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
                "paquete": self.paquete.id,
                "fecha_tentativa": "2026-10-20",
                "numero_invitados": 130,
                "total_estimado": "2340.00",
            },
            format="json",
        )
        cotizacion = Cotizacion.objects.get(pk=response.data["id"])
        self.confirmar(cotizacion)

        self.paquete.nombre = "Premium modificado"
        self.paquete.precio_por_persona = Decimal("99.00")
        self.paquete.save()
        self.beneficio_principal.titulo = "Beneficio modificado"
        self.beneficio_principal.save()
        self.condicion.delete()

        detalle = self.client.patch(
            f"/api/cotizaciones/{cotizacion.id}/",
            {"total_estimado": "2400.00"},
            format="json",
        )
        conversion = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )
        contrato_editado = self.client.patch(
            f"/api/contratos/{conversion.data['contrato']['id']}/",
            {"valor_final": "2400.00"},
            format="json",
        )
        snapshot = detalle.data["oferta_snapshot"]["paquete"]
        beneficios = {item["titulo"]: item for item in snapshot["beneficios"]}

        self.assertEqual(snapshot["nombre"], "Premium 18")
        self.assertEqual(snapshot["precio_por_persona"], "18.00")
        self.assertIn("Catering completo", beneficios)
        self.assertEqual(
            beneficios["Decoración sin costo"]["minimo_invitados"],
            125,
        )
        self.assertEqual(
            conversion.data["contrato"]["oferta_snapshot"]["paquete"]["nombre"],
            "Premium 18",
        )
        self.assertEqual(
            contrato_editado.data["oferta_snapshot"]["paquete"]["nombre"],
            "Premium 18",
        )
        self.assertIn(
            "Catering completo",
            {
                item["titulo"]
                for item in contrato_editado.data["oferta_snapshot"]["paquete"][
                    "beneficios"
                ]
            },
        )

    def test_conserva_parametros_de_alquiler_al_cambiar_configuracion(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            self.public_payload(
                telefono="0991112204",
                tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            ),
            format="json",
        )
        cotizacion = Cotizacion.objects.get(pk=response.data["cotizacion"]["id"])
        self.confirmar(cotizacion)
        self.configuracion.tarifa_base_alquiler = Decimal("2500.00")
        self.configuracion.costo_invitado_adicional = Decimal("25.00")
        self.configuracion.save()

        self.client.force_authenticate(self.user)
        conversion = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )
        alquiler = conversion.data["contrato"]["oferta_snapshot"]["alquiler"]
        contrato_editado = self.client.patch(
            f"/api/contratos/{conversion.data['contrato']['id']}/",
            {"numero_invitados": 90, "valor_final": "1400.00"},
            format="json",
        )
        alquiler_editado = contrato_editado.data["oferta_snapshot"]["alquiler"]

        self.assertEqual(conversion.status_code, 201)
        self.assertEqual(alquiler["tarifa_base"], "1000.00")
        self.assertEqual(alquiler["costo_invitado_adicional"], "10.00")
        self.assertEqual(alquiler["invitados_adicionales"], 30)
        self.assertEqual(alquiler_editado["tarifa_base"], "1000.00")
        self.assertEqual(alquiler_editado["invitados_adicionales"], 40)

    def test_alquiler_se_presenta_en_listado_detalle_y_reporte(self):
        contrato = Contrato.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            tipo_servicio=Contrato.TipoServicio.ALQUILER,
            paquete=None,
            fecha_evento=date(2026, 10, 20),
            numero_invitados=80,
            valor_final=Decimal("1300.00"),
            monto_abonado=Decimal("0.00"),
        )

        listado = self.client.get("/api/contratos/")
        detalle = self.client.get(f"/api/contratos/{contrato.id}/")
        reporte = self.client.get(
            "/api/reportes/eventos/",
            {"desde": "2026-10-01", "hasta": "2026-10-31"},
        )

        self.assertEqual(listado.data[0]["tipo_servicio"], "alquiler")
        self.assertEqual(listado.data[0]["paquete_nombre"], "Alquiler del local")
        self.assertEqual(detalle.data["paquete_nombre"], "Alquiler del local")
        self.assertEqual(
            reporte.data["eventos"][0]["paquete_nombre"],
            "Alquiler del local",
        )

    def test_catalogo_publico_calcula_totales_y_no_duplica_incluidos_comunes(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(
            "/api/public/paquetes/",
            {
                "numero_invitados": 100,
                "nivel_experiencia": "equilibrado",
                "entretenimiento": "importante",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["titulo"] for item in response.data["incluidos_en_todos"]],
            ["Local iluminado"],
        )
        self.assertEqual(response.data["paquetes"][0]["total_estimado"], "1800.00")
        self.assertNotIn(
            "Local iluminado",
            [item["titulo"] for item in response.data["paquetes"][0]["beneficios"]],
        )
        self.assertEqual(response.data["recomendados"], [self.paquete.id])
