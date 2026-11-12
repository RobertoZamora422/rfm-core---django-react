"""Verifica el backend con la configuración aislada de CI."""

import argparse
import os
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("check", help="verifica la configuración de Django")
    commands.add_parser("makemigrations", help="detecta cambios de modelos sin migración")
    test = commands.add_parser("test", help="ejecuta las pruebas del backend")
    test.add_argument("labels", nargs="*", help="módulos, clases o pruebas de Django")
    test.add_argument(
        "--shuffle", type=int, default=False, metavar="SEED",
        help="semilla del orden de pruebas",
    )
    args = parser.parse_args()

    backend = Path(__file__).resolve().parent
    os.chdir(backend)
    sys.path.insert(0, str(backend))

    prefixes = ("DJANGO_", "DATABASE_", "CORS_", "CSRF_", "THROTTLE_")
    for name in tuple(os.environ):
        if name.startswith(prefixes) or name in {"AUTH_TOKEN_TTL_HOURS", "FRONTEND_PUBLIC_URL"}:
            del os.environ[name]
    os.environ.update(
        DJANGO_SETTINGS_MODULE="config.settings",
        DJANGO_DEBUG="True",
        DATABASE_URL="sqlite:///:memory:",
        PYTHON_DOTENV_DISABLED="1",
    )

    import django
    from django.conf import settings
    from django.core.management import call_command
    from django.db import connections

    if set(settings.DATABASES) != {"default"}:
        raise SystemExit("Se esperaba un único alias de base de datos: default.")
    database = connections["default"].settings_dict
    if (
        database["ENGINE"] != "django.db.backends.sqlite3"
        or database["NAME"] != ":memory:"
        or any(database[field] for field in ("HOST", "PORT", "USER", "PASSWORD", "OPTIONS"))
        or database["TEST"]["NAME"] is not None
    ):
        raise SystemExit("La configuración efectiva de Django debe usar SQLite en memoria.")
    if (
        args.command == "test"
        and settings.CACHES["default"]["BACKEND"] != "django.core.cache.backends.locmem.LocMemCache"
    ):
        raise SystemExit("La suite debe usar una caché local en memoria.")

    print(
        "Entorno aislado: config.settings | dotenv deshabilitado | "
        "default = django.db.backends.sqlite3 (:memory:) | sin host ni credenciales",
        flush=True,
    )

    django.setup()
    if args.command == "test":
        call_command(
            "test",
            "--",
            *args.labels,
            interactive=False,
            verbosity=2,
            shuffle=args.shuffle,
        )
    elif args.command == "makemigrations":
        call_command("makemigrations", check_changes=True, dry_run=True, interactive=False)
    else:
        call_command("check")


if __name__ == "__main__":
    main()
