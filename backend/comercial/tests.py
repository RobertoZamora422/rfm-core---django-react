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
            capacidad_maxima=200,
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
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_cliente": "Cliente Nuevo",
                "telefono_cliente": "+593 999999222",
                "correo_cliente": "nuevo@example.com",
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
        self.assertTrue(Cliente.objects.filter(nombre="Cliente Nuevo").exists())

    def test_pre_cotizacion_respeta_capacidad_maxima(self):
        response = self.client.post(
            "/api/pre-cotizacion/",
            {
                "cliente": self.cliente.id,
                "tipo_evento": self.tipo_evento.id,
                "fecha_tentativa": "2026-09-01",
                "numero_invitados": 201,
                "tipo_servicio": Paquete.TipoServicio.ALQUILER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("numero_invitados", response.data)

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

    def test_convertir_cotizacion_confirmada_a_contrato(self):
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
            {"monto_abonado": "400.00", "observaciones": "Contrato inicial"},
            format="json",
        )

        cotizacion.refresh_from_db()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(cotizacion.estado, Cotizacion.Estado.CONVERTIDA)
        self.assertEqual(response.data["contrato"]["estado_pago"], Contrato.EstadoPago.ABONADO)
        self.assertEqual(response.data["contrato"]["valor_final"], "2400.00")
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
