from django.core.management.base import BaseCommand
from django.db import transaction

from comercial.models import Cotizacion
from financiero.models import Contrato, CostoDirecto, GastoFijoMensual
from negocio.models import NombrePersona, Paquete, Persona, TipoEvento


def contar_datos_operativos():
    return {
        "personas": Persona.objects.count(),
        "alias": NombrePersona.objects.count(),
        "cotizaciones": Cotizacion.objects.count(),
        "contratos": Contrato.objects.count(),
        "tipos_evento": TipoEvento.objects.count(),
        "paquetes": Paquete.objects.count(),
        "costos_directos": CostoDirecto.objects.count(),
        "gastos_fijos": GastoFijoMensual.objects.count(),
    }


@transaction.atomic
def eliminar_datos_operativos():
    CostoDirecto.objects.all().delete()
    GastoFijoMensual.objects.all().delete()
    Contrato.objects.all().delete()
    Cotizacion.objects.all().delete()
    NombrePersona.objects.all().delete()
    Persona.objects.all().delete()
    Paquete.objects.all().delete()
    TipoEvento.objects.all().delete()


class Command(BaseCommand):
    help = (
        "Audita o elimina los datos operativos, conservando usuarios y configuración del negocio."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Ejecuta explícitamente la limpieza transaccional.",
        )

    def handle(self, *args, **options):
        antes = contar_datos_operativos()
        modo = "EJECUCIÓN" if options["execute"] else "SIMULACIÓN"
        self.stdout.write(self.style.MIGRATE_HEADING(f"{modo} DE LIMPIEZA OPERATIVA"))
        for nombre, cantidad in antes.items():
            self.stdout.write(f"{nombre}: {cantidad}")

        if not options["execute"]:
            self.stdout.write(
                self.style.WARNING(
                    "No se modificaron datos. Use --execute para confirmar la limpieza."
                )
            )
            return

        eliminar_datos_operativos()
        despues = contar_datos_operativos()
        if any(despues.values()):
            raise RuntimeError("La limpieza operativa no dejó todas las colecciones vacías.")
        self.stdout.write(
            self.style.SUCCESS(
                "Datos operativos eliminados. Usuarios y configuración no fueron modificados."
            )
        )
