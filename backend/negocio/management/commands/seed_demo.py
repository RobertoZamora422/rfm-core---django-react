from django.core.management.base import BaseCommand

from negocio.management.demo_data import seed_demo_data


class Command(BaseCommand):
    help = "Crea datos demo idempotentes para probar el sistema."

    def handle(self, *args, **options):
        counts = seed_demo_data()

        self.stdout.write(self.style.SUCCESS("Datos demo regenerados."))
        self.stdout.write(f"Clientes demo: {counts['clientes']}")
        self.stdout.write(f"Cotizaciones demo: {counts['cotizaciones']}")
        self.stdout.write(f"Contratos demo: {counts['contratos']}")
        self.stdout.write(f"Costos directos demo: {counts['costos_directos']}")
        self.stdout.write(f"Gastos fijos demo: {counts['gastos_fijos']}")
