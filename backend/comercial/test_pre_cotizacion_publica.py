from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from negocio.models import (
    BeneficioPaquete,
    ConfiguracionNegocio,
    Paquete,
    Persona,
    TipoEvento,
)

from .models import Cotizacion


class PreCotizacionPublicaValidationTests(APITestCase):
    def setUp(self):
        self.tipo_evento = TipoEvento.objects.create(nombre="Boda pública")
        self.tipo_evento_inactivo = TipoEvento.objects.create(
            nombre="Evento inactivo",
            activo=False,
        )
        ConfiguracionNegocio.objects.create(
            nombre_negocio="Rancho Flor María",
            tarifa_base_alquiler=Decimal("1000.00"),
            invitados_incluidos_alquiler=100,
            costo_invitado_adicional=Decimal("12.50"),
            whatsapp_negocio="0991234567",
        )
        self.paquete = Paquete.objects.create(
            nombre="Celebración integral",
            precio_por_persona=Decimal("20.00"),
        )
        self.beneficio_principal = BeneficioPaquete.objects.create(
            paquete=None,
            tipo=BeneficioPaquete.Tipo.PRINCIPAL,
            titulo="Jardín iluminado",
            detalle="Entorno natural preparado para la celebración.",
            orden=1,
        )
        BeneficioPaquete.objects.create(
            paquete=None,
            tipo=BeneficioPaquete.Tipo.DETALLE,
            titulo="Detalle operativo",
            orden=2,
        )

    def payload(self, **overrides):
        payload = {
            "nombre_persona": "Ana María",
            "telefono_persona": "0912345678",
            "tipo_evento": self.tipo_evento.id,
            "fecha_tentativa": (timezone.localdate() + timedelta(days=30)).isoformat(),
            "numero_invitados": 120,
            "tipo_servicio": Cotizacion.TipoServicioInteres.ALQUILER,
        }
        payload.update(overrides)
        return payload

    def post(self, **overrides):
        return self.client.post(
            "/api/pre-cotizacion/",
            self.payload(**overrides),
            format="json",
        )

    def test_nombre_vacio_simbolos_y_menos_de_tres_letras_se_rechaza(self):
        for index, nombre in enumerate(("", ".", "---", "A", "Jo", "A1a"), start=1):
            with self.subTest(nombre=nombre):
                response = self.post(
                    nombre_persona=nombre,
                    telefono_persona=f"09810000{index:02d}",
                )
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.data["nombre_persona"][0], "Ingrese su nombre.")

    def test_nombres_espanoles_con_espacios_apostrofes_y_guiones_son_validos(self):
        nombres = ("Bob", "Ale", "Ana María", "José", "María-José", "D’Angelo")
        for index, nombre in enumerate(nombres, start=1):
            with self.subTest(nombre=nombre):
                response = self.post(
                    nombre_persona=f"  {nombre}  ",
                    telefono_persona=f"09820000{index:02d}",
                )
                self.assertEqual(response.status_code, 201)
                self.assertEqual(response.data["cotizacion"]["persona_nombre"], nombre)

    def test_telefono_nacional_e_internacional_comparten_identidad_canonica(self):
        nacional = self.post(
            nombre_persona="Ana Zamora",
            telefono_persona="0912345678",
        )
        internacional = self.post(
            nombre_persona="Ana Zeta",
            telefono_persona="+593 91 234-5678",
        )

        self.assertEqual(nacional.status_code, 201)
        self.assertEqual(internacional.status_code, 201)
        self.assertEqual(Persona.objects.count(), 1)
        persona = Persona.objects.get()
        self.assertEqual(persona.telefono, "0912345678")
        self.assertEqual(persona.telefono_normalizado, "0912345678")
        self.assertEqual(
            nacional.data["cotizacion"]["persona"],
            internacional.data["cotizacion"]["persona"],
        )

    def test_telefonos_con_prefijo_longitud_o_caracteres_invalidos_se_rechazan(self):
        invalidos = (
            "0223456789",
            "091234567",
            "09123456789",
            "0593912345678",
            "593812345678",
            "59391234567",
            "5939123456789",
            "09ABC45678",
            "0912.345678",
        )
        for index, telefono in enumerate(invalidos, start=1):
            with self.subTest(telefono=telefono):
                response = self.post(
                    telefono_persona=telefono,
                    nombre_persona="Persona Válida",
                )
                self.assertEqual(response.status_code, 400)
                self.assertEqual(
                    response.data["telefono_persona"][0],
                    "Ingrese su teléfono para validar su solicitud.",
                )

    def test_fecha_pasada_se_rechaza_y_fecha_actual_o_futura_se_acepta(self):
        hoy = timezone.localdate()
        pasada = self.post(
            fecha_tentativa=(hoy - timedelta(days=1)).isoformat(),
            telefono_persona="0983000001",
        )
        actual = self.post(
            fecha_tentativa=hoy.isoformat(),
            telefono_persona="0983000002",
        )
        futura = self.post(
            fecha_tentativa=(hoy + timedelta(days=1)).isoformat(),
            telefono_persona="0983000003",
        )

        self.assertEqual(pasada.status_code, 400)
        self.assertEqual(
            pasada.data["fecha_tentativa"][0],
            "Seleccione una fecha válida.",
        )
        self.assertEqual(actual.status_code, 201)
        self.assertEqual(futura.status_code, 201)

    def test_invitados_deben_ser_un_entero_mayor_que_cero(self):
        for index, invitados in enumerate((0, -1, 10.5, "10.5", "texto", None), start=1):
            with self.subTest(invitados=invitados):
                response = self.post(
                    numero_invitados=invitados,
                    telefono_persona=f"09840000{index:02d}",
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn("numero_invitados", response.data)

    def test_modalidad_es_obligatoria_y_tipo_evento_debe_estar_activo(self):
        sin_modalidad = self.post(tipo_servicio="", telefono_persona="0985000001")
        evento_inactivo = self.post(
            tipo_evento=self.tipo_evento_inactivo.id,
            telefono_persona="0985000002",
        )

        self.assertEqual(sin_modalidad.status_code, 400)
        self.assertIn("tipo_servicio", sin_modalidad.data)
        self.assertEqual(evento_inactivo.status_code, 400)
        self.assertIn("tipo_evento", evento_inactivo.data)

    def test_servicio_completo_persiste_una_sola_vez_y_paquete_es_opcional(self):
        payload = self.payload(
            telefono_persona="0986000001",
            tipo_servicio=Cotizacion.TipoServicioInteres.SERVICIO_COMPLETO,
            paquete=None,
        )
        primera = self.client.post("/api/pre-cotizacion/", payload, format="json")
        segunda = self.client.post(
            "/api/pre-cotizacion/",
            {
                **payload,
                "solicitud_token": primera.data["solicitud_token"],
                "paquete": self.paquete.id,
            },
            format="json",
        )

        self.assertEqual(primera.status_code, 201)
        self.assertIsNone(primera.data["cotizacion"]["paquete"])
        self.assertEqual(segunda.status_code, 200)
        self.assertEqual(segunda.data["cotizacion"]["paquete"], self.paquete.id)
        self.assertIn(
            f"Paquete preferido: {self.paquete.nombre}",
            segunda.data["whatsapp"]["principal"]["mensaje"],
        )
        self.assertNotIn(
            "Aún no he elegido un paquete.",
            segunda.data["whatsapp"]["principal"]["mensaje"],
        )
        self.assertEqual(Cotizacion.objects.count(), 1)

    def test_calculo_adicional_y_beneficios_principales_provienen_del_backend(self):
        response = self.post(numero_invitados=125, telefono_persona="0987000001")
        calculo = response.data["calculo"]

        self.assertEqual(response.status_code, 201)
        self.assertEqual(calculo["invitados_incluidos_alquiler"], 100)
        self.assertEqual(calculo["invitados_adicionales"], 25)
        self.assertEqual(calculo["costo_invitado_adicional"], "12.50")
        self.assertEqual(calculo["costo_adicional"], "312.50")
        self.assertEqual(calculo["total_estimado"], "1312.50")
        self.assertEqual(
            calculo["beneficios_principales"],
            [
                {
                    "id": self.beneficio_principal.id,
                    "tipo": "principal",
                    "tipo_display": "Beneficio principal",
                    "titulo": "Jardín iluminado",
                    "detalle": "Entorno natural preparado para la celebración.",
                    "orden": 1,
                    "minimo_invitados": None,
                    "maximo_invitados": None,
                }
            ],
        )
        self.assertEqual(
            response.data["cotizacion"]["oferta_snapshot"]["alquiler"][
                "beneficios_principales"
            ],
            calculo["beneficios_principales"],
        )
