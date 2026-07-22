from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from comercial.models import Cotizacion
from financiero.models import Contrato, CostoDirecto, GastoFijoMensual
from .models import Cliente, ConfiguracionNegocio, Paquete, TipoEvento
from .validators import normalizar_whatsapp_ecuador


class NegocioModelTests(TestCase):
    def test_cliente_requiere_telefono_valido(self):
        cliente = Cliente(nombre="Cliente Test", telefono="abc")

        with self.assertRaises(ValidationError):
            cliente.save()

    def test_tipo_evento_no_duplica_nombre(self):
        TipoEvento.objects.create(nombre="Boda")

        with self.assertRaises(ValidationError):
            TipoEvento.objects.create(nombre="Boda")

    def test_servicio_completo_requiere_precio_por_persona(self):
        paquete = Paquete(
            nombre="Paquete completo",
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            precio_por_persona=Decimal("0.00"),
        )

        with self.assertRaises(ValidationError):
            paquete.save()

    def test_configuracion_negocio_activa_es_unica(self):
        ConfiguracionNegocio.objects.create(
            nombre_negocio="RFM",
            tarifa_base_alquiler=Decimal("1000.00"),
            invitados_incluidos_alquiler=50,
            costo_invitado_adicional=Decimal("10.00"),
            whatsapp_negocio="0991234567",
            activo=True,
        )

        with self.assertRaises(ValidationError):
            ConfiguracionNegocio.objects.create(
                nombre_negocio="RFM secundaria",
                tarifa_base_alquiler=Decimal("1200.00"),
                invitados_incluidos_alquiler=60,
                costo_invitado_adicional=Decimal("12.00"),
                whatsapp_negocio="0997654321",
                activo=True,
            )

    def test_configuracion_negocio_acepta_whatsapp_local_valido(self):
        configuracion = ConfiguracionNegocio.objects.create(
            nombre_negocio="RFM",
            tarifa_base_alquiler=Decimal("1000.00"),
            invitados_incluidos_alquiler=50,
            costo_invitado_adicional=Decimal("10.00"),
            whatsapp_negocio="0991234567",
            activo=True,
        )

        self.assertEqual(configuracion.whatsapp_numero_url, "593991234567")

    def test_configuracion_negocio_rechaza_whatsapp_invalido(self):
        invalidos = [
            "991234567",
            "593991234567",
            "099-123-4567",
            "099 123 4567",
            "abc123",
        ]

        for numero in invalidos:
            with self.subTest(numero=numero):
                configuracion = ConfiguracionNegocio(
                    nombre_negocio=f"RFM {numero}",
                    tarifa_base_alquiler=Decimal("1000.00"),
                    invitados_incluidos_alquiler=50,
                    costo_invitado_adicional=Decimal("10.00"),
                    whatsapp_negocio=numero,
                    activo=True,
                )
                with self.assertRaises(ValidationError):
                    configuracion.full_clean()

    def test_configuracion_negocio_no_puede_quedar_inactiva(self):
        configuracion = ConfiguracionNegocio(
            nombre_negocio="RFM",
            tarifa_base_alquiler=Decimal("1000.00"),
            invitados_incluidos_alquiler=50,
            costo_invitado_adicional=Decimal("10.00"),
            whatsapp_negocio="0991234567",
            activo=False,
        )

        with self.assertRaises(ValidationError):
            configuracion.save()

    def test_normalizar_whatsapp_ecuador(self):
        self.assertEqual(
            normalizar_whatsapp_ecuador("0991234567"),
            "593991234567",
        )


