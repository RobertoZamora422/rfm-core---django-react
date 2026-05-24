from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APITestCase

from financiero.models import Contrato
from negocio.models import Cliente, ConfiguracionNegocio, Paquete, TipoEvento

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

    def test_cotizacion_admin_requiere_paquete_para_servicio_completo(self):
        response = self.client.post(
            "/api/cotizaciones/",
            {
                "cliente": self.cliente.id,
                "tipo_evento": self.tipo_evento.id,
                "paquete": None,
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

    def test_cotizacion_admin_rechaza_catalogos_inactivos(self):
        tipo_inactivo = TipoEvento.objects.create(nombre="Inactivo", activo=False)
        paquete_inactivo = Paquete.objects.create(
            nombre="Paquete inactivo",
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            precio_por_persona=Decimal("25.00"),
            activo=False,
        )
        base_payload = {
            "cliente": self.cliente.id,
            "tipo_evento": self.tipo_evento.id,
            "paquete": self.paquete.id,
            "fecha_tentativa": "2026-08-01",
            "numero_invitados": 80,
            "tipo_servicio": Paquete.TipoServicio.SERVICIO_COMPLETO,
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

    def test_pre_cotizacion_calcula_y_crea_cotizacion(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre": "Cliente Nuevo",
                "telefono": "+593 999999222",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-09-01",
                "numero_invitados": 80,
                "tipo_servicio": Paquete.TipoServicio.ALQUILER,
                "observaciones": "Solicitud inicial",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["calculo"]["total_estimado"], "1300.00")
        self.assertEqual(response.data["cotizacion"]["estado"], Cotizacion.Estado.NUEVA)
        cliente = Cliente.objects.get(nombre="Cliente Nuevo")
        self.assertEqual(cliente.correo, "")

    def test_pre_cotizacion_acepta_invitados_altos_sin_tope_de_configuracion(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre": "Cliente Sin Tope",
                "telefono": "+593 999999223",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-09-01",
                "numero_invitados": 201,
                "tipo_servicio": Paquete.TipoServicio.ALQUILER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["calculo"]["total_estimado"], "2510.00")

    def test_pre_cotizacion_publica_rechaza_cliente_existente(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "cliente": self.cliente.id,
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-09-01",
                "numero_invitados": 80,
                "tipo_servicio": Paquete.TipoServicio.ALQUILER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("cliente", response.data)

    def test_pre_cotizacion_servicio_completo_calcula_paquetes_activos(self):
        self.client.force_authenticate(user=None)
        Paquete.objects.create(
            nombre="Servicio inactivo",
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            precio_por_persona=Decimal("99.00"),
            activo=False,
        )

        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre": "Cliente Servicio",
                "telefono": "+593 999999224",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-10-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["cotizacion"]["paquete"], None)
        self.assertEqual(response.data["cotizacion"]["total_estimado"], "2400.00")
        paquetes = response.data["calculo"]["paquetes"]
        self.assertEqual(len(paquetes), 1)
        self.assertEqual(paquetes[0]["nombre"], "Servicio completo")
        self.assertEqual(paquetes[0]["total_estimado"], "2400.00")

    def test_pre_cotizacion_comparacion_calcula_alquiler_y_servicio(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre": "Cliente Indeciso",
                "telefono": "+593 999999225",
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-11-01",
                "numero_invitados": 80,
                "tipo_servicio": Cotizacion.TipoServicioInteres.NO_SEGURO,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["cotizacion"]["estado"], Cotizacion.Estado.NUEVA)
        self.assertEqual(
            response.data["cotizacion"]["tipo_servicio"],
            Cotizacion.TipoServicioInteres.NO_SEGURO,
        )
        self.assertEqual(response.data["calculo"]["alquiler"]["total_estimado"], "1300.00")
        self.assertEqual(
            response.data["calculo"]["servicio_completo"]["paquetes"][0]["total_estimado"],
            "2400.00",
        )

    def test_endpoints_administrativos_siguen_protegidos(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/cotizaciones/")

        self.assertEqual(response.status_code, 401)

    def test_endpoints_publicos_devuelven_solo_datos_activos(self):
        self.client.force_authenticate(user=None)
        TipoEvento.objects.create(nombre="Evento inactivo", activo=False)
        Paquete.objects.create(
            nombre="Paquete inactivo",
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            precio_por_persona=Decimal("60.00"),
            activo=False,
        )

        tipos_response = self.client.get("/api/public/tipos-evento/")
        paquetes_response = self.client.get(
            "/api/public/paquetes/",
            {"tipo_servicio": Paquete.TipoServicio.SERVICIO_COMPLETO},
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
            {item["nombre"] for item in paquetes_response.data},
            {"Servicio completo"},
        )
        self.assertEqual(
            configuracion_response.data["tarifa_base_alquiler"],
            "1000.00",
        )
        self.assertEqual(
            configuracion_response.data["whatsapp_numero_url"],
            "593991234567",
        )

    def test_cambiar_estado_cotizacion(self):
        cotizacion = Cotizacion.objects.create(
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
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
        otro_cliente = Cliente.objects.create(
            nombre="Otro Cliente",
            telefono="+593 999999333",
        )
        otro_tipo_evento = TipoEvento.objects.create(nombre="Corporativo")
        cotizacion_objetivo = Cotizacion.objects.create(
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 15),
            numero_invitados=80,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.CONTACTADA,
            total_estimado=Decimal("2400.00"),
            observaciones="Seguimiento por WhatsApp",
        )
        Cotizacion.objects.create(
            cliente=otro_cliente,
            tipo_evento=otro_tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 9, 1),
            numero_invitados=60,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
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

    def test_filtro_fecha_invalida_devuelve_error_claro(self):
        response = self.client.get("/api/cotizaciones/", {"desde": "2026/08/01"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("desde", response.data)

    def test_crud_no_marca_cotizacion_como_convertida(self):
        cotizacion = Cotizacion.objects.create(
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
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
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.CONVERTIDA,
            total_estimado=Decimal("2400.00"),
        )
        Contrato.objects.create(
            cotizacion=cotizacion,
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
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
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            precio_por_persona=Decimal("35.00"),
        )
        cotizacion = Cotizacion.objects.create(
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
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
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
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

    def test_convertir_rechaza_paquete_final_de_otro_tipo_servicio(self):
        paquete_alquiler = Paquete.objects.create(
            nombre="Alquiler final",
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            precio_por_persona=Decimal("0.00"),
        )
        cotizacion = Cotizacion.objects.create(
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("2400.00"),
        )

        response = self.client.post(
            f"/api/cotizaciones/{cotizacion.id}/convertir-contrato/",
            {"paquete": paquete_alquiler.id},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("paquete", response.data)

    def test_convertir_rechaza_conversion_doble(self):
        cotizacion = Cotizacion.objects.create(
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
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
