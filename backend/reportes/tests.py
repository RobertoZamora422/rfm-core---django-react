from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from comercial.models import Cotizacion
from financiero.models import Contrato, CostoDirecto, GastoFijoMensual
from negocio.models import Cliente, Paquete, TipoEvento


class ReportesApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="test-pass",
        )
        self.client.force_authenticate(self.user)
        self.cliente = Cliente.objects.create(
            nombre="Cliente Reportes",
            telefono="+593 999555111",
        )
        self.otro_cliente = Cliente.objects.create(
            nombre="Cliente Extra",
            telefono="+593 999555222",
        )
        self.boda = TipoEvento.objects.create(nombre="Boda")
        self.corporativo = TipoEvento.objects.create(nombre="Corporativo")
        self.alquiler = Paquete.objects.create(
            nombre="Alquiler",
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            precio_por_persona=Decimal("0.00"),
        )
        self.premium = Paquete.objects.create(
            nombre="Premium",
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            precio_por_persona=Decimal("35.00"),
        )

    def crear_cotizacion(self, **overrides):
        data = {
            "cliente": self.cliente,
            "tipo_evento": self.boda,
            "paquete": self.premium,
            "fecha_tentativa": date(2026, 8, 10),
            "numero_invitados": 100,
            "tipo_servicio": Paquete.TipoServicio.SERVICIO_COMPLETO,
            "estado": Cotizacion.Estado.NUEVA,
            "total_estimado": Decimal("3500.00"),
        }
        data.update(overrides)
        return Cotizacion.objects.create(**data)

    def crear_contrato(self, **overrides):
        data = {
            "cliente": self.cliente,
            "tipo_evento": self.boda,
            "paquete": self.premium,
            "fecha_evento": date(2026, 8, 10),
            "numero_invitados": 100,
            "valor_final": Decimal("3500.00"),
            "monto_abonado": Decimal("500.00"),
            "estado_contrato": Contrato.EstadoContrato.CONFIRMADO,
        }
        data.update(overrides)
        return Contrato.objects.create(**data)

    def test_reporte_comercial_resume_cotizaciones_por_periodo(self):
        cotizacion_convertida = self.crear_cotizacion(
            estado=Cotizacion.Estado.CONVERTIDA,
            total_estimado=Decimal("3500.00"),
        )
        self.crear_contrato(cotizacion=cotizacion_convertida)
        self.crear_cotizacion(
            cliente=self.otro_cliente,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("2000.00"),
            fecha_tentativa=date(2026, 8, 20),
        )
        self.crear_cotizacion(
            estado=Cotizacion.Estado.DESCARTADA,
            total_estimado=Decimal("1000.00"),
            fecha_tentativa=date(2026, 9, 5),
        )

        response = self.client.get(
            "/api/reportes/comercial/",
            {"desde": "2026-08-01", "hasta": "2026-08-31"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["tipo"], "comercial")
        self.assertEqual(response.data["resumen"]["total_cotizaciones"], 2)
        self.assertEqual(response.data["resumen"]["cotizaciones_convertidas"], 1)
        self.assertEqual(response.data["resumen"]["total_estimado_referencial"], "5500.00")
        self.assertEqual(response.data["resumen"]["conversion_porcentaje"], "50.00")
        estado_counts = {
            item["key"]: item["cantidad"] for item in response.data["por_estado"]
        }
        self.assertEqual(estado_counts[Cotizacion.Estado.CONVERTIDA], 1)
        self.assertEqual(estado_counts[Cotizacion.Estado.CONFIRMADA], 1)
        self.assertEqual(len(response.data["cotizaciones"]), 2)
        self.assertEqual(response.data["cotizaciones"][0]["contrato_id"], None)
        self.assertIsNotNone(response.data["cotizaciones"][1]["contrato_id"])

    def test_reporte_financiero_reutiliza_metricas_backend_del_dashboard(self):
        contrato = self.crear_contrato(
            valor_final=Decimal("3000.00"),
            monto_abonado=Decimal("1000.00"),
        )
        cancelado = self.crear_contrato(
            cliente=self.otro_cliente,
            valor_final=Decimal("5000.00"),
            monto_abonado=Decimal("5000.00"),
            estado_contrato=Contrato.EstadoContrato.CANCELADO,
        )
        CostoDirecto.objects.create(
            contrato=contrato,
            concepto="Catering",
            valor=Decimal("800.00"),
            fecha=date(2026, 8, 10),
        )
        CostoDirecto.objects.create(
            contrato=cancelado,
            concepto="Costo cancelado",
            valor=Decimal("900.00"),
            fecha=date(2026, 8, 10),
        )
        GastoFijoMensual.objects.create(
            concepto="Arriendo",
            valor=Decimal("400.00"),
            mes=8,
            anio=2026,
        )

        response = self.client.get(
            "/api/reportes/financiero/",
            {"mes": 8, "anio": 2026},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["tipo"], "financiero")
        self.assertEqual(response.data["metricas"]["ingresos_mes"], "3000.00")
        self.assertEqual(response.data["metricas"]["costos_directos_mes"], "800.00")
        self.assertEqual(response.data["metricas"]["gastos_fijos_mes"], "400.00")
        self.assertEqual(response.data["metricas"]["utilidad_neta"], "1800.00")
        self.assertEqual(len(response.data["rentabilidad_eventos"]), 1)
        self.assertEqual(
            response.data["rentabilidad_eventos"][0]["contrato_id"],
            contrato.id,
        )

    def test_reporte_eventos_lista_confirmados_y_cancelados_sin_sumar_cancelados(self):
        confirmado = self.crear_contrato(
            valor_final=Decimal("2500.00"),
            monto_abonado=Decimal("500.00"),
            numero_invitados=90,
        )
        cancelado = self.crear_contrato(
            cliente=self.otro_cliente,
            fecha_evento=date(2026, 8, 15),
            valor_final=Decimal("4000.00"),
            monto_abonado=Decimal("0.00"),
            numero_invitados=120,
            estado_contrato=Contrato.EstadoContrato.CANCELADO,
        )
        self.crear_contrato(fecha_evento=date(2026, 9, 1))

        response = self.client.get(
            "/api/reportes/eventos/",
            {"desde": "2026-08-01", "hasta": "2026-08-31"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resumen"]["total_eventos"], 2)
        self.assertEqual(response.data["resumen"]["eventos_confirmados"], 1)
        self.assertEqual(response.data["resumen"]["eventos_cancelados"], 1)
        self.assertEqual(response.data["resumen"]["invitados_confirmados"], 90)
        self.assertEqual(response.data["resumen"]["valor_confirmado"], "2500.00")
        self.assertEqual(response.data["resumen"]["saldo_pendiente_confirmado"], "2000.00")
        self.assertEqual(
            {item["contrato_id"] for item in response.data["eventos"]},
            {confirmado.id, cancelado.id},
        )

    def test_reporte_paquetes_agrega_cotizaciones_y_rentabilidad_confirmada(self):
        self.crear_cotizacion(
            paquete=self.premium,
            estado=Cotizacion.Estado.CONVERTIDA,
            total_estimado=Decimal("3500.00"),
        )
        self.crear_cotizacion(
            paquete=self.alquiler,
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            estado=Cotizacion.Estado.NUEVA,
            total_estimado=Decimal("1200.00"),
            fecha_tentativa=date(2026, 8, 22),
        )
        contrato_premium = self.crear_contrato(
            paquete=self.premium,
            valor_final=Decimal("3500.00"),
            monto_abonado=Decimal("3500.00"),
        )
        contrato_alquiler_cancelado = self.crear_contrato(
            paquete=self.alquiler,
            valor_final=Decimal("1200.00"),
            monto_abonado=Decimal("0.00"),
            estado_contrato=Contrato.EstadoContrato.CANCELADO,
        )
        CostoDirecto.objects.create(
            contrato=contrato_premium,
            concepto="Catering",
            valor=Decimal("900.00"),
            fecha=date(2026, 8, 10),
        )
        CostoDirecto.objects.create(
            contrato=contrato_alquiler_cancelado,
            concepto="Costo cancelado",
            valor=Decimal("500.00"),
            fecha=date(2026, 8, 10),
        )

        response = self.client.get(
            "/api/reportes/paquetes/",
            {"desde": "2026-08-01", "hasta": "2026-08-31"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resumen"]["paquetes_con_actividad"], 2)
        self.assertEqual(response.data["resumen"]["cotizaciones"], 2)
        self.assertEqual(response.data["resumen"]["contratos_confirmados"], 1)
        self.assertEqual(response.data["resumen"]["ingresos_confirmados"], "3500.00")
        self.assertEqual(response.data["resumen"]["costos_directos"], "900.00")
        paquetes = {item["paquete_nombre"]: item for item in response.data["paquetes"]}
        self.assertEqual(paquetes["Premium"]["contratos_confirmados"], 1)
        self.assertEqual(paquetes["Premium"]["utilidad_bruta"], "2600.00")
        self.assertEqual(paquetes["Alquiler"]["contratos_confirmados"], 0)
        self.assertEqual(paquetes["Alquiler"]["ingresos_confirmados"], "0.00")

    def test_reportes_validan_periodos(self):
        invalid_range = self.client.get(
            "/api/reportes/comercial/",
            {"desde": "2026-09-01", "hasta": "2026-08-01"},
        )
        invalid_month = self.client.get(
            "/api/reportes/financiero/",
            {"mes": 13, "anio": 2026},
        )

        self.assertEqual(invalid_range.status_code, 400)
        self.assertIn("hasta", invalid_range.data)
        self.assertEqual(invalid_month.status_code, 400)
        self.assertIn("mes", invalid_month.data)
