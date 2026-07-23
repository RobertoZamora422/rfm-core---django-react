from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from comercial.models import Cotizacion
from financiero.models import Contrato, CostoDirecto
from negocio.models import ConfiguracionNegocio, Paquete, TipoEvento


class FlujoIntegralRfmCoreTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="admin-integral",
            password="test-pass",
        )
        self.client.force_authenticate(self.user)
        self.tipo_evento = TipoEvento.objects.create(nombre="Boda integral")
        self.paquete = Paquete.objects.create(
            nombre="Servicio integral",
            precio_por_persona=Decimal("42.00"),
        )
        ConfiguracionNegocio.objects.create(
            nombre_negocio="Rancho Flor Maria",
            tarifa_base_alquiler=Decimal("1200.00"),
            invitados_incluidos_alquiler=80,
            costo_invitado_adicional=Decimal("12.00"),
            whatsapp_negocio="0991234567",
            activo=True,
        )

    def period_bounds(self, fecha):
        inicio = fecha.replace(day=1)
        if fecha.month == 12:
            fin = fecha.replace(year=fecha.year + 1, month=1, day=1)
        else:
            fin = fecha.replace(month=fecha.month + 1, day=1)
        return inicio, fin - timedelta(days=1)

    def test_flujo_comercial_financiero_y_reportes_usa_datos_reales(self):
        hoy = timezone.localdate()
        fecha_evento = hoy + timedelta(days=45)

        pre_cotizacion = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_persona": "Persona Integral",
                "telefono_persona": "+593 999111333",
                "tipo_evento": self.tipo_evento.id,
                "paquete": self.paquete.id,
                "fecha_tentativa": fecha_evento.isoformat(),
                "numero_invitados": 100,
                "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
                "observaciones": "Validacion integral Fase 17",
            },
            format="json",
        )

        self.assertEqual(pre_cotizacion.status_code, 201)
        self.assertEqual(pre_cotizacion.data["calculo"]["total_estimado"], "4200.00")
        cotizacion_id = pre_cotizacion.data["cotizacion"]["id"]

        cambio_estado = self.client.post(
            f"/api/cotizaciones/{cotizacion_id}/cambiar-estado/",
            {"estado": Cotizacion.Estado.CONFIRMADA},
            format="json",
        )
        self.assertEqual(cambio_estado.status_code, 200)
        self.assertEqual(cambio_estado.data["estado"], Cotizacion.Estado.CONFIRMADA)

        conversion = self.client.post(
            f"/api/cotizaciones/{cotizacion_id}/convertir-contrato/",
            {
                "fecha_evento": fecha_evento.isoformat(),
                "valor_final": "4200.00",
                "monto_abonado": "1200.00",
                "observaciones": "Contrato generado desde prueba integral",
            },
            format="json",
        )

        self.assertEqual(conversion.status_code, 201)
        self.assertEqual(
            conversion.data["cotizacion"]["estado"],
            Cotizacion.Estado.CONVERTIDA,
        )
        self.assertEqual(
            conversion.data["contrato"]["estado_pago"],
            Contrato.EstadoPago.ABONADO,
        )
        self.assertEqual(conversion.data["contrato"]["saldo_pendiente"], "3000.00")
        contrato_id = conversion.data["contrato"]["id"]

        conversion_repetida = self.client.post(
            f"/api/cotizaciones/{cotizacion_id}/convertir-contrato/",
            {},
            format="json",
        )
        self.assertEqual(conversion_repetida.status_code, 400)
        self.assertIn("cotizacion", conversion_repetida.data)

        costo = self.client.post(
            "/api/costos-directos/",
            {
                "contrato": contrato_id,
                "concepto": "Catering integral",
                "valor": "900.00",
                "fecha": fecha_evento.isoformat(),
                "observaciones": "",
            },
            format="json",
        )
        gasto = self.client.post(
            "/api/gastos-adicionales/",
            {
                "concepto": "Arriendo integral",
                "valor": "400.00",
                "fecha": fecha_evento.isoformat(),
                "observaciones": "",
            },
            format="json",
        )
        self.assertEqual(costo.status_code, 201)
        self.assertEqual(gasto.status_code, 201)

        contrato_cancelado = Contrato.objects.create(
            persona_id=conversion.data["contrato"]["persona"],
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            tipo_servicio=Contrato.TipoServicio.SERVICIO_COMPLETO,
            fecha_evento=fecha_evento + timedelta(days=3),
            numero_invitados=120,
            valor_final=Decimal("6000.00"),
            monto_abonado=Decimal("6000.00"),
            estado_contrato=Contrato.EstadoContrato.CANCELADO,
        )
        CostoDirecto.objects.create(
            contrato=contrato_cancelado,
            concepto="Costo que debe excluirse",
            valor=Decimal("1500.00"),
            fecha=fecha_evento,
        )

        dashboard = self.client.get(
            "/api/dashboard-financiero/",
            {"mes": fecha_evento.month, "anio": fecha_evento.year},
        )
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.data["metricas"]["ingresos_mes"], "4200.00")
        self.assertEqual(dashboard.data["metricas"]["costos_directos_mes"], "900.00")
        self.assertEqual(
            dashboard.data["metricas"]["total_gastos_operativos_periodo"],
            "400.00",
        )
        self.assertEqual(dashboard.data["metricas"]["utilidad_neta"], "2900.00")
        self.assertEqual(dashboard.data["estado_pagos"]["saldo_pendiente"], "3000.00")
        self.assertEqual(
            {item["contrato_id"] for item in dashboard.data["rentabilidad_eventos"]},
            {contrato_id},
        )

        reporte_financiero = self.client.get(
            "/api/reportes/financiero/",
            {"mes": fecha_evento.month, "anio": fecha_evento.year},
        )
        self.assertEqual(reporte_financiero.status_code, 200)
        self.assertEqual(
            reporte_financiero.data["metricas"]["utilidad_neta"],
            "2900.00",
        )

        inicio_periodo, fin_periodo = self.period_bounds(fecha_evento)
        reporte_eventos = self.client.get(
            "/api/reportes/eventos/",
            {
                "desde": inicio_periodo.isoformat(),
                "hasta": fin_periodo.isoformat(),
            },
        )
        self.assertEqual(reporte_eventos.status_code, 200)
        self.assertEqual(reporte_eventos.data["resumen"]["eventos_confirmados"], 1)
        self.assertEqual(reporte_eventos.data["resumen"]["eventos_cancelados"], 1)
        self.assertEqual(reporte_eventos.data["resumen"]["valor_confirmado"], "4200.00")

        inicio = self.client.get("/api/inicio-resumen/")
        self.assertEqual(inicio.status_code, 200)
        self.assertEqual(inicio.data["eventos_proximos"][0]["contrato_id"], contrato_id)
        pending_types = {item["tipo"] for item in inicio.data["pendientes_importantes"]}
        self.assertIn("eventos_con_saldo", pending_types)

    def test_conversion_rechaza_cotizacion_descartada(self):
        fecha_evento = timezone.localdate() + timedelta(days=20)
        pre_cotizacion = self.client.post(
            "/api/pre-cotizacion/",
            {
                "nombre_persona": "Persona Descartada",
                "telefono_persona": "+593 999111444",
                "tipo_evento": self.tipo_evento.id,
                "paquete": self.paquete.id,
                "fecha_tentativa": fecha_evento.isoformat(),
                "numero_invitados": 70,
                "tipo_servicio": Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            },
            format="json",
        )
        self.assertEqual(pre_cotizacion.status_code, 201)
        cotizacion_id = pre_cotizacion.data["cotizacion"]["id"]

        cambio_estado = self.client.post(
            f"/api/cotizaciones/{cotizacion_id}/cambiar-estado/",
            {"estado": Cotizacion.Estado.DESCARTADA},
            format="json",
        )
        self.assertEqual(cambio_estado.status_code, 200)
        conversion = self.client.post(
            f"/api/cotizaciones/{cotizacion_id}/convertir-contrato/",
            {},
            format="json",
        )

        self.assertEqual(conversion.status_code, 400)
        self.assertIn("estado", conversion.data)
