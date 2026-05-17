from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APITestCase

from comercial.models import Cotizacion
from financiero.models import Contrato, CostoDirecto, GastoFijoMensual
from negocio.models import Cliente, Paquete, TipoEvento


class FinancieroModelTests(TestCase):
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

    def crear_contrato(self, **overrides):
        data = {
            "cliente": self.cliente,
            "tipo_evento": self.tipo_evento,
            "paquete": self.paquete,
            "fecha_evento": date(2026, 8, 1),
            "numero_invitados": 80,
            "valor_final": Decimal("2000.00"),
            "monto_abonado": Decimal("500.00"),
        }
        data.update(overrides)
        return Contrato.objects.create(**data)

    def test_estado_pago_se_deriva_del_monto_abonado(self):
        contrato = self.crear_contrato()

        self.assertEqual(contrato.estado_pago, Contrato.EstadoPago.ABONADO)
        self.assertEqual(contrato.saldo_pendiente, Decimal("1500.00"))

    def test_monto_abonado_no_supera_valor_final(self):
        with self.assertRaises(ValidationError):
            self.crear_contrato(
                valor_final=Decimal("1000.00"),
                monto_abonado=Decimal("1000.01"),
            )

    def test_utilidad_y_margen_bruto_usan_costos_directos(self):
        contrato = self.crear_contrato(
            valor_final=Decimal("2000.00"),
            monto_abonado=Decimal("2000.00"),
        )
        CostoDirecto.objects.create(
            contrato=contrato,
            concepto="Catering",
            valor=Decimal("800.00"),
            fecha=date(2026, 8, 1),
        )

        self.assertEqual(contrato.estado_pago, Contrato.EstadoPago.PAGADO)
        self.assertEqual(contrato.utilidad_bruta, Decimal("1200.00"))
        self.assertEqual(contrato.margen_bruto, Decimal("60.0"))

    def test_gasto_fijo_valida_mes(self):
        gasto = GastoFijoMensual(
            concepto="Arriendo",
            valor=Decimal("500.00"),
            mes=13,
            anio=2026,
        )

        with self.assertRaises(ValidationError):
            gasto.save()


