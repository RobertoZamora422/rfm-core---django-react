from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from negocio.models import Cliente, Paquete, TipoEvento

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
