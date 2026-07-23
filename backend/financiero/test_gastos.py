from datetime import date
from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from negocio.models import Persona, TipoEvento

from .models import (
    Contrato,
    CostoDirecto,
    GastoAdicional,
    GastoRecurrente,
    GastoRecurrenteAjuste,
)


def shift_month(period, months):
    absolute = period.year * 12 + period.month - 1 + months
    return date(absolute // 12, absolute % 12 + 1, 1)


def period_params(period):
    return {"mes": period.month, "anio": period.year}


class GastosDomainApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="gastos-admin",
            password="test-pass",
        )
        self.client.force_authenticate(self.user)
        self.current = timezone.localdate().replace(day=1)

    def create_recurring(
        self,
        *,
        concept="Internet",
        value="45.00",
        start=None,
        end=None,
    ):
        payload = {
            "concepto": concept,
            "valor_mensual": value,
            "aplicar_desde": (start or self.current).strftime("%Y-%m"),
            "aplicar_hasta": end.strftime("%Y-%m") if end else None,
            "observaciones": "",
        }
        response = self.client.post(
            "/api/gastos-recurrentes/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def summary(self, period):
        response = self.client.get("/api/gastos/resumen/", period_params(period))
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_recurrencia_se_registra_una_vez_y_respeta_vigencia(self):
        start = shift_month(self.current, -1)
        end = shift_month(self.current, 1)
        recurring = self.create_recurring(start=start, end=end)

        self.assertEqual(GastoRecurrente.objects.count(), 1)
        self.assertEqual(
            self.summary(shift_month(start, -1))[
                "gastos_fijos_recurrentes_periodo"
            ],
            "0.00",
        )
        for period in (start, self.current, end):
            with self.subTest(period=period):
                summary = self.summary(period)
                self.assertEqual(
                    summary["gastos_fijos_recurrentes_periodo"],
                    "45.00",
                )
                self.assertEqual(summary["gastos_recurrentes_aplicados"], 1)
        self.assertEqual(
            self.summary(shift_month(end, 1))[
                "gastos_fijos_recurrentes_periodo"
            ],
            "0.00",
        )
        self.assertEqual(recurring["concepto"], "Internet")

    def test_recurrencia_indefinida_aparece_en_meses_posteriores(self):
        self.create_recurring(start=shift_month(self.current, -6))
        future = shift_month(self.current, 18)

        self.assertEqual(
            self.summary(future)["gastos_fijos_recurrentes_periodo"],
            "45.00",
        )

    def test_cambio_desde_periodo_no_altera_meses_anteriores(self):
        previous = shift_month(self.current, -1)
        next_period = shift_month(self.current, 1)
        recurring = self.create_recurring(start=previous)

        response = self.client.post(
            f"/api/gastos-recurrentes/{recurring['id']}/ajustar-desde/",
            {"periodo": next_period.strftime("%Y-%m"), "valor_mensual": "50.00"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            self.summary(previous)["gastos_fijos_recurrentes_periodo"],
            "45.00",
        )
        self.assertEqual(
            self.summary(self.current)["gastos_fijos_recurrentes_periodo"],
            "45.00",
        )
        self.assertEqual(
            self.summary(next_period)["gastos_fijos_recurrentes_periodo"],
            "50.00",
        )

    def test_ajuste_de_un_periodo_no_modifica_otros_meses_ni_se_duplica(self):
        previous = shift_month(self.current, -1)
        next_period = shift_month(self.current, 1)
        recurring = self.create_recurring(start=previous)
        url = f"/api/gastos-recurrentes/{recurring['id']}/ajustar-periodo/"

        first = self.client.post(
            url,
            {
                "periodo": self.current.strftime("%Y-%m"),
                "valor": "48.00",
                "observaciones": "Consumo excepcional",
            },
            format="json",
        )
        second = self.client.post(
            url,
            {
                "periodo": self.current.strftime("%Y-%m"),
                "valor": "47.00",
                "observaciones": "Corrección",
            },
            format="json",
        )

        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(GastoRecurrenteAjuste.objects.count(), 1)
        self.assertEqual(
            self.summary(previous)["gastos_fijos_recurrentes_periodo"],
            "45.00",
        )
        current_summary = self.summary(self.current)
        self.assertEqual(
            current_summary["gastos_fijos_recurrentes_periodo"],
            "47.00",
        )
        self.assertTrue(current_summary["recurrentes"][0]["es_ajuste"])
        self.assertEqual(
            self.summary(next_period)["gastos_fijos_recurrentes_periodo"],
            "45.00",
        )

    def test_restriccion_unica_impide_doble_ajuste_mensual(self):
        recurring = self.create_recurring()
        gasto = GastoRecurrente.objects.get(pk=recurring["id"])
        GastoRecurrenteAjuste.objects.create(
            gasto_recurrente=gasto,
            periodo=self.current,
            valor=Decimal("48.00"),
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            GastoRecurrenteAjuste.objects.bulk_create(
                [
                    GastoRecurrenteAjuste(
                        gasto_recurrente=gasto,
                        periodo=self.current,
                        valor=Decimal("49.00"),
                    )
                ]
            )

    def test_desactivar_conserva_historia_y_excluye_periodos_futuros(self):
        previous = shift_month(self.current, -1)
        next_period = shift_month(self.current, 1)
        recurring = self.create_recurring(start=previous)

        response = self.client.post(
            f"/api/gastos-recurrentes/{recurring['id']}/desactivar/",
            {"periodo_desde": next_period.strftime("%Y-%m")},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data["activo"])
        self.assertEqual(
            self.summary(previous)["gastos_fijos_recurrentes_periodo"],
            "45.00",
        )
        self.assertEqual(
            self.summary(self.current)["gastos_fijos_recurrentes_periodo"],
            "45.00",
        )
        self.assertEqual(
            self.summary(next_period)["gastos_fijos_recurrentes_periodo"],
            "0.00",
        )

    def test_reactivar_crea_una_nueva_vigencia_sin_llenar_el_intervalo_inactivo(self):
        previous = shift_month(self.current, -1)
        next_period = shift_month(self.current, 1)
        reactivation_period = shift_month(self.current, 2)
        recurring = self.create_recurring(start=previous)
        self.client.post(
            f"/api/gastos-recurrentes/{recurring['id']}/desactivar/",
            {"periodo_desde": next_period.strftime("%Y-%m")},
            format="json",
        )

        response = self.client.post(
            f"/api/gastos-recurrentes/{recurring['id']}/reactivar/",
            {
                "periodo_desde": reactivation_period.strftime("%Y-%m"),
                "valor_mensual": "55.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["activo"])
        self.assertEqual(
            self.summary(self.current)["gastos_fijos_recurrentes_periodo"],
            "45.00",
        )
        self.assertEqual(
            self.summary(next_period)["gastos_fijos_recurrentes_periodo"],
            "0.00",
        )
        self.assertEqual(
            self.summary(reactivation_period)["gastos_fijos_recurrentes_periodo"],
            "55.00",
        )

    def test_gasto_adicional_afecta_solo_su_periodo_y_eliminacion_es_logica(self):
        response = self.client.post(
            "/api/gastos-adicionales/",
            {
                "concepto": "Reparación de tubería",
                "valor": "80.00",
                "fecha": self.current.replace(day=15).isoformat(),
                "observaciones": "",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        gasto_id = response.data["id"]

        self.assertEqual(
            self.summary(self.current)["gastos_adicionales_periodo"],
            "80.00",
        )
        self.assertEqual(
            self.summary(shift_month(self.current, 1))[
                "gastos_adicionales_periodo"
            ],
            "0.00",
        )

        deleted = self.client.delete(f"/api/gastos-adicionales/{gasto_id}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertTrue(GastoAdicional.objects.get(pk=gasto_id).eliminado)
        self.assertEqual(
            self.summary(self.current)["total_gastos_operativos_periodo"],
            "0.00",
        )

    def test_dashboard_reporte_y_totales_desglosan_ambos_tipos(self):
        self.create_recurring(value="100.00")
        self.client.post(
            "/api/gastos-adicionales/",
            {
                "concepto": "Publicidad puntual",
                "valor": "50.00",
                "fecha": self.current.replace(day=10).isoformat(),
            },
            format="json",
        )
        persona = Persona.objects.create(
            nombre="Cliente Gastos",
            telefono="+593 99 555 9000",
        )
        event_type = TipoEvento.objects.create(nombre="Evento gastos")
        contract = Contrato.objects.create(
            persona=persona,
            tipo_evento=event_type,
            fecha_evento=self.current.replace(day=20),
            numero_invitados=20,
            valor_final=Decimal("1000.00"),
            monto_abonado=Decimal("1000.00"),
        )
        CostoDirecto.objects.create(
            contrato=contract,
            concepto="Costo directo",
            valor=Decimal("200.00"),
            fecha=self.current.replace(day=20),
        )

        dashboard = self.client.get(
            "/api/dashboard-financiero/",
            period_params(self.current),
        )
        report = self.client.get(
            "/api/reportes/financiero/",
            period_params(self.current),
        )

        self.assertEqual(dashboard.status_code, 200)
        metrics = dashboard.data["metricas"]
        self.assertEqual(metrics["gastos_fijos_recurrentes_periodo"], "100.00")
        self.assertEqual(metrics["gastos_adicionales_periodo"], "50.00")
        self.assertEqual(metrics["total_gastos_operativos_periodo"], "150.00")
        self.assertEqual(metrics["utilidad_neta"], "650.00")
        self.assertEqual(metrics["margen_neto"], "65.00")
        self.assertEqual(
            dashboard.data["comparacion_mes_anterior"]["variaciones"][
                "total_gastos_operativos_periodo"
            ]["delta"],
            "150.00",
        )
        self.assertEqual(report.status_code, 200)
        self.assertEqual(
            report.data["gastos_periodo"]["total_gastos_operativos_periodo"],
            "150.00",
        )
        self.assertEqual(len(report.data["gastos_periodo"]["recurrentes"]), 1)
        self.assertEqual(len(report.data["gastos_periodo"]["adicionales"]), 1)


class LegacyExpensesAuditCommandTests(TestCase):
    def create_legacy(self, concept, value, period, observations=""):
        return GastoAdicional.objects.create(
            concepto=concept,
            valor=Decimal(value),
            fecha=period,
            observaciones=observations,
            origen_legacy=True,
        )

    def test_dry_run_clasifica_sin_fusion_destructiva(self):
        for month in (1, 2, 3):
            self.create_legacy("Internet", "45.00", date(2026, month, 1))
        self.create_legacy("Mantenimiento", "100.00", date(2026, 1, 1))
        self.create_legacy("Mantenimiento", "250.00", date(2026, 8, 1))
        self.create_legacy("Trámite", "80.00", date(2026, 5, 1))
        output = StringIO()

        call_command("auditar_gastos_legacy", stdout=output)

        report = output.getvalue()
        self.assertIn("Registros analizados: 6", report)
        self.assertIn("Posibles recurrencias: 1", report)
        self.assertIn("Casos ambiguos: 1", report)
        self.assertIn("Gastos adicionales identificados: 1", report)
        self.assertEqual(GastoRecurrente.objects.count(), 0)
        self.assertEqual(GastoAdicional.objects.filter(eliminado=False).count(), 6)

    def test_apply_explicito_preserva_importes_y_no_convierte_ambiguos(self):
        for month in (1, 2, 3):
            self.create_legacy("Internet", "45.00", date(2026, month, 1))
        self.create_legacy("Mantenimiento", "100.00", date(2026, 1, 1))
        self.create_legacy("Mantenimiento", "250.00", date(2026, 8, 1))

        call_command(
            "auditar_gastos_legacy",
            "--apply",
            "--concepto",
            "Internet",
            stdout=StringIO(),
        )

        recurring = GastoRecurrente.objects.get()
        self.assertEqual(recurring.inicio_periodo, date(2026, 1, 1))
        self.assertEqual(recurring.fin_periodo, date(2026, 3, 1))
        self.assertEqual(
            GastoAdicional.objects.filter(
                concepto="Internet",
                eliminado=True,
            ).count(),
            3,
        )
        self.assertEqual(
            GastoAdicional.objects.filter(
                concepto="Mantenimiento",
                eliminado=False,
            ).count(),
            2,
        )
