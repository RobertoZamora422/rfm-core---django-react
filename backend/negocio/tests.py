from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from .models import Cliente, ConfiguracionNegocio, Paquete, TipoEvento


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
            capacidad_maxima=200,
            activo=True,
        )

        with self.assertRaises(ValidationError):
            ConfiguracionNegocio.objects.create(
                nombre_negocio="RFM secundaria",
                tarifa_base_alquiler=Decimal("1200.00"),
                invitados_incluidos_alquiler=60,
                costo_invitado_adicional=Decimal("12.00"),
                capacidad_maxima=220,
                activo=True,
            )
