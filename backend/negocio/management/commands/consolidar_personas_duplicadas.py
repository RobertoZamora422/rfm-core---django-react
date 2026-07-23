from django.core.management.base import BaseCommand, CommandError

from negocio.persona_services import (
    consolidar_personas_duplicadas,
    planificar_consolidacion_personas,
)


class Command(BaseCommand):
    help = "Audita o consolida personas que comparten el mismo teléfono normalizado."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Muestra el plan sin modificar información (comportamiento predeterminado).",
        )
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Ejecuta explícitamente la consolidación transaccional.",
        )

    def handle(self, *args, **options):
        if options["dry_run"] and options["execute"]:
            raise CommandError("Use --dry-run o --execute, no ambos.")

        execute = options["execute"]
        plans = planificar_consolidacion_personas()
        mode = "EJECUCIÓN" if execute else "SIMULACIÓN"
        self.stdout.write(self.style.MIGRATE_HEADING(f"{mode} DE CONSOLIDACIÓN"))

        if not plans:
            self.stdout.write(self.style.SUCCESS("No se encontraron personas duplicadas."))
            return

        total_duplicates = 0
        total_quotes = 0
        total_contracts = 0
        for plan in plans:
            total_duplicates += len(plan["duplicados_ids"])
            total_quotes += plan["cotizaciones_a_reasignar"]
            total_contracts += plan["contratos_a_reasignar"]
            self.stdout.write(
                f"Teléfono {plan['telefono_normalizado']}: conservar #{plan['canonica_id']} "
                f"({plan['canonica_nombre']}); consolidar {plan['duplicados_ids']}."
            )
            self.stdout.write(
                f"  Relaciones: {plan['cotizaciones_a_reasignar']} cotizaciones, "
                f"{plan['contratos_a_reasignar']} contratos."
            )
            self.stdout.write(f"  Nombres conservados: {', '.join(plan['nombres'])}.")
            if plan["conflictos"]:
                self.stdout.write(
                    self.style.WARNING(
                        f"  Conflictos: {', '.join(plan['conflictos'])}."
                    )
                )

        self.stdout.write(
            f"Resumen: {len(plans)} grupos, {total_duplicates} duplicados, "
            f"{total_quotes} cotizaciones y {total_contracts} contratos por reasignar."
        )

        if not execute:
            self.stdout.write(
                self.style.WARNING(
                    "No se modificaron datos. Ejecute nuevamente con --execute para aplicar el plan."
                )
            )
            return

        consolidar_personas_duplicadas()
        self.stdout.write(self.style.SUCCESS("Consolidación completada dentro de una transacción."))
