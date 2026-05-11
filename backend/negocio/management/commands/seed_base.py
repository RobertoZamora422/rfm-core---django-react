from django.core.management.base import BaseCommand

from negocio.management.demo_data import seed_base_data


class Command(BaseCommand):
    help = "Crea o actualiza datos base necesarios para operar RFM Core."

    def handle(self, *args, **options):
        counts = seed_base_data()

        self.stdout.write(self.style.SUCCESS("Datos base verificados."))
        self.stdout.write(f"Tipos de evento creados: {counts['tipos_evento']}")
        self.stdout.write(f"Paquetes creados: {counts['paquetes']}")
        self.stdout.write(f"Configuraciones creadas: {counts['configuraciones']}")
