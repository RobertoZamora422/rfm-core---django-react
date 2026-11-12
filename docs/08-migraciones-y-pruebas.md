# Estrategia de migraciones y pruebas

## Migraciones

Las migraciones aplicadas son historial inmutable. Un cambio estructural crea
una migración nueva y compatible.

Secuencia:

1. revisar `migrate --plan`;
2. migrar SQLite temporal desde cero;
3. crear un respaldo y una rama restaurable de Neon;
4. migrar esa rama con endpoint directo;
5. comparar conteos, claves y restricciones;
6. ejecutar `makemigrations --check --dry-run`;
7. programar la aplicación productiva como una única tarea administrativa.

El endpoint pooler es para runtime. Migraciones y `pg_dump` usan la conexión
directa. `migrate` no forma parte del comando de Gunicorn.

La base productiva no se usa para pruebas, no se resetea y no recibe fixtures.
Nunca se modifican migraciones ya aplicadas ni se usa `--fake` para sortear un
error real.

## Backend

La suite cubre modelos, constraints, serializers, services, selectors, API,
identidad, flujo integral, gastos, reportes, permisos y autenticación.

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --disable-pip-version-check -r requirements.txt
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -I -B -u run_ci_checks.py check
.\.venv\Scripts\python.exe -I -B -u run_ci_checks.py makemigrations
.\.venv\Scripts\python.exe -I -B -u run_ci_checks.py test
```

El lanzador desactiva la carga de `.env`, descarta las variables de configuración
heredadas de la aplicación y comprueba que el único alias de Django apunta a
SQLite en memoria. `makemigrations` ejecuta la comprobación con `--check --dry-run --noinput`.
La suite aplica las migraciones en una base desechable y usa una caché local en
memoria.

Para reproducir los módulos de E04 o cambiar el orden de la suite:

```powershell
.\.venv\Scripts\python.exe -I -B -u run_ci_checks.py test comercial financiero negocio
.\.venv\Scripts\python.exe -I -B -u run_ci_checks.py test --shuffle 41304
```

El [flujo CI](../.github/workflows/ci.yml) usa el mismo lanzador en Ubuntu con
Python 3.13. Su paso `check --deploy` comprueba por separado los ajustes de
producción con variables de CI y una URL de PostgreSQL de loopback. El chequeo
es de configuración y se ejecuta sin abrir una conexión a PostgreSQL.
Consulta el [resumen de E04](evidencias/E04/informe.md) para la cobertura.

## Frontend

Vitest y Testing Library cubren almacenamiento y restauración de sesión, timeout,
rutas protegidas y cierre local cuando la red falla.

```powershell
cd frontend
npm ci
npm test
npm run lint
npm run build
npm audit
npx wrangler deploy --dry-run
```

Las pruebas automatizadas no sustituyen el recorrido real en navegador ni la
validación final sobre PostgreSQL.
