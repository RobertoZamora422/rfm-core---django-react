from django.core.management.base import BaseCommand

from negocio.management.demo_data import clear_demo_data


class Command(BaseCommand):
    help = "Elimina únicamente datos marcados como demo."

    def handle(self, *args, **options):
        counts = clear_demo_data()

        self.stdout.write(self.style.SUCCESS("Datos demo eliminados."))
        self.stdout.write(f"Clientes eliminados: {counts['clientes']}")
        self.stdout.write(f"Cotizaciones eliminadas: {counts['cotizaciones']}")
        self.stdout.write(f"Contratos eliminados: {counts['contratos']}")
        self.stdout.write(f"Costos directos eliminados: {counts['costos_directos']}")
        self.stdout.write(f"Gastos fijos eliminados: {counts['gastos_fijos']}")
