from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
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
        self.addCleanup(cache.clear)
        self.user = get_user_model().objects.create_user(
            username="servicios-paquetes",
            password="test-pass",
            is_staff=True,
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
            "fecha_tentativa": (timezone.localdate() + timedelta(days=30)).isoformat(),
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

    def test_conversion_confirmada_de_servicio_completo_sin_paquete_se_rechaza(self):
        self.client.force_authenticate(user=None)
        solicitud = self.client.post(
            "/api/pre-cotizacion/",
            self.public_payload(
                telefono="0991112206",
                tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            ),
            format="json",
        )
        self.assertEqual(solicitud.status_code, 201, solicitud.data)
        cotizacion_id = solicitud.data["cotizacion"]["id"]

        self.client.force_authenticate(self.user)
        confirmacion = self.client.post(
            f"/api/cotizaciones/{cotizacion_id}/cambiar-estado/",
            {"estado": Cotizacion.Estado.CONFIRMADA},
            format="json",
        )
        self.assertEqual(confirmacion.status_code, 200, confirmacion.data)
        self.assertIsNone(confirmacion.data["paquete"])

        conversion = self.client.post(
            f"/api/cotizaciones/{cotizacion_id}/convertir-contrato/",
            {"valor_final": "1500.00"},
            format="json",
        )

        self.assertEqual(conversion.status_code, 400, conversion.data)
        self.assertEqual(set(conversion.data), {"paquete"})
        self.assertFalse(Contrato.objects.exists())
        cotizacion = Cotizacion.objects.get(pk=cotizacion_id)
        self.assertEqual(cotizacion.estado, Cotizacion.Estado.CONFIRMADA)
        self.assertIsNone(cotizacion.paquete_id)

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
        self.assertEqual(response.status_code, 201, response.data)
        paquete_historico = response.data["oferta_snapshot"]["paquete"]
        self.assertEqual(paquete_historico["nombre"], "Premium 18")
        self.assertEqual(paquete_historico["precio_por_persona"], "18.00")
        beneficios = {item["titulo"]: item for item in paquete_historico["beneficios"]}
        self.assertIn("Catering completo", beneficios)
        self.assertEqual(beneficios["Decoración sin costo"]["minimo_invitados"], 125)
        self.assertEqual(
            paquete_historico["incluidos_en_todos"][0]["titulo"],
            "Local iluminado",
        )
        cotizacion = Cotizacion.objects.get(pk=response.data["id"])
        self.confirmar(cotizacion)

        self.paquete.nombre = "Premium modificado"
        self.paquete.precio_por_persona = Decimal("99.00")
        self.paquete.save()
        self.beneficio_principal.titulo = "Beneficio modificado"
        self.beneficio_principal.save()
        self.condicion.delete()
        self.beneficio_comun.activo = False
        self.beneficio_comun.save()

        detalle = self.client.patch(
            f"/api/cotizaciones/{cotizacion.id}/",
            {"total_estimado": "2400.00"},
            format="json",
        )
        self.assertEqual(detalle.status_code, 200, detalle.data)
        self.assertEqual(detalle.data["oferta_snapshot"]["paquete"], paquete_historico)
        conversion = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )
        self.assertEqual(conversion.status_code, 201, conversion.data)
        contrato = conversion.data["contrato"]
        self.assertEqual(contrato["oferta_snapshot"]["paquete"], paquete_historico)
        self.assertEqual(contrato["valor_final"], "2400.00")
        contrato_editado = self.client.patch(
            f"/api/contratos/{contrato['id']}/",
            {"numero_invitados": 140, "valor_final": "2500.00"},
            format="json",
        )
        self.assertEqual(contrato_editado.status_code, 200, contrato_editado.data)
        self.assertEqual(contrato_editado.data["valor_final"], "2500.00")
        self.assertEqual(
            contrato_editado.data["oferta_snapshot"]["paquete"],
            {**paquete_historico, "total_estimado": "2520.00"},
        )
        self.tipo_evento.nombre = "Tipo de evento renombrado QA"
        self.tipo_evento.save()
        for ruta, snapshot in (
            (f"/api/cotizaciones/{cotizacion.id}/", detalle.data["oferta_snapshot"]),
            (f"/api/contratos/{contrato['id']}/", contrato_editado.data["oferta_snapshot"]),
        ):
            with self.subTest(ruta=ruta):
                lectura = self.client.get(ruta)
                self.assertEqual(lectura.status_code, 200, lectura.data)
                self.assertEqual(lectura.data["tipo_evento_nombre"], self.tipo_evento.nombre)
                self.assertEqual(lectura.data["oferta_snapshot"], snapshot)
        cotizacion.refresh_from_db()
        self.assertEqual(cotizacion.oferta_snapshot, detalle.data["oferta_snapshot"])

    def test_conserva_parametros_de_alquiler_al_cambiar_configuracion(self):
        self.beneficio_comun.tipo = BeneficioPaquete.Tipo.PRINCIPAL
        self.beneficio_comun.save()
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            self.public_payload(
                telefono="0991112204",
                tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        snapshot_historico = response.data["cotizacion"]["oferta_snapshot"]
        alquiler_historico = snapshot_historico["alquiler"]
        self.assertEqual(alquiler_historico["tarifa_base"], "1000.00")
        self.assertEqual(alquiler_historico["invitados_incluidos"], 50)
        self.assertEqual(alquiler_historico["costo_invitado_adicional"], "10.00")
        self.assertEqual(alquiler_historico["invitados_adicionales"], 30)
        self.assertEqual(alquiler_historico["beneficios_principales"][0]["titulo"], "Local iluminado")
        cotizacion = Cotizacion.objects.get(pk=response.data["cotizacion"]["id"])
        self.confirmar(cotizacion)
        self.configuracion.tarifa_base_alquiler = Decimal("2500.00")
        self.configuracion.invitados_incluidos_alquiler = 60
        self.configuracion.costo_invitado_adicional = Decimal("25.00")
        self.configuracion.save()
        self.beneficio_comun.titulo = "Beneficio de alquiler vigente"
        self.beneficio_comun.save()

        self.client.force_authenticate(self.user)
        conversion = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )
        self.assertEqual(conversion.status_code, 201, conversion.data)
        contrato = conversion.data["contrato"]
        self.assertEqual(contrato["oferta_snapshot"]["alquiler"], alquiler_historico)
        self.assertEqual(contrato["valor_final"], "1300.00")
        contrato_editado = self.client.patch(
            f"/api/contratos/{contrato['id']}/",
            {"numero_invitados": 90, "valor_final": "1400.00"},
            format="json",
        )
        self.assertEqual(contrato_editado.status_code, 200, contrato_editado.data)
        self.assertEqual(contrato_editado.data["valor_final"], "1400.00")
        self.assertEqual(
            contrato_editado.data["oferta_snapshot"]["alquiler"],
            {**alquiler_historico, "invitados_adicionales": 40, "costo_adicional": "400.00"},
        )
        cotizacion.refresh_from_db()
        self.assertEqual(cotizacion.oferta_snapshot, snapshot_historico)

    def test_reconstruye_alquiler_sin_parametros_historicos_con_configuracion_vigente(self):
        snapshot_incompleto = {
            "version": 1,
            "origen": "migracion_historica",
            "tipo_servicio": "alquiler",
            "numero_invitados": 80,
            "total_estimado": "1300.00",
            "alquiler": {"parametros_disponibles": False},
        }
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            fecha_tentativa=timezone.localdate() + timedelta(days=30),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("1300.00"),
            oferta_snapshot=snapshot_incompleto,
        )
        self.configuracion.tarifa_base_alquiler = Decimal("1700.00")
        self.configuracion.invitados_incluidos_alquiler = 60
        self.configuracion.costo_invitado_adicional = Decimal("20.00")
        self.configuracion.save()
        self.beneficio_comun.tipo = BeneficioPaquete.Tipo.PRINCIPAL
        self.beneficio_comun.titulo = "Beneficio vigente al convertir"
        self.beneficio_comun.save()

        conversion = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )

        self.assertEqual(conversion.status_code, 201, conversion.data)
        contrato = conversion.data["contrato"]
        alquiler = contrato["oferta_snapshot"]["alquiler"]
        self.assertEqual(contrato["valor_final"], "1300.00")
        self.assertTrue(alquiler["parametros_disponibles"])
        self.assertEqual(alquiler["tarifa_base"], "1700.00")
        self.assertEqual(alquiler["invitados_incluidos"], 60)
        self.assertEqual(alquiler["costo_invitado_adicional"], "20.00")
        self.assertEqual(alquiler["invitados_adicionales"], 20)
        self.assertEqual(alquiler["costo_adicional"], "400.00")
        self.assertEqual(
            alquiler["beneficios_principales"][0]["titulo"],
            "Beneficio vigente al convertir",
        )
        cotizacion.refresh_from_db()
        self.assertEqual(cotizacion.oferta_snapshot, snapshot_incompleto)

    def test_reconstruye_servicio_completo_al_elegir_un_paquete_distinto(self):
        cotizada = self.client.post(
            "/api/cotizaciones/",
            {
                "persona": self.persona.id,
                "tipo_evento": self.tipo_evento.id,
                "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
                "paquete": self.paquete.id,
                "fecha_tentativa": (timezone.localdate() + timedelta(days=30)).isoformat(),
                "numero_invitados": 80,
                "total_estimado": "1440.00",
            },
            format="json",
        )
        self.assertEqual(cotizada.status_code, 201, cotizada.data)
        cotizacion = Cotizacion.objects.get(pk=cotizada.data["id"])
        self.confirmar(cotizacion)
        paquete_final = Paquete.objects.create(
            nombre="Paquete alternativo QA",
            precio_por_persona=Decimal("25.00"),
        )
        BeneficioPaquete.objects.create(
            paquete=paquete_final,
            tipo=BeneficioPaquete.Tipo.PRINCIPAL,
            titulo="Beneficio del paquete alternativo QA",
        )

        conversion = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {"paquete": paquete_final.id, "valor_final": "1900.00"},
            format="json",
        )

        self.assertEqual(conversion.status_code, 201, conversion.data)
        contrato = conversion.data["contrato"]
        paquete = contrato["oferta_snapshot"]["paquete"]
        self.assertEqual(contrato["valor_final"], "1900.00")
        self.assertEqual(contrato["paquete"], paquete_final.id)
        self.assertEqual(paquete["id"], paquete_final.id)
        self.assertEqual(paquete["nombre"], "Paquete alternativo QA")
        self.assertEqual(paquete["precio_por_persona"], "25.00")
        self.assertEqual(paquete["total_estimado"], "2000.00")
        self.assertEqual(
            [beneficio["titulo"] for beneficio in paquete["beneficios"]],
            ["Beneficio del paquete alternativo QA"],
        )
        cotizacion.refresh_from_db()
        self.assertEqual(cotizacion.paquete_id, self.paquete.id)
        self.assertEqual(cotizacion.oferta_snapshot, cotizada.data["oferta_snapshot"])

    def test_reconstruye_servicio_completo_desde_catalogo_vigente_si_no_habia_paquete_elegido(self):
        self.client.force_authenticate(user=None)
        solicitud = self.client.post(
            "/api/pre-cotizacion/",
            self.public_payload(
                telefono="0991112207",
                tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            ),
            format="json",
        )
        self.assertEqual(solicitud.status_code, 201, solicitud.data)
        snapshot_historico = solicitud.data["cotizacion"]["oferta_snapshot"]
        ofrecido = snapshot_historico["catalogo"]["paquetes"][0]
        self.assertEqual(ofrecido["id"], self.paquete.id)
        self.assertEqual(ofrecido["precio_por_persona"], "18.00")
        cotizacion = Cotizacion.objects.get(pk=solicitud.data["cotizacion"]["id"])
        self.confirmar(cotizacion)
        self.paquete.nombre = "Paquete actualizado QA"
        self.paquete.precio_por_persona = Decimal("22.00")
        self.paquete.save()
        self.beneficio_principal.titulo = "Beneficio actualizado QA"
        self.beneficio_principal.save()

        self.client.force_authenticate(self.user)
        conversion = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {"paquete": self.paquete.id, "valor_final": "1440.00"},
            format="json",
        )

        self.assertEqual(conversion.status_code, 201, conversion.data)
        contrato = conversion.data["contrato"]
        paquete = contrato["oferta_snapshot"]["paquete"]
        self.assertEqual(contrato["valor_final"], "1440.00")
        self.assertEqual(paquete["id"], ofrecido["id"])
        self.assertEqual(paquete["nombre"], "Paquete actualizado QA")
        self.assertEqual(paquete["precio_por_persona"], "22.00")
        self.assertEqual(paquete["total_estimado"], "1760.00")
        self.assertIn(
            "Beneficio actualizado QA",
            [item["titulo"] for item in paquete["beneficios"]],
        )
        cotizacion.refresh_from_db()
        self.assertIsNone(cotizacion.paquete_id)
        self.assertEqual(cotizacion.oferta_snapshot, snapshot_historico)

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