class SeedCommandTests(TestCase):
    def call_command(self, name):
        output = StringIO()
        call_command(name, stdout=output)
        return output.getvalue()

    def test_seed_base_es_idempotente(self):
        self.call_command("seed_base")
        self.call_command("seed_base")

        self.assertEqual(TipoEvento.objects.count(), 5)
        self.assertEqual(Paquete.objects.count(), 3)
        self.assertEqual(ConfiguracionNegocio.objects.filter(activo=True).count(), 1)
        self.assertEqual(
            ConfiguracionNegocio.objects.get(activo=True).whatsapp_negocio,
            "0991234567",
        )

    def test_seed_demo_es_idempotente(self):
        self.call_command("seed_demo")
        self.call_command("seed_demo")

        self.assertEqual(Cliente.objects.filter(es_demo=True).count(), 7)
        self.assertEqual(Cotizacion.objects.filter(es_demo=True).count(), 6)
        self.assertEqual(Contrato.objects.filter(es_demo=True).count(), 3)
        self.assertEqual(CostoDirecto.objects.filter(es_demo=True).count(), 4)
        self.assertEqual(GastoFijoMensual.objects.filter(es_demo=True).count(), 3)
        self.assertTrue(
            CostoDirecto.objects.filter(
                es_demo=True,
                contrato__estado_contrato=Contrato.EstadoContrato.CANCELADO,
            ).exists()
        )

    def test_clear_demo_no_elimina_datos_reales(self):
        self.call_command("seed_demo")
        Cliente.objects.create(
            nombre="Cliente Real",
            telefono="+593 988888888",
            correo="real@example.com",
        )

        self.call_command("clear_demo")

        self.assertEqual(Cliente.objects.filter(es_demo=True).count(), 0)
        self.assertTrue(Cliente.objects.filter(nombre="Cliente Real").exists())
        self.assertEqual(TipoEvento.objects.count(), 5)
        self.assertEqual(Paquete.objects.count(), 3)


class NegocioApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="admin",
            password="test-pass",
        )
        self.client.force_authenticate(self.user)

    def test_inicio_resumen_sin_datos_devuelve_ceros_y_estructuras_vacias(self):
        hoy = timezone.localdate()

        response = self.client.get("/api/inicio-resumen/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["fecha_referencia"], hoy.isoformat())
        kpis = {item["key"]: item["value"] for item in response.data["kpis"]}
        self.assertEqual(kpis["cotizaciones_nuevas"], 0)
        self.assertEqual(kpis["cotizaciones_mes"], 0)
        self.assertEqual(kpis["eventos_mes"], 0)
        self.assertEqual(kpis["eventos_proximos"], 0)
        self.assertEqual(
            response.data["resumen_operativo"],
            {
                "eventos_confirmados_semana": 0,
                "eventos_programados_mes": 0,
                "eventos_hoy": 0,
                "eventos_proximos_7_dias": 0,
                "frentes_con_atencion": 0,
            },
        )
        self.assertEqual(response.data["eventos_proximos"], [])
        self.assertEqual(response.data["pendientes_importantes"], [])

    def test_configuracion_negocio_ausente_no_provoca_error_500(self):
        list_response = self.client.get("/api/configuracion-negocio/")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data, [])

        self.client.force_authenticate(user=None)
        public_response = self.client.get("/api/public/configuracion/")

        self.assertEqual(public_response.status_code, 200)
        self.assertEqual(public_response.data, {})

    def test_catalogos_y_clientes_sin_registros_devuelven_lista_vacia(self):
        endpoints = [
            "/api/clientes/",
            "/api/paquetes/",
            "/api/tipos-evento/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data, [])

    def test_cliente_crud_basico(self):
        response = self.client.post(
            "/api/clientes/",
            {
                "nombre": "Cliente API",
                "telefono": "+593 999999111",
                "correo": "cliente.api@example.com",
                "observaciones": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["nombre"], "Cliente API")

        list_response = self.client.get("/api/clientes/")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)

    def test_cliente_api_valida_telefono(self):
        response = self.client.post(
            "/api/clientes/",
            {
                "nombre": "Cliente API",
                "telefono": "telefono-invalido",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("telefono", response.data)

    def test_configuracion_activa_es_unica_en_api(self):
        payload = {
            "nombre_negocio": "Rancho Flor Maria",
            "tarifa_base_alquiler": "1200.00",
            "invitados_incluidos_alquiler": 80,
            "costo_invitado_adicional": "12.00",
            "whatsapp_negocio": "0991234567",
            "activo": True,
        }

        first = self.client.post("/api/configuracion-negocio/", payload, format="json")
        second = self.client.post(
            "/api/configuracion-negocio/",
            {
                **payload,
                "nombre_negocio": "Otra configuracion",
                "whatsapp_negocio": "0997654321",
            },
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 400)
        self.assertIn("activo", second.data)
        self.assertEqual(ConfiguracionNegocio.objects.filter(activo=True).count(), 1)

    def test_configuracion_api_valida_whatsapp_negocio(self):
        response = self.client.post(
            "/api/configuracion-negocio/",
            {
                "nombre_negocio": "Rancho Flor Maria",
                "tarifa_base_alquiler": "1200.00",
                "invitados_incluidos_alquiler": 80,
                "costo_invitado_adicional": "12.00",
                "whatsapp_negocio": "593991234567",
                "activo": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("whatsapp_negocio", response.data)

    def test_configuracion_api_no_permite_desactivar_o_eliminar_vigente(self):
        configuracion = ConfiguracionNegocio.objects.create(
            nombre_negocio="Rancho Flor Maria",
            tarifa_base_alquiler=Decimal("1200.00"),
            invitados_incluidos_alquiler=80,
            costo_invitado_adicional=Decimal("12.00"),
            whatsapp_negocio="0991234567",
            activo=True,
        )

        patch_response = self.client.patch(
            f"/api/configuracion-negocio/{configuracion.id}/",
            {"activo": False},
            format="json",
        )
        delete_response = self.client.delete(
            f"/api/configuracion-negocio/{configuracion.id}/",
        )

        self.assertEqual(patch_response.status_code, 400)
        self.assertIn("activo", patch_response.data)
        self.assertEqual(delete_response.status_code, 400)
        configuracion.refresh_from_db()
        self.assertTrue(configuracion.activo)

    def test_configuracion_api_recupera_configuracion_heredada_inactiva(self):
        ConfiguracionNegocio.objects.bulk_create(
            [
                ConfiguracionNegocio(
                    nombre_negocio="Rancho Flor Maria",
                    tarifa_base_alquiler=Decimal("1200.00"),
                    invitados_incluidos_alquiler=80,
                    costo_invitado_adicional=Decimal("12.00"),
                    whatsapp_negocio="0991234567",
                    activo=False,
                )
            ]
        )
        configuracion = ConfiguracionNegocio.objects.get()

        response = self.client.patch(
            f"/api/configuracion-negocio/{configuracion.id}/",
            {"tarifa_base_alquiler": "1300.00"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        configuracion.refresh_from_db()
        self.assertTrue(configuracion.activo)
        self.assertEqual(configuracion.tarifa_base_alquiler, Decimal("1300.00"))

    def test_configuracion_publica_devuelve_whatsapp_numero_url(self):
        ConfiguracionNegocio.objects.create(
            nombre_negocio="Rancho Flor Maria",
            tarifa_base_alquiler=Decimal("1200.00"),
            invitados_incluidos_alquiler=80,
            costo_invitado_adicional=Decimal("12.00"),
            whatsapp_negocio="0991234567",
            activo=True,
        )
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/public/configuracion/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["whatsapp_numero_url"], "593991234567")
        self.assertNotIn("whatsapp_negocio", response.data)

    def test_inicio_resumen_usa_datos_reales_del_backend(self):
        hoy = timezone.localdate()
        cliente = Cliente.objects.create(
            nombre="Cliente Inicio",
            telefono="+593 999111222",
            correo="inicio@example.com",
        )
        tipo_evento = TipoEvento.objects.create(nombre="Boda inicio")
        paquete = Paquete.objects.create(
            nombre="Completo inicio",
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            precio_por_persona=Decimal("25.00"),
        )

        Cotizacion.objects.create(
            cliente=cliente,
            tipo_evento=tipo_evento,
            paquete=paquete,
            fecha_tentativa=hoy + timedelta(days=15),
            numero_invitados=100,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.NUEVA,
            total_estimado=Decimal("2500.00"),
        )
        Cotizacion.objects.create(
            cliente=cliente,
            tipo_evento=tipo_evento,
            paquete=paquete,
            fecha_tentativa=hoy + timedelta(days=30),
            numero_invitados=80,
            tipo_servicio=Paquete.TipoServicio.SERVICIO_COMPLETO,
            estado=Cotizacion.Estado.CONFIRMADA,
            total_estimado=Decimal("2000.00"),
        )

        contrato_proximo = Contrato.objects.create(
            cliente=cliente,
            tipo_evento=tipo_evento,
            paquete=paquete,
            fecha_evento=hoy,
            numero_invitados=100,
            valor_final=Decimal("2500.00"),
            monto_abonado=Decimal("500.00"),
            estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        )
        CostoDirecto.objects.create(
            contrato=contrato_proximo,
            concepto="Costo eliminado futuro",
            valor=Decimal("120.00"),
            fecha=hoy,
            eliminado=True,
            eliminado_en=timezone.now(),
        )
        Contrato.objects.create(
            cliente=cliente,
            tipo_evento=tipo_evento,
            paquete=paquete,
            fecha_evento=hoy + timedelta(days=8),
            numero_invitados=60,
            valor_final=Decimal("1500.00"),
            monto_abonado=Decimal("0.00"),
            estado_contrato=Contrato.EstadoContrato.CANCELADO,
        )
        contrato_sin_costos_activos = Contrato.objects.create(
            cliente=cliente,
            tipo_evento=tipo_evento,
            paquete=paquete,
            fecha_evento=hoy - timedelta(days=40),
            numero_invitados=90,
            valor_final=Decimal("2200.00"),
            monto_abonado=Decimal("2200.00"),
            estado_contrato=Contrato.EstadoContrato.CONFIRMADO,
        )
        CostoDirecto.objects.create(
            contrato=contrato_sin_costos_activos,
            concepto="Costo eliminado",
            valor=Decimal("300.00"),
            fecha=hoy - timedelta(days=38),
            eliminado=True,
            eliminado_en=timezone.now(),
        )

        response = self.client.get("/api/inicio-resumen/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["fecha_referencia"], hoy.isoformat())
        kpis = {item["key"]: item["value"] for item in response.data["kpis"]}
        kpi_details = {item["key"]: item["detail"] for item in response.data["kpis"]}
        self.assertEqual(kpis["cotizaciones_nuevas"], 1)
        self.assertEqual(kpis["cotizaciones_mes"], 2)
        self.assertEqual(kpis["eventos_mes"], 1)
        self.assertEqual(kpis["eventos_proximos"], 1)
        self.assertEqual(
            response.data["resumen_operativo"],
            {
                "eventos_confirmados_semana": 1,
                "eventos_programados_mes": 1,
                "eventos_hoy": 1,
                "eventos_proximos_7_dias": 1,
                "frentes_con_atencion": 4,
            },
        )
        self.assertEqual(
            kpi_details["cotizaciones_mes"],
            "Registradas en el mes actual",
        )
        self.assertEqual(
            kpi_details["eventos_mes"],
            "Confirmados en el mes actual",
        )
        self.assertEqual(
            response.data["eventos_proximos"][0]["contrato_id"],
            contrato_proximo.id,
        )
        self.assertEqual(
            response.data["eventos_proximos"][0]["paquete_nombre"],
            paquete.nombre,
        )
        pendientes_por_tipo = {
            item["tipo"]: item for item in response.data["pendientes_importantes"]
        }
        pending_types = {
            item["tipo"] for item in response.data["pendientes_importantes"]
        }
        self.assertIn("cotizaciones_nuevas", pending_types)
        self.assertIn("cotizaciones_sin_contrato", pending_types)
        self.assertIn("eventos_con_saldo", pending_types)
        self.assertIn("eventos_sin_costos", pending_types)
        self.assertEqual(pendientes_por_tipo["eventos_sin_costos"]["cantidad"], 1)
