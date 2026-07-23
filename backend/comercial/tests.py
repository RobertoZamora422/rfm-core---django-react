from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APITestCase

from financiero.models import Contrato
from negocio.models import Persona, ConfiguracionNegocio, Paquete, TipoEvento

from .models import Cotizacion


class CotizacionModelTests(TestCase):
    def setUp(self):
        self.persona = Persona.objects.create(
            nombre="Persona Test",
            telefono="+593 999999999",
        )
        self.tipo_evento = TipoEvento.objects.create(nombre="Boda")
        self.paquete = Paquete.objects.create(
            nombre="Servicio base",
            precio_por_persona=Decimal("10.00"),
        )

    def test_numero_invitados_debe_ser_positivo(self):
        cotizacion = Cotizacion(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=None,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=0,
            tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            total_estimado=Decimal("1000.00"),
        )

        with self.assertRaises(ValidationError):
            cotizacion.save()


class CotizacionCleanDatabaseApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="test-pass",
            is_staff=True,
        )
        self.client.force_authenticate(self.user)

    def test_cotizaciones_sin_registros_devuelve_lista_vacia(self):
        response = self.client.get("/api/cotizaciones/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_pre_cotizacion_sin_configuracion_devuelve_error_controlado(self):
        tipo_evento = TipoEvento.objects.create(nombre="Boda")
        self.client.force_authenticate(user=None)

        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_persona": "Persona Pública",
                "telefono_persona": "0991234567",
                "tipo_evento": tipo_evento.id,
                "fecha_tentativa": "2026-05-20",
                "numero_invitados": 80,
                "tipo_servicio": "alquiler",
                "observaciones": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("configuracion", response.data)


class CotizacionApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="test-pass",
            is_staff=True,
        )
        self.client.force_authenticate(self.user)
        self.persona = Persona.objects.create(
            nombre="Persona API",
            telefono="+593 999999111",
        )
        self.tipo_evento = TipoEvento.objects.create(nombre="Boda")
        self.paquete = Paquete.objects.create(
            nombre="Servicio completo",
            precio_por_persona=Decimal("30.00"),
        )
        self.configuracion = ConfiguracionNegocio.objects.create(
            nombre_negocio="Rancho Flor Maria",
            tarifa_base_alquiler=Decimal("1000.00"),
            invitados_incluidos_alquiler=50,
            costo_invitado_adicional=Decimal("10.00"),
            whatsapp_negocio="0991234567",
            activo=True,
        )

    def test_crea_cotizacion(self):
        response = self.client.post(
            "/api/cotizaciones/",
            {
                "persona": self.persona.id,
                "tipo_evento": self.tipo_evento.id,
                "paquete": self.paquete.id,
                "fecha_tentativa": "2026-08-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
                "estado": Cotizacion.Estado.NUEVA,
                "total_estimado": "2400.00",
                "observaciones": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["persona_nombre"], "Persona API")

    def test_rechaza_paquete_en_cotizacion_de_alquiler(self):
        response = self.client.post(
            "/api/cotizaciones/",
            {
                "persona": self.persona.id,
                "tipo_evento": self.tipo_evento.id,
                "paquete": self.paquete.id,
                "fecha_tentativa": "2026-08-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
                "estado": Cotizacion.Estado.NUEVA,
                "total_estimado": "1300.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("paquete", response.data)

    def test_cotizacion_admin_requiere_paquete_para_servicio_completo(self):
        response = self.client.post(
            "/api/cotizaciones/",
            {
                "persona": self.persona.id,
                "tipo_evento": self.tipo_evento.id,
                "paquete": None,
                "fecha_tentativa": "2026-08-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
                "estado": Cotizacion.Estado.NUEVA,
                "total_estimado": "2400.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("paquete", response.data)

    def test_cotizacion_admin_rechaza_catalogos_inactivos(self):
        tipo_inactivo = TipoEvento.objects.create(nombre="Inactivo", activo=False)
        paquete_inactivo = Paquete.objects.create(
            nombre="Paquete inactivo",
            precio_por_persona=Decimal("25.00"),
            activo=False,
        )
        base_payload = {
            "persona": self.persona.id,
            "tipo_evento": self.tipo_evento.id,
            "paquete": self.paquete.id,
            "fecha_tentativa": "2026-08-01",
            "numero_invitados": 80,
            "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            "estado": Cotizacion.Estado.NUEVA,
            "total_estimado": "2400.00",
        }

        tipo_response = self.client.post(
            "/api/cotizaciones/",
            {**base_payload, "tipo_evento": tipo_inactivo.id},
            format="json",
        )
        paquete_response = self.client.post(
            "/api/cotizaciones/",
            {**base_payload, "paquete": paquete_inactivo.id},
            format="json",
        )

        self.assertEqual(tipo_response.status_code, 400)
        self.assertIn("tipo_evento", tipo_response.data)
        self.assertEqual(paquete_response.status_code, 400)
        self.assertIn("paquete", paquete_response.data)

    def test_total_estimado_no_puede_ser_negativo(self):
        cotizacion = Cotizacion(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=50,
            tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            total_estimado=Decimal("-1.00"),
        )

        with self.assertRaises(ValidationError):
            cotizacion.save()

    def test_pre_cotizacion_calcula_y_crea_cotizacion(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_persona": "Persona Nueva",
                "telefono_persona": "+593 999999222",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-09-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
                "observaciones": "Solicitud inicial",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["calculo"]["total_estimado"], "1300.00")
        self.assertEqual(response.data["cotizacion"]["estado"], Cotizacion.Estado.NUEVA)
        persona = Persona.objects.get(nombre="Persona Nueva")
        self.assertEqual(persona.correo, "")

    def test_pre_cotizacion_acepta_invitados_altos_sin_tope_de_configuracion(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_persona": "Persona Sin Tope",
                "telefono_persona": "+593 999999223",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-09-01",
                "numero_invitados": 201,
                "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["calculo"]["total_estimado"], "2510.00")

    def test_pre_cotizacion_publica_rechaza_persona_existente(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "persona": self.persona.id,
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-09-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("persona", response.data)

    def test_pre_cotizacion_servicio_completo_calcula_paquetes_activos(self):
        self.client.force_authenticate(user=None)
        Paquete.objects.create(
            nombre="Servicio inactivo",
            precio_por_persona=Decimal("99.00"),
            activo=False,
        )

        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_persona": "Persona Servicio",
                "telefono_persona": "+593 999999224",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-10-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["cotizacion"]["paquete"])
        self.assertIsNone(response.data["cotizacion"]["total_estimado"])
        self.assertIsNone(response.data["calculo"]["total_estimado"])
        self.assertEqual(response.data["calculo"]["total_estimado_minimo"], "2400.00")
        paquetes = response.data["calculo"]["paquetes"]
        self.assertEqual(len(paquetes), 1)
        self.assertEqual(paquetes[0]["nombre"], "Servicio completo")
        self.assertEqual(paquetes[0]["total_estimado"], "2400.00")
        self.assertIn("solicitud_token", response.data)
        self.assertEqual(
            response.data["whatsapp"]["principal"]["etiqueta"],
            "¿Necesitas ayuda para elegir? Escríbenos por WhatsApp",
        )

    def test_pre_cotizacion_comparacion_calcula_alquiler_y_servicio(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_persona": "Persona Indecisa",
                "telefono_persona": "+593 999999225",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-11-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["cotizacion"]["estado"], Cotizacion.Estado.NUEVA)
        self.assertEqual(
            response.data["cotizacion"]["tipo_servicio"],
            Cotizacion.TipoServicioInteres.NO_ESTOY_SEGURO,
        )
        self.assertEqual(response.data["calculo"]["alquiler"]["total_estimado"], "1300.00")
        self.assertNotIn("paquetes", response.data["calculo"]["servicio_completo"])
        categorias = response.data["calculo"]["servicio_completo"]["categorias"]
        self.assertEqual(categorias[0]["categoria"], "estandar")
        self.assertEqual(categorias[0]["precio_por_persona_desde"], "30.00")
        self.assertIsNone(response.data["cotizacion"]["total_estimado"])

    def test_pre_cotizacion_recalcula_la_misma_solicitud_con_token(self):
        self.client.force_authenticate(user=None)
        payload = {
            "nombre_persona": "Persona Recalculo",
            "telefono_persona": "0992223344",
            "tipo_evento": self.tipo_evento.id,
            "fecha_tentativa": "2026-10-01",
            "numero_invitados": 80,
            "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
        }
        primera = self.client.post("/api/pre-cotizacion/", payload, format="json")
        segunda = self.client.post(
            "/api/pre-cotizacion/",
            {
                **payload,
                "numero_invitados": 90,
                "solicitud_token": primera.data["solicitud_token"],
            },
            format="json",
        )

        self.assertEqual(primera.status_code, 201)
        self.assertEqual(segunda.status_code, 200)
        self.assertEqual(
            primera.data["cotizacion"]["id"],
            segunda.data["cotizacion"]["id"],
        )
        self.assertEqual(Cotizacion.objects.filter(persona__telefono="0992223344").count(), 1)
        self.assertEqual(segunda.data["cotizacion"]["numero_invitados"], 90)
        self.assertEqual(segunda.data["calculo"]["total_estimado"], "1400.00")

    def test_token_con_otro_telefono_crea_una_solicitud_distinta(self):
        self.client.force_authenticate(user=None)
        payload = {
            "nombre_persona": "Persona Recalculo",
            "telefono_persona": "0992223345",
            "tipo_evento": self.tipo_evento.id,
            "fecha_tentativa": "2026-10-01",
            "numero_invitados": 80,
            "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
        }
        primera = self.client.post("/api/pre-cotizacion/", payload, format="json")
        segunda = self.client.post(
            "/api/pre-cotizacion/",
            {
                **payload,
                "telefono_persona": "0992223346",
                "solicitud_token": primera.data["solicitud_token"],
            },
            format="json",
        )

        self.assertEqual(segunda.status_code, 201)
        self.assertNotEqual(
            primera.data["cotizacion"]["id"],
            segunda.data["cotizacion"]["id"],
        )
        self.assertEqual(Cotizacion.objects.count(), 2)

    def test_pre_cotizacion_rechaza_datos_obligatorios_incompletos(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {"tipo_servicio": "alquiler"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        for field in (
            "nombre_persona",
            "telefono_persona",
            "tipo_evento",
            "fecha_tentativa",
            "numero_invitados",
        ):
            self.assertIn(field, response.data)

    def test_preferencia_de_paquete_es_opcional_y_se_puede_retirar(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_persona": "Persona Preferencia",
                "telefono_persona": "0992223347",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-10-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            },
            format="json",
        )
        token = response.data["solicitud_token"]
        seleccion = self.client.post(
            "/api/pre-cotizacion/preferencia/",
            {"solicitud_token": token, "paquete": self.paquete.id},
            format="json",
        )
        retiro = self.client.post(
            "/api/pre-cotizacion/preferencia/",
            {"solicitud_token": token, "paquete": None},
            format="json",
        )

        self.assertEqual(seleccion.status_code, 200)
        self.assertEqual(seleccion.data["cotizacion"]["paquete"], self.paquete.id)
        self.assertEqual(seleccion.data["cotizacion"]["total_estimado"], "2400.00")
        self.assertIn(
            "Paquete de interés: Servicio completo",
            seleccion.data["whatsapp"]["paquetes"][0]["mensaje"],
        )
        self.assertEqual(retiro.status_code, 200)
        self.assertIsNone(retiro.data["cotizacion"]["paquete"])
        self.assertIsNone(retiro.data["cotizacion"]["total_estimado"])

    def test_whatsapp_incluye_contexto_e_identificador(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_persona": "Persona WhatsApp",
                "telefono_persona": "0992223348",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-10-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
            },
            format="json",
        )
        mensaje = response.data["whatsapp"]["principal"]["mensaje"]

        self.assertIn(f"Solicitud: #{response.data['cotizacion']['id']}", mensaje)
        self.assertIn("Evento: Boda", mensaje)
        self.assertIn("Invitados: 80", mensaje)
        self.assertIn("Modalidad de interés: Alquiler del local", mensaje)
        self.assertIn("Valor estimado: $1300.00", mensaje)
        self.assertTrue(
            response.data["whatsapp"]["principal"]["url"].startswith(
                "https://wa.me/593991234567?text="
            )
        )

    def test_endpoints_administrativos_siguen_protegidos(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/cotizaciones/")

        self.assertEqual(response.status_code, 401)

    def test_usuario_no_staff_no_accede_a_api_administrativa(self):
        user = get_user_model().objects.create_user(
            username="sin-panel",
            password="test-pass",
        )
        self.client.force_authenticate(user)

        response = self.client.get("/api/cotizaciones/")

        self.assertEqual(response.status_code, 403)

    def test_endpoints_publicos_devuelven_solo_datos_activos(self):
        self.client.force_authenticate(user=None)
        TipoEvento.objects.create(nombre="Evento inactivo", activo=False)
        Paquete.objects.create(
            nombre="Paquete inactivo",
            precio_por_persona=Decimal("60.00"),
            activo=False,
        )

        tipos_response = self.client.get("/api/public/tipos-evento/")
        paquetes_response = self.client.get(
            "/api/public/paquetes/",
            {"numero_invitados": 80},
        )
        configuracion_response = self.client.get("/api/public/configuracion/")

        self.assertEqual(tipos_response.status_code, 200)
        self.assertEqual(paquetes_response.status_code, 200)
        self.assertEqual(configuracion_response.status_code, 200)
        self.assertEqual(
            {item["nombre"] for item in tipos_response.data},
            {"Boda"},
        )
        self.assertEqual(
            {item["nombre"] for item in paquetes_response.data["paquetes"]},
            {"Servicio completo"},
        )
        self.assertEqual(
            configuracion_response.data,
            {
                "nombre_negocio": "Rancho Flor Maria",
                "whatsapp_disponible": True,
            },
        )

    def test_cambiar_estado_cotizacion(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.NUEVA,
            total_estimado=Decimal("2400.00"),
        )

        response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/cambiar-estado/",
            {"estado": Cotizacion.Estado.CONFIRMADA},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["estado"], Cotizacion.Estado.CONFIRMADA)

    def test_filtra_cotizaciones_por_pipeline_comercial(self):
        otra_persona = Persona.objects.create(
            nombre="Otra Persona",
            telefono="+593 999999333",
        )
        otro_tipo_evento = TipoEvento.objects.create(nombre="Corporativo")
        cotizacion_objetivo = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 15),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.CONTACTADA,
            total_estimado=Decimal("2400.00"),
            observaciones="Seguimiento por WhatsApp",
        )
        Cotizacion.objects.create(
            persona=otra_persona,
            tipo_evento=otro_tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 9, 1),
            numero_invitados=60,
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.NUEVA,
            total_estimado=Decimal("1800.00"),
            observaciones="Solicitud distinta",
        )

        response = self.client.get(
            "/api/cotizaciones/",
            {
                "estado": Cotizacion.Estado.CONTACTADA,
                "tipo_evento": self.tipo_evento.id,
                "desde": "2026-08-01",
                "hasta": "2026-08-31",
                "buscar": "WhatsApp",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], cotizacion_objetivo.id)

    def test_listado_paginado_y_resumen_conservan_totales_filtrados(self):
        for index in range(3):
            Cotizacion.objects.create(
                persona=self.persona,
                tipo_evento=self.tipo_evento,
                fecha_tentativa=date(2026, 8, index + 1),
                numero_invitados=50,
                tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
                estado=Cotizacion.Estado.NUEVA,
                total_estimado=Decimal("1000.00"),
            )

        page_response = self.client.get(
            "/api/cotizaciones/", {"page": 2, "page_size": 2}
        )
        summary_response = self.client.get(
            "/api/cotizaciones/resumen/", {"estado": Cotizacion.Estado.NUEVA}
        )

        self.assertEqual(page_response.status_code, 200)
        self.assertEqual(page_response.data["count"], 3)
        self.assertEqual(len(page_response.data["results"]), 1)
        self.assertEqual(summary_response.data["total"], 3)
        self.assertEqual(summary_response.data["nuevas"], 3)

    def test_filtro_fecha_invalida_devuelve_error_claro(self):
        response = self.client.get("/api/cotizaciones/", {"desde": "2026/08/01"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("desde", response.data)

    def test_rechaza_rango_de_fechas_invertido(self):
        response = self.client.get(
            "/api/cotizaciones/",
            {"desde": "2026-09-10", "hasta": "2026-09-01"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("hasta", response.data)

    def test_cotizacion_descartada_debe_reactivarse_antes_de_continuar(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            estado=Cotizacion.Estado.DESCARTADA,
            total_estimado=Decimal("1000.00"),
        )

        invalid_response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/cambiar-estado/",
            {"estado": Cotizacion.Estado.CONFIRMADA},
            format="json",
        )
        reactivate_response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/cambiar-estado/",
            {"estado": Cotizacion.Estado.NUEVA},
            format="json",
        )

        self.assertEqual(invalid_response.status_code, 400)
        self.assertEqual(reactivate_response.status_code, 200)
        self.assertEqual(reactivate_response.data["estado"], Cotizacion.Estado.NUEVA)

    def test_estado_no_se_cambia_desde_patch_generico(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            total_estimado=Decimal("1000.00"),
        )

        response = self.client.patch(
            f"/api/cotizaciones/{cotizacion.id}/",
            {"estado": Cotizacion.Estado.CONTACTADA},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("estado", response.data)

    def test_pre_cotizacion_reutiliza_persona_con_mismo_telefono(self):
        self.client.force_authenticate(user=None)
        initial_count = Persona.objects.count()

        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_persona": "Persona API",
                "telefono_persona": "+593-999999111",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-09-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Persona.objects.count(), initial_count)
        self.assertEqual(response.data["cotizacion"]["persona"], self.persona.id)

    def test_crud_no_marca_cotizacion_como_convertida(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("2400.00"),
        )

        response = self.client.patch(
            f"/api/cotizaciones/{cotizacion.id}/",
            {"estado": Cotizacion.Estado.CONVERTIDA},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("estado", response.data)

    def test_cotizacion_convertida_bloquea_datos_criticos_pero_permite_observaciones(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.CONVERTIDA,
            total_estimado=Decimal("2400.00"),
        )
        Contrato.objects.create(
            cotizacion=cotizacion,
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            tipo_servicio=Contrato.TipoServicio.SERVICIO_COMPLETO,
            fecha_evento=date(2026, 8, 1),
            numero_invitados=80,
            valor_final=Decimal("2400.00"),
            monto_abonado=Decimal("0.00"),
        )

        critical_response = self.client.patch(
            f"/api/cotizaciones/{cotizacion.id}/",
            {"numero_invitados": 100},
            format="json",
        )
        observation_response = self.client.patch(
            f"/api/cotizaciones/{cotizacion.id}/",
            {"observaciones": "Nota administrativa"},
            format="json",
        )

        self.assertEqual(critical_response.status_code, 400)
        self.assertIn("numero_invitados", critical_response.data)
        self.assertEqual(observation_response.status_code, 200)
        self.assertEqual(observation_response.data["observaciones"], "Nota administrativa")

    def test_convertir_cotizacion_confirmada_a_contrato(self):
        paquete_final = Paquete.objects.create(
            nombre="Servicio final",
            precio_por_persona=Decimal("35.00"),
        )
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("2400.00"),
        )

        response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {
                "numero_invitados": 100,
                "paquete": paquete_final.id,
                "valor_final": "3500.00",
                "monto_abonado": "400.00",
                "observaciones": "Contrato inicial",
            },
            format="json",
        )

        cotizacion.refresh_from_db()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(cotizacion.estado, Cotizacion.Estado.CONVERTIDA)
        self.assertEqual(response.data["contrato"]["estado_pago"], Contrato.EstadoPago.ABONADO)
        self.assertEqual(response.data["contrato"]["numero_invitados"], 100)
        self.assertEqual(response.data["contrato"]["paquete"], paquete_final.id)
        self.assertEqual(response.data["contrato"]["valor_final"], "3500.00")
        self.assertEqual(
            response.data["cotizacion"]["contrato_id"],
            response.data["contrato"]["id"],
        )
        self.assertEqual(Contrato.objects.filter(cotizacion=cotizacion).count(), 1)

    def test_convertir_rechaza_cotizacion_no_confirmada(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.NUEVA,
            total_estimado=Decimal("2400.00"),
        )

        response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("estado", response.data)

    def test_convertir_alquiler_rechaza_paquete_final(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=None,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.ALQUILER,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("1300.00"),
        )

        response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {"paquete": self.paquete.id},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("paquete", response.data)

    def test_convertir_rechaza_conversion_doble(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("2400.00"),
        )

        first = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )
        second = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {},
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(Contrato.objects.filter(cotizacion=cotizacion).count(), 1)

    def test_cotizacion_no_se_elimina_fisicamente(self):
        cotizacion = Cotizacion.objects.create(
            persona=self.persona,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.NUEVA,
            total_estimado=Decimal("2400.00"),
        )

        response = self.client.delete(f"/api/cotizaciones/{cotizacion.id}/")

        self.assertEqual(response.status_code, 400)
        self.assertTrue(Cotizacion.objects.filter(pk=cotizacion.pk).exists())
        self.assertIn("cotizacion", response.data)
