# Validación integral vigente

Esta guía corresponde a la infraestructura productiva del 30 de julio de 2026.
Los resultados observados de cada intervención deben registrarse por separado;
no se reemplazan por esta lista de comandos.

## Backend

Crear un entorno virtual limpio y forzar `DATABASE_URL` vacío para que las
pruebas usen SQLite local, aunque el equipo tenga variables productivas:

```powershell
cd backend
python -m venv <audit-venv>
& <audit-venv>\Scripts\python.exe -m pip install -r requirements.txt
$env:DJANGO_DEBUG = 'True'
$env:DATABASE_URL = ''
& <audit-venv>\Scripts\python.exe manage.py check
& <audit-venv>\Scripts\python.exe manage.py makemigrations --check --dry-run
& <audit-venv>\Scripts\python.exe manage.py test
& <audit-venv>\Scripts\python.exe -m pip check
```

Con variables ficticias que reproduzcan la forma productiva, ejecutar
`manage.py check --deploy`. `DATABASE_URL` debe ser PostgreSQL, el host permitido
debe ser `rfm-core-backend.onrender.com` y CORS/CSRF/URL pública deben usar solo
`https://ranchoflormaria.com`. El check no necesita conectarse a Neon.

La suite conserva identidad, transiciones, conversión única, modalidades,
pagos, cancelación, soft delete, recurrencias, periodos vacíos, división por
cero, exclusión financiera, permisos y endpoints públicos.

## Migraciones

Si no cambian modelos, basta con:

```powershell
python manage.py makemigrations --check --dry-run
```

Para una migración nueva:

1. revisar `migrate --plan`;
2. migrar una base temporal vacía;
3. respaldar y crear una rama restaurable de Neon;
4. probar con URL directa, nunca pooled;
5. comparar conteos, IDs, FK, constraints e índices;
6. aplicar una sola vez fuera del build y de Gunicorn.

No usar `--fake` ni ejecutar cambios destructivos sobre producción.

## Frontend y Wrangler

```powershell
cd frontend
npm ci
npm run lint
npm run test
npm run build
npm audit
npx wrangler deploy --dry-run
```

El build debe producir `dist/wrangler.json` con `workers_dev: false`,
`preview_urls: false` y `assets.not_found_handling:
single-page-application`. Debe copiar `_headers` y no generar `_redirects`.
Vitest, desarrollo y build deben funcionar con `@cloudflare/vite-plugin`
activo. Revisar la tabla de tamaños: el chunk inicial debe permanecer separado
del dashboard/Recharts y no debe reaparecer el bundle monolítico cercano a
900 kB.

## Navegador

En escritorio y 390 px, comprobar sin crear datos en producción:

- `ranchoflormaria.com` y recarga de `/pre-cotizacion`, `/login`,
  `/dashboard`, `/cotizaciones` y `/contratos`;
- catálogos públicos cargados y ausencia de errores de consola/CORS;
- rutas administrativas protegidas;
- ausencia de scroll horizontal inesperado;
- HTTP a HTTPS y `www` a raíz mediante 301 conservando ruta y query string.

Una pre-cotización completa y las mutaciones administrativas se validan contra
un backend local temporal o una rama aislada; nunca se insertan datos de prueba
en Neon productivo.

## Producción

- `/api/health/` devuelve 200 sin consultar PostgreSQL;
- `/api/ready/` devuelve 200 solo si PostgreSQL responde;
- Cron-Job.org consulta health cada 10 minutos;
- CORS devuelve `Access-Control-Allow-Origin` solo para el dominio raíz HTTPS;
- login rechaza usuarios sin `is_staff`;
- el bundle no contiene secretos;
- runtime usa pooler y administración/migraciones usan conexión directa.

## Higiene

```powershell
git diff --check
git status --short
```

Buscar secretos, dumps, builds, `.wrangler`, cachés, `_redirects`, URLs
heredadas y documentación contradictoria. No versionar `dist`, `node_modules`,
`.env`, `.dev.vars`, SQLite ni archivos de respaldo.