class FinancieroApiTests(APITestCase):
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
            nombre="Alquiler",
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            precio_por_persona=Decimal("0.00"),
        )

    def crear_contrato(self, **overrides):
        data = {
            "cliente": self.cliente,
            "tipo_evento": self.tipo_evento,
            "paquete": self.paquete,
            "fecha_evento": date(2026, 8, 1),
            "numero_invitados": 80,
            "valor_final": Decimal("2000.00"),
            "monto_abonado": Decimal("500.00"),
        }
        data.update(overrides)
        return Contrato.objects.create(**data)

    def test_crea_contrato_y_deriva_estado_pago(self):
        response = self.client.post(
            "/api/contratos/",
            {
                "cliente": self.cliente.id,
                "tipo_evento": self.tipo_evento.id,
                "paquete": self.paquete.id,
                "fecha_evento": "2026-08-01",
                "numero_invitados": 80,
                "valor_final": "2000.00",
                "monto_abonado": "500.00",
                "estado_contrato": Contrato.EstadoContrato.CONFIRMADO,
                "observaciones": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["cliente_telefono"], "+593 999999111")
        self.assertEqual(response.data["estado_pago"], Contrato.EstadoPago.ABONADO)
        self.assertEqual(response.data["saldo_pendiente"], "1500.00")

    def test_estado_pago_en_payload_no_sobrescribe_calculo(self):
        response = self.client.post(
            "/api/contratos/",
            {
                "cliente": self.cliente.id,
                "tipo_evento": self.tipo_evento.id,
                "paquete": self.paquete.id,
                "fecha_evento": "2026-08-01",
                "numero_invitados": 80,
                "valor_final": "2000.00",
                "monto_abonado": "0.00",
                "estado_contrato": Contrato.EstadoContrato.CONFIRMADO,
                "estado_pago": Contrato.EstadoPago.PAGADO,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["estado_pago"], Contrato.EstadoPago.PENDIENTE)
        self.assertEqual(response.data["saldo_pendiente"], "2000.00")

    def test_rechaza_abono_mayor_al_valor_final(self):
        response = self.client.post(
            "/api/contratos/",
            {
                "cliente": self.cliente.id,
                "tipo_evento": self.tipo_evento.id,
                "paquete": self.paquete.id,
                "fecha_evento": "2026-08-01",
                "numero_invitados": 80,
                "valor_final": "2000.00",
                "monto_abonado": "2000.01",
                "estado_contrato": Contrato.EstadoContrato.CONFIRMADO,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("monto_abonado", response.data)

    def test_rechaza_valores_invalidos_de_contrato(self):
        base_payload = {
            "cliente": self.cliente.id,
            "tipo_evento": self.tipo_evento.id,
            "paquete": self.paquete.id,
            "fecha_evento": "2026-08-01",
            "numero_invitados": 80,
            "valor_final": "2000.00",
            "monto_abonado": "500.00",
            "estado_contrato": Contrato.EstadoContrato.CONFIRMADO,
        }
        cases = [
            ("valor_final", {**base_payload, "valor_final": "-1.00"}),
            ("monto_abonado", {**base_payload, "monto_abonado": "-1.00"}),
            ("numero_invitados", {**base_payload, "numero_invitados": 0}),
            (
                "fecha_evento",
                {
                    key: value
                    for key, value in base_payload.items()
                    if key != "fecha_evento"
                },
            ),
        ]

        for field, payload in cases:
            with self.subTest(field=field):
                response = self.client.post("/api/contratos/", payload, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)

    def test_rechaza_contrato_con_cotizacion_no_convertida(self):
        cotizacion = Cotizacion.objects.create(
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 1),
            numero_invitados=80,
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("2000.00"),
        )

        response = self.client.post(
            "/api/contratos/",
            {
                "cotizacion": cotizacion.id,
                "cliente": self.cliente.id,
                "tipo_evento": self.tipo_evento.id,
                "paquete": self.paquete.id,
                "fecha_evento": "2026-08-01",
                "numero_invitados": 80,
                "valor_final": "2000.00",
                "monto_abonado": "0.00",
                "estado_contrato": Contrato.EstadoContrato.CONFIRMADO,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("cotizacion", response.data)

    def test_filtra_contratos_por_busqueda_estado_pago_tipo_evento_y_fechas(self):
        cumpleanos = TipoEvento.objects.create(nombre="Cumpleanos")
        otro_cliente = Cliente.objects.create(
            nombre="Cliente Filtro",
            telefono="+593 988888888",
        )
        contrato_objetivo = self.crear_contrato(
            cliente=otro_cliente,
            tipo_evento=cumpleanos,
            fecha_evento=date(2026, 9, 10),
            monto_abonado=Decimal("2000.00"),
        )
        self.crear_contrato(
            fecha_evento=date(2026, 7, 1),
            monto_abonado=Decimal("0.00"),
        )

        response = self.client.get(
            "/api/contratos/",
            {
                "buscar": "Filtro",
                "estado_contrato": Contrato.EstadoContrato.CONFIRMADO,
                "estado_pago": Contrato.EstadoPago.PAGADO,
                "tipo_evento": cumpleanos.id,
                "desde": "2026-09-01",
                "hasta": "2026-09-30",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [contrato_objetivo.id])

    def test_rechaza_rango_de_fechas_invertido(self):
        response = self.client.get(
            "/api/contratos/",
            {
                "desde": "2026-10-01",
                "hasta": "2026-09-01",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("hasta", response.data)

    def test_cancelar_contrato_no_elimina_registro(self):
        contrato = self.crear_contrato()

        response = self.client.post(f"/api/contratos/{contrato.id}/cancelar/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["estado_contrato"], Contrato.EstadoContrato.CANCELADO)
        contrato.refresh_from_db()
        self.assertEqual(contrato.estado_contrato, Contrato.EstadoContrato.CANCELADO)
        self.assertTrue(Contrato.objects.filter(id=contrato.id).exists())

    def test_crea_costo_directo_y_gasto_fijo(self):
        contrato = self.crear_contrato()

        costo = self.client.post(
            "/api/costos-directos/",
            {
                "contrato": contrato.id,
                "concepto": "Catering",
                "valor": "700.00",
                "fecha": "2026-08-01",
                "observaciones": "",
            },
            format="json",
        )
        gasto = self.client.post(
            "/api/gastos-fijos/",
            {
                "concepto": "Servicios básicos",
                "valor": "300.00",
                "mes": 8,
                "anio": 2026,
                "observaciones": "",
            },
            format="json",
        )

        self.assertEqual(costo.status_code, 201)
        self.assertEqual(gasto.status_code, 201)
