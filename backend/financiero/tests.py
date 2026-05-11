from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

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
