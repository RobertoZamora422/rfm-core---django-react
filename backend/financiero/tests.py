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


class FinancieroCleanDatabaseApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="test-pass",
        )
        self.client.force_authenticate(self.user)

    def test_dashboard_financiero_con_base_limpia_devuelve_ceros(self):
        response = self.client.get(
            "/api/dashboard-financiero/",
            {"mes": 5, "anio": 2026},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["ingresos_mes"], "0.00")
        self.assertEqual(response.data["costos_directos_mes"], "0.00")
        self.assertEqual(response.data["gastos_fijos_mes"], "0.00")
        self.assertEqual(response.data["utilidad_bruta"], "0.00")
        self.assertEqual(response.data["margen_bruto"], "0.00")
        self.assertEqual(response.data["utilidad_neta"], "0.00")
        self.assertEqual(response.data["margen_neto"], "0.00")
        self.assertEqual(response.data["ticket_promedio"], "0.00")
        self.assertEqual(response.data["metricas"]["ingresos_mes"], "0.00")
        self.assertEqual(response.data["metricas"]["utilidad_bruta"], "0.00")
        self.assertEqual(response.data["metricas"]["ticket_promedio"], "0.00")
        self.assertEqual(response.data["rentabilidad_eventos"], [])
        self.assertEqual(response.data["rentabilidad_por_paquete"], [])
        self.assertEqual(response.data["analisis_por_tipo_evento"], [])
        self.assertEqual(response.data["top_eventos_rentables"], [])
        self.assertEqual(response.data["pendientes_financieros"]["total_contratos"], 0)
        self.assertEqual(response.data["estado_pagos"]["pendiente"], 0)
        self.assertEqual(response.data["estado_pagos"]["abonado"], 0)
        self.assertEqual(response.data["estado_pagos"]["pagado"], 0)
        self.assertEqual(response.data["estado_pagos"]["cancelado"], 0)
        variacion_ingresos = response.data["comparacion_mes_anterior"]["variaciones"][
            "ingresos_mes"
        ]
        self.assertIsNone(variacion_ingresos["porcentaje"])
        self.assertEqual(variacion_ingresos["direccion"], "sin_datos")

    def test_gastos_fijos_resumen_sin_gastos_devuelve_total_cero(self):
        response = self.client.get(
            "/api/gastos-fijos/resumen/",
            {"mes": 5, "anio": 2026},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_periodo"], "0.00")

    def test_listados_financieros_sin_registros_devuelven_lista_vacia(self):
        endpoints = [
            "/api/contratos/",
            "/api/costos-directos/",
            "/api/gastos-fijos/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data, [])


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

    def test_rechaza_asignar_catalogos_inactivos_en_contrato(self):
        tipo_inactivo = TipoEvento.objects.create(nombre="Evento inactivo", activo=False)
        paquete_inactivo = Paquete.objects.create(
            nombre="Paquete inactivo",
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            precio_por_persona=Decimal("0.00"),
            activo=False,
        )
        base_payload = {
            "cliente": self.cliente.id,
            "tipo_evento": self.tipo_evento.id,
            "paquete": self.paquete.id,
            "fecha_evento": "2026-08-01",
            "numero_invitados": 80,
            "valor_final": "2000.00",
            "monto_abonado": "500.00",
        }

        tipo_response = self.client.post(
            "/api/contratos/",
            {**base_payload, "tipo_evento": tipo_inactivo.id},
            format="json",
        )
        paquete_response = self.client.post(
            "/api/contratos/",
            {**base_payload, "paquete": paquete_inactivo.id},
            format="json",
        )

        self.assertEqual(tipo_response.status_code, 400)
        self.assertIn("tipo_evento", tipo_response.data)
        self.assertEqual(paquete_response.status_code, 400)
        self.assertIn("paquete", paquete_response.data)

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

    def test_eliminacion_de_costo_y_gasto_es_logica_y_excluye_consultas(self):
        contrato = self.crear_contrato()
        costo = CostoDirecto.objects.create(
            contrato=contrato,
            concepto="Catering",
            valor=Decimal("700.00"),
            fecha=date(2026, 8, 1),
        )
        gasto = GastoFijoMensual.objects.create(
            concepto="Servicios basicos",
            valor=Decimal("300.00"),
            mes=8,
            anio=2026,
        )

        costo_delete = self.client.delete(f"/api/costos-directos/{costo.id}/")
        gasto_delete = self.client.delete(f"/api/gastos-fijos/{gasto.id}/")
        costo.refresh_from_db()
        gasto.refresh_from_db()
        costos_list = self.client.get("/api/costos-directos/")
        gastos_list = self.client.get("/api/gastos-fijos/", {"mes": 8, "anio": 2026})
        resumen = self.client.get("/api/gastos-fijos/resumen/", {"mes": 8, "anio": 2026})

        self.assertEqual(costo_delete.status_code, 204)
        self.assertEqual(gasto_delete.status_code, 204)
        self.assertTrue(costo.eliminado)
        self.assertIsNotNone(costo.eliminado_en)
        self.assertTrue(gasto.eliminado)
        self.assertIsNotNone(gasto.eliminado_en)
        self.assertEqual(costos_list.data, [])
        self.assertEqual(gastos_list.data, [])
        self.assertEqual(resumen.data["total_periodo"], "0.00")

    def test_lista_costos_directos_con_datos_de_contrato_y_filtros(self):
        contrato_objetivo = self.crear_contrato()
        otro_cliente = Cliente.objects.create(
            nombre="Cliente Otro",
            telefono="+593 999999222",
        )
        otro_contrato = self.crear_contrato(
            cliente=otro_cliente,
            fecha_evento=date(2026, 9, 1),
        )
        costo_objetivo = CostoDirecto.objects.create(
            contrato=contrato_objetivo,
            concepto="Catering premium",
            valor=Decimal("700.00"),
            fecha=date(2026, 8, 1),
        )
        CostoDirecto.objects.create(
            contrato=otro_contrato,
            concepto="Decoracion",
            valor=Decimal("350.00"),
            fecha=date(2026, 9, 1),
        )

        response = self.client.get(
            "/api/costos-directos/",
            {
                "contrato": contrato_objetivo.id,
                "buscar": "premium",
                "desde": "2026-08-01",
                "hasta": "2026-08-31",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [costo_objetivo.id])
        self.assertEqual(response.data[0]["cliente_nombre"], "Cliente API")
        self.assertEqual(response.data[0]["cliente_telefono"], "+593 999999111")
        self.assertEqual(response.data[0]["tipo_evento_nombre"], "Boda")
        self.assertIn("Contrato #", response.data[0]["contrato_descripcion"])

    def test_filtra_costos_directos_por_telefono_y_rechaza_rango_invertido(self):
        contrato = self.crear_contrato()
        CostoDirecto.objects.create(
            contrato=contrato,
            concepto="Musica",
            valor=Decimal("300.00"),
            fecha=date(2026, 8, 2),
        )

        response = self.client.get("/api/costos-directos/", {"buscar": "999111"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        invalid_response = self.client.get(
            "/api/costos-directos/",
            {
                "desde": "2026-09-01",
                "hasta": "2026-08-01",
            },
        )
        self.assertEqual(invalid_response.status_code, 400)
        self.assertIn("hasta", invalid_response.data)

    def test_rechaza_costo_directo_sin_contrato_concepto_o_valor_valido(self):
        contrato = self.crear_contrato()
        cases = [
            ("contrato", {"concepto": "Catering", "valor": "100.00", "fecha": "2026-08-01"}),
            (
                "concepto",
                {
                    "contrato": contrato.id,
                    "concepto": " ",
                    "valor": "100.00",
                    "fecha": "2026-08-01",
                },
            ),
            (
                "valor",
                {
                    "contrato": contrato.id,
                    "concepto": "Catering",
                    "valor": "-1.00",
                    "fecha": "2026-08-01",
                },
            ),
        ]

        for field, payload in cases:
            with self.subTest(field=field):
                response = self.client.post("/api/costos-directos/", payload, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)

    def test_rechaza_costo_directo_para_contrato_cancelado(self):
        contrato = self.crear_contrato(
            estado_contrato=Contrato.EstadoContrato.CANCELADO,
        )

        response = self.client.post(
            "/api/costos-directos/",
            {
                "contrato": contrato.id,
                "concepto": "Costo cancelado",
                "valor": "100.00",
                "fecha": "2026-08-01",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("contrato", response.data)

    def test_filtra_gastos_fijos_y_devuelve_resumen_del_periodo(self):
        GastoFijoMensual.objects.create(
            concepto="Servicios basicos",
            valor=Decimal("300.00"),
            mes=8,
            anio=2026,
        )
        GastoFijoMensual.objects.create(
            concepto="Internet",
            valor=Decimal("90.00"),
            mes=8,
            anio=2026,
        )
        GastoFijoMensual.objects.create(
            concepto="Mantenimiento",
            valor=Decimal("250.00"),
            mes=9,
            anio=2026,
        )

        response = self.client.get(
            "/api/gastos-fijos/",
            {"mes": 8, "anio": 2026, "concepto": "servicios"},
        )
        resumen = self.client.get(
            "/api/gastos-fijos/resumen/",
            {"mes": 8, "anio": 2026},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["concepto"] for item in response.data], ["Servicios basicos"])
        self.assertEqual(resumen.status_code, 200)
        self.assertEqual(resumen.data["total_periodo"], "390.00")

    def test_rechaza_gasto_fijo_con_valores_invalidos(self):
        cases = [
            ("concepto", {"concepto": " ", "valor": "100.00", "mes": 8, "anio": 2026}),
            ("valor", {"concepto": "Internet", "valor": "-1.00", "mes": 8, "anio": 2026}),
            ("mes", {"concepto": "Internet", "valor": "100.00", "mes": 13, "anio": 2026}),
            ("anio", {"concepto": "Internet", "valor": "100.00", "mes": 8, "anio": 1999}),
        ]

        for field, payload in cases:
            with self.subTest(field=field):
                response = self.client.post("/api/gastos-fijos/", payload, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)

    def test_dashboard_financiero_calcula_metricas_desde_backend(self):
        Cotizacion.objects.create(
            cliente=self.cliente,
            tipo_evento=self.tipo_evento,
            paquete=self.paquete,
            fecha_tentativa=date(2026, 8, 12),
            numero_invitados=120,
            tipo_servicio=Paquete.TipoServicio.ALQUILER,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("9999.00"),
        )
        contrato_1 = self.crear_contrato(
            fecha_evento=date(2026, 8, 10),
            valor_final=Decimal("2000.00"),
            monto_abonado=Decimal("500.00"),
        )
        contrato_2 = self.crear_contrato(
            fecha_evento=date(2026, 8, 18),
            valor_final=Decimal("1000.00"),
            monto_abonado=Decimal("1000.00"),
        )
        contrato_cancelado = self.crear_contrato(
            fecha_evento=date(2026, 8, 20),
            valor_final=Decimal("3000.00"),
            monto_abonado=Decimal("3000.00"),
            estado_contrato=Contrato.EstadoContrato.CANCELADO,
        )
        contrato_anterior = self.crear_contrato(
            fecha_evento=date(2026, 7, 15),
            valor_final=Decimal("1500.00"),
            monto_abonado=Decimal("1500.00"),
        )

        CostoDirecto.objects.create(
            contrato=contrato_1,
            concepto="Catering",
            valor=Decimal("700.00"),
            fecha=date(2026, 9, 1),
        )
        CostoDirecto.objects.create(
            contrato=contrato_2,
            concepto="Decoracion",
            valor=Decimal("200.00"),
            fecha=date(2026, 8, 18),
        )
        CostoDirecto.objects.create(
            contrato=contrato_2,
            concepto="Costo eliminado",
            valor=Decimal("999.00"),
            fecha=date(2026, 8, 18),
            eliminado=True,
        )
        CostoDirecto.objects.create(
            contrato=contrato_cancelado,
            concepto="Costo cancelado",
            valor=Decimal("999.00"),
            fecha=date(2026, 8, 20),
        )
        CostoDirecto.objects.create(
            contrato=contrato_anterior,
            concepto="Catering julio",
            valor=Decimal("500.00"),
            fecha=date(2026, 8, 5),
        )
        GastoFijoMensual.objects.create(
            concepto="Arriendo",
            valor=Decimal("300.00"),
            mes=8,
            anio=2026,
        )
        GastoFijoMensual.objects.create(
            concepto="Internet",
            valor=Decimal("100.00"),
            mes=8,
            anio=2026,
        )
        GastoFijoMensual.objects.create(
            concepto="Gasto eliminado",
            valor=Decimal("999.00"),
            mes=8,
            anio=2026,
            eliminado=True,
        )
        GastoFijoMensual.objects.create(
            concepto="Arriendo julio",
            valor=Decimal("100.00"),
            mes=7,
            anio=2026,
        )

        response = self.client.get(
            "/api/dashboard-financiero/",
            {"mes": 8, "anio": 2026},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["periodo"]["mes"], 8)
        self.assertEqual(response.data["metricas"]["ingresos_mes"], "3000.00")
        self.assertEqual(response.data["metricas"]["costos_directos_mes"], "900.00")
        self.assertEqual(response.data["metricas"]["utilidad_bruta"], "2100.00")
        self.assertEqual(response.data["metricas"]["margen_bruto"], "70.00")
        self.assertEqual(response.data["metricas"]["gastos_fijos_mes"], "400.00")
        self.assertEqual(response.data["metricas"]["utilidad_neta"], "1700.00")
        self.assertEqual(response.data["metricas"]["margen_neto"], "56.67")
        self.assertEqual(response.data["metricas"]["ticket_promedio"], "1500.00")
        self.assertEqual(response.data["metricas"]["contratos_confirmados"], 2)
        self.assertEqual(len(response.data["kpis"]), 6)
        self.assertEqual(response.data["estado_pagos"]["monto_abonado"], "1500.00")
        self.assertEqual(response.data["estado_pagos"]["saldo_pendiente"], "1500.00")
        self.assertEqual(response.data["estado_pagos"]["cancelado"], 1)
        self.assertEqual(
            response.data["estado_pagos"]["cancelados"]["valor_total_control"],
            "3000.00",
        )
        self.assertEqual(
            {item["contrato_id"] for item in response.data["rentabilidad_eventos"]},
            {contrato_1.id, contrato_2.id},
        )
        self.assertNotIn(
            contrato_cancelado.id,
            {item["contrato_id"] for item in response.data["rentabilidad_eventos"]},
        )
        self.assertEqual(
            response.data["comparacion_mes_anterior"]["variaciones"]["ingresos_mes"]["delta"],
            "1500.00",
        )
        self.assertEqual(
            response.data["comparacion_mes_anterior"]["variaciones"]["ingresos_mes"]["porcentaje"],
            "100.00",
        )
        self.assertEqual(
            response.data["comparacion_mes_anterior"]["variaciones"]["costos_directos_mes"]["delta"],
            "400.00",
        )
        self.assertEqual(
            response.data["desempeno_comercial"]["paquete_mas_vendido"]["nombre"],
            "Alquiler",
        )
        self.assertEqual(
            response.data["desempeno_comercial"]["paquete_mas_vendido"]["contratos"],
            2,
        )
        self.assertEqual(
            response.data["desempeno_comercial"]["tipo_evento_mas_frecuente"]["nombre"],
            "Boda",
        )
        self.assertEqual(
            response.data["desempeno_comercial"]["paquete_mas_rentable"]["nombre"],
            "Alquiler",
        )
        self.assertEqual(
            response.data["desempeno_comercial"]["tipo_evento_mas_rentable"]["nombre"],
            "Boda",
        )
        self.assertEqual(len(response.data["evolucion_mensual"]), 6)
        self.assertEqual(
            response.data["comparativo_mes_anterior"]["categorias"][0]["key"],
            "ingresos_mes",
        )
        self.assertEqual(
            response.data["pendientes_financieros"]["monto_total_pendiente"],
            "1500.00",
        )

    def test_dashboard_financiero_maneja_periodo_sin_ingresos(self):
        GastoFijoMensual.objects.create(
            concepto="Arriendo",
            valor=Decimal("250.00"),
            mes=10,
            anio=2026,
        )

        response = self.client.get(
            "/api/dashboard-financiero/",
            {"mes": 10, "anio": 2026},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["metricas"]["ingresos_mes"], "0.00")
        self.assertEqual(response.data["metricas"]["utilidad_neta"], "-250.00")
        self.assertEqual(response.data["metricas"]["margen_neto"], "0.00")
        self.assertEqual(response.data["rentabilidad_eventos"], [])
        self.assertEqual(
            response.data["desempeno_comercial"],
            {
                "paquete_mas_vendido": None,
                "paquete_mas_rentable": None,
                "tipo_evento_mas_frecuente": None,
                "tipo_evento_mas_rentable": None,
            },
        )
        self.assertEqual(response.data["estado_pagos"]["total_contratos"], 0)
        self.assertEqual(response.data["interpretacion"]["nivel"], "neutral")

    def test_dashboard_financiero_rechaza_mes_invalido(self):
        response = self.client.get(
            "/api/dashboard-financiero/",
            {"mes": 13, "anio": 2026},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("mes", response.data)
