from collections import defaultdict
from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from financiero.models import GastoAdicional, GastoRecurrente
from financiero.services import crear_gasto_recurrente


def normalizar_concepto(value):
    return " ".join((value or "").casefold().strip().split())


def siguiente_periodo(periodo):
    if periodo.month == 12:
        return date(periodo.year + 1, 1, 1)
    return date(periodo.year, periodo.month + 1, 1)


def son_periodos_consecutivos(periodos):
    return all(
        actual == siguiente_periodo(anterior)
        for anterior, actual in zip(periodos, periodos[1:])
    )


class Command(BaseCommand):
    help = (
        "Audita los gastos heredados del modelo mensual y, solo con selección "
        "explícita, convierte una serie inequívoca en recurrencia."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplica la conversión explícita indicada con --concepto.",
        )
        parser.add_argument(
            "--concepto",
            help="Concepto exacto que se desea convertir después de revisar el reporte.",
        )
        parser.add_argument(
            "--sin-fin",
            action="store_true",
            help="Deja la recurrencia sin finalización; requiere --apply.",
        )

    def handle(self, *args, **options):
        if options["apply"] and not options["concepto"]:
            raise CommandError("--apply requiere indicar --concepto.")
        if options["sin_fin"] and not options["apply"]:
            raise CommandError("--sin-fin solo puede usarse junto con --apply.")

        legacy = list(
            GastoAdicional.objects.filter(origen_legacy=True)
            .order_by("fecha", "id")
        )
        activos = [gasto for gasto in legacy if not gasto.eliminado]
        eliminados = len(legacy) - len(activos)
        groups = defaultdict(list)
        for gasto in activos:
            groups[normalizar_concepto(gasto.concepto)].append(gasto)

        candidates = {}
        ambiguous = {}
        additional = {}
        for key, rows in groups.items():
            periods = sorted({row.fecha.replace(day=1) for row in rows})
            same_value = len({row.valor for row in rows}) == 1
            same_notes = len({(row.observaciones or "").strip() for row in rows}) == 1
            one_per_month = len(periods) == len(rows)
            if (
                len(rows) >= 3
                and one_per_month
                and same_value
                and same_notes
                and son_periodos_consecutivos(periods)
            ):
                candidates[key] = rows
            elif len(rows) >= 2:
                ambiguous[key] = rows
            else:
                additional[key] = rows

        transformed = 0
        conflicts = 0
        selected_key = normalizar_concepto(options.get("concepto"))
        if options["apply"]:
            if selected_key not in candidates:
                conflicts += 1
                raise CommandError(
                    "El concepto indicado no es una recurrencia inequívoca. "
                    "Se conserva sin cambios."
                )
            transformed = self._convert(
                candidates[selected_key],
                without_end=options["sin_fin"],
            )

        self.stdout.write("Auditoría de gastos heredados")
        self.stdout.write(f"Registros analizados: {len(legacy)}")
        self.stdout.write(f"Posibles recurrencias: {len(candidates)}")
        self.stdout.write(f"Gastos adicionales identificados: {len(additional)}")
        self.stdout.write(f"Casos ambiguos: {len(ambiguous)}")
        self.stdout.write(f"Registros transformados: {transformed}")
        self.stdout.write(f"Registros conservados: {len(legacy) - transformed}")
        self.stdout.write(f"Registros eliminados lógicamente preservados: {eliminados}")
        self.stdout.write(f"Conflictos: {conflicts}")

        for label, groupset in (
            ("Candidatas", candidates),
            ("Ambiguas", ambiguous),
            ("Adicionales", additional),
        ):
            if groupset:
                values = ", ".join(
                    f"{rows[0].concepto} ({len(rows)})"
                    for rows in groupset.values()
                )
                self.stdout.write(f"{label}: {values}")

        if not options["apply"]:
            self.stdout.write(
                self.style.WARNING(
                    "Modo seguro: no se modificó ningún registro. "
                    "Revisa el reporte antes de usar --apply --concepto."
                )
            )

    @transaction.atomic
    def _convert(self, rows, *, without_end):
        concept = rows[0].concepto
        if GastoRecurrente.objects.filter(concepto__iexact=concept).exists():
            raise CommandError(
                f"Ya existe un gasto recurrente con el concepto “{concept}”."
            )

        periods = sorted(row.fecha.replace(day=1) for row in rows)
        recurring = crear_gasto_recurrente(
            concepto=concept,
            valor_mensual=rows[0].valor,
            inicio_periodo=periods[0],
            fin_periodo=None if without_end else periods[-1],
            observaciones=rows[0].observaciones,
        )
        now = timezone.now()
        GastoAdicional.objects.filter(pk__in=[row.pk for row in rows]).update(
            eliminado=True,
            eliminado_en=now,
            actualizado_en=now,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Se creó la recurrencia #{recurring.pk} y se preservaron "
                f"{len(rows)} registros heredados como eliminados lógicamente."
            )
        )
        return len(rows)
