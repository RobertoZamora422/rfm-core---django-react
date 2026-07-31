# RFM Core

RFM Core acompaña la operación de Rancho Flor María desde una consulta pública
hasta el contrato y su rentabilidad. Centraliza personas, cotizaciones, ventas,
pagos, costos, gastos recurrentes, catálogos, configuración y reportes sin
confundir una oportunidad comercial con un ingreso real.

```text
Pre-cotización -> Cotización -> Contrato -> Pago y costos -> Gastos -> Rentabilidad
```

## Estado y arquitectura

El backend es la fuente de verdad para identidad, estados, autorizaciones y
cálculos financieros. React presenta los datos y mejora la interacción, pero no
recalcula reglas críticas.

Arquitectura productiva definitiva:

```text
Usuario
  -> Cloudflare DNS, HTTPS y redirecciones
  -> https://ranchoflormaria.com
  -> Cloudflare Workers Static Assets (React/Vite)
  -> https://rfm-core-backend.onrender.com/api (Django/DRF en Render)
  -> Neon PostgreSQL
```

- Dominio y registrador: Cloudflare Registrar administra `ranchoflormaria.com`.
- Dominio canónico: `https://ranchoflormaria.com`.
- `www` redirige con 301 a la raíz conservando ruta y query string.
- Cloudflare fuerza HTTP a HTTPS mediante `Always Use HTTPS`.
- Frontend: Worker `ranchoflormaria`, Static Assets y dominio personalizado.
- Backend: Render Web Service en `rfm-core-backend.onrender.com`.
- Base: proyecto Neon `rfm-core-production`, PostgreSQL 17 en AWS `us-east-1`;
  runtime mediante URL pooled.
- Código: GitHub; `main` activa los despliegues automáticos.
- Disponibilidad: Cron-Job.org consulta `/api/health/` cada 10 minutos.
- Costo objetivo: USD 0 mensual fuera de la renovación anual del dominio.

No existe dependencia de archivos persistentes en el contenedor. SQLite se
reserva para desarrollo y pruebas; producción exige PostgreSQL.

## Funcionalidad

- pre-cotización pública para alquiler, servicio completo u orientación;
- continuidad por WhatsApp usando la configuración activa;
- identidad canónica `Persona`, teléfono normalizado y alias;
- clasificación derivada: Interesado sin contratos, Cliente con historial contractual;
- pipeline de cotizaciones y conversión única a contrato;
- contratos de alquiler sin paquete y servicios completos con oferta histórica;
- pagos, saldo pendiente, costos directos y cancelación histórica;
- gastos recurrentes versionados, ajustes por periodo y gastos adicionales;
- Inicio, dashboard financiero y reportes;
- administración de paquetes, beneficios, tipos de evento y configuración;
- interfaz responsive con estados de carga, error, vacío y reintento;
- actualización entre pestañas mediante eventos de mutación y `BroadcastChannel`.

## Stack

- Python 3.13.7, Django 5.2.16, Django REST Framework y Gunicorn.
- PostgreSQL/Neon en producción; SQLite en local.
- React 19, Vite 8, React Router 8, Axios, Recharts y Lucide.
- Cloudflare Vite plugin y Wrangler 4 para Workers Static Assets.
- CSS propio con identidad visual de Rancho Flor María.
- Pruebas Django y Vitest/Testing Library.

## Estructura

```text
backend/
  accounts/       autenticación administrativa
  negocio/        Persona, catálogos, configuración e Inicio
  comercial/      cotizaciones, estrategias y conversión
  financiero/     contratos, costos, gastos y dashboard
  reportes/       reportes comerciales y financieros
  config/         settings, URLs, health y readiness
frontend/
  src/components  UI y navegación compartidas
  src/pages       flujo público y módulos administrativos
  src/services    cliente HTTP y contratos de API
  src/hooks       sesión, carga, refresco y formularios
docs/             documentación funcional y técnica
```

## Requisitos

- Python 3.13 compatible.
- Node.js 22.23.1 y npm 10.
- Git.
- PostgreSQL solo si se desea reproducir el entorno productivo.

## Ejecución local

Backend, desde PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver
```

Frontend, en otra terminal:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Abrir `http://localhost:5173`. Registrar configuración, tipos de evento y
paquetes reales desde el panel. Las migraciones no cargan demostraciones.

## Variables de entorno

Backend:

| Variable | Uso |
|---|---|
| `DJANGO_SECRET_KEY` | secreto largo; obligatorio en producción |
| `DJANGO_DEBUG` | `False` en producción |
| `DJANGO_ALLOWED_HOSTS` | `rfm-core-backend.onrender.com`, sin esquema |
| `DATABASE_URL` | URL pooled de Neon para el runtime |
| `CORS_ALLOWED_ORIGINS` | `https://ranchoflormaria.com` |
| `CSRF_TRUSTED_ORIGINS` | orígenes confiables con esquema |
| `FRONTEND_PUBLIC_URL` | `https://ranchoflormaria.com` |
| `AUTH_TOKEN_TTL_HOURS` | vigencia del token; 24 por defecto |
| `THROTTLE_*` | límites del login y escrituras públicas |
| `DATABASE_CONN_MAX_AGE` | reutilización de conexión; 60 s por defecto |
| `DATABASE_DISABLE_SERVER_SIDE_CURSORS` | `True` con pooler transaccional |
| `DJANGO_SUPERUSER_*` | alta idempotente del administrador inicial |

Frontend:

| Variable | Uso |
|---|---|
| `VITE_API_BASE_URL` | URL HTTPS terminada en `/api`; obligatoria al compilar producción |
| `VITE_API_TIMEOUT_MS` | timeout HTTP; 15000 por defecto |

Los valores `VITE_*` son públicos en el bundle: nunca deben contener secretos.
Los ejemplos completos están en `backend/.env.example` y `frontend/.env.example`.

## Administración inicial y datos

Para una creación interactiva local:

```powershell
.\.venv\Scripts\python.exe manage.py createsuperuser
```

Para producción se puede ejecutar una sola vez:

```powershell
.\.venv\Scripts\python.exe manage.py create_admin_from_env
```

El comando no imprime la contraseña y no duplica el usuario. Después deben
registrarse los catálogos y la única configuración activa con datos reales.

La limpieza operativa es deliberadamente manual:

```powershell
.\.venv\Scripts\python.exe manage.py limpiar_datos_operativos
.\.venv\Scripts\python.exe manage.py limpiar_datos_operativos --execute
```

La primera orden solo audita. `--execute` es destructivo y nunca forma parte del
build, arranque o despliegue.

Los gastos mensuales heredados pueden auditarse sin modificación:

```powershell
.\.venv\Scripts\python.exe manage.py auditar_gastos_legacy
```

## API principal

Pública:

```text
GET  /api/health/
GET  /api/ready/
GET  /api/public/tipos-evento/
GET  /api/public/paquetes/
GET  /api/public/configuracion/
POST /api/pre-cotizacion/
POST /api/pre-cotizacion/preferencia/
POST /api/auth/login/
```

Administrativa, restringida a usuarios activos con `is_staff=True`:

```text
POST /api/auth/logout/        GET /api/auth/me/
/api/personas/               /api/cotizaciones/
/api/contratos/              /api/costos-directos/
/api/gastos-recurrentes/     /api/gastos-adicionales/
/api/inicio-resumen/         /api/dashboard-financiero/
/api/reportes/               /api/configuracion-negocio/
```

Cotizaciones y contratos no aceptan borrado físico. Se descartan o cancelan
mediante sus acciones de dominio. Costos directos y gastos adicionales usan
eliminación lógica.

## Reglas críticas

- Una cotización no representa ingreso.
- Una cotización convertida no puede volver a convertirse.
- Un contrato es la venta real; alquiler y servicio completo son modalidades distintas.
- `saldo_pendiente = valor_final - monto_abonado`.
- El abono no puede ser negativo ni superar el valor final.
- Cancelar conserva el historial, pero excluye el contrato de métricas principales.
- La clasificación Cliente incluye contratos históricos cancelados.
- Paquetes y configuración posteriores no reescriben snapshots históricos.
- Los gastos recurrentes se resuelven por vigencia y versión, sin duplicar filas mensuales.
- Registros eliminados lógicamente no afectan cálculos activos.

## Validación

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py check --deploy
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe -m pip check

cd ..\frontend
npm ci
npm test
npm run lint
npm run build
npm audit
npx wrangler deploy --dry-run

cd ..
git diff --check
```

`check --deploy` debe ejecutarse con variables equivalentes a producción; con
la configuración local de desarrollo reportará advertencias esperadas.

## Migraciones

No se editan migraciones ya aplicadas. El flujo es:

```powershell
.\.venv\Scripts\python.exe manage.py makemigrations
.\.venv\Scripts\python.exe manage.py migrate --plan
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

Las migraciones productivas vigentes ya están aplicadas. Una migración nueva
debe probarse primero desde una base vacía y sobre una rama restaurable de Neon.
Se ejecuta una sola vez desde Render Shell o un entorno administrativo,
reemplazando temporalmente `DATABASE_URL` por la conexión directa de Neon. No se
incluye `migrate` en build, deploy ni Gunicorn y no se usa `--fake`.

## Despliegue oficial

### Flujo automático del frontend

```text
GitHub main
  -> Cloudflare Workers Build
  -> npm ci
  -> npm run build
  -> npx wrangler deploy
```

Configuración de Cloudflare:

- Worker: `ranchoflormaria`.
- Root directory: `frontend`.
- Production branch: `main`.
- Build: `npm run build`.
- Deploy: `npx wrangler deploy`.
- Non-production version: `npx wrangler versions upload`.
- Variables de compilación: `VITE_API_BASE_URL` y `VITE_API_TIMEOUT_MS`.
- Dominio personalizado y reglas de redirección: administrados en el panel.

`frontend/wrangler.jsonc` es la fuente versionada. Mantiene
`assets.not_found_handling: single-page-application`, `workers_dev: false` y
`preview_urls: false`. El dominio personalizado permanece en el panel para no
duplicar la ruta en el repositorio. `public/_redirects` no existe y no debe
regenerarse; `public/_headers` sí es compatible con Static Assets.

### Render

- Tipo: Web Service conectado a GitHub y rama `main`.
- Root directory: `backend`.
- Python: `backend/.python-version`.
- Build seguro: instalar `requirements.txt` y ejecutar `collectstatic`; no
  ejecutar migraciones automáticamente.
- Start: comando Gunicorn de `backend/Procfile`; Render aporta `PORT`.
- Health check del servicio: `/api/health/`.
- Readiness manual o diagnóstica: `/api/ready/`.
- Variables: las descritas en `backend/.env.example`, almacenadas en Render.

`DJANGO_ALLOWED_HOSTS` contiene únicamente el host técnico del backend.
`CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` y `FRONTEND_PUBLIC_URL` usan
`https://ranchoflormaria.com`; no se añaden HTTP ni `www`.

### Neon

- Proyecto: `rfm-core-production`, PostgreSQL 17, AWS N. Virginia.
- Runtime: URL pooled secreta con TLS.
- Migraciones, `pg_dump` y `pg_restore`: URL directa secreta.
- Ninguna credencial ni cadena de conexión se guarda en Git.

### Cron-Job.org

```text
Cada 10 minutos
  -> GET https://rfm-core-backend.onrender.com/api/health/
  -> mantiene activo el proceso de Render sin consultar PostgreSQL
```

No cambiar el cron a `/api/ready/`: readiness ejecuta `SELECT 1` y despertaría
Neon innecesariamente.

### GitHub

`.github/workflows/ci.yml` ejecuta checks, migraciones pendientes, la suite
backend completa, pruebas frontend, lint y build en pull requests y en `main`.
Cloudflare y Render consumen el mismo repositorio. Los despliegues productivos
solo se aceptan después de CI verde.

## Respaldo y recuperación

1. Antes de una migración o cambio de alto riesgo, confirmar el restore window
   disponible en el plan actual de Neon y crear una rama restaurable.
2. Generar periódicamente un `pg_dump` con la URL directa; cifrarlo, almacenarlo
   fuera del repositorio y limitar su acceso. Nunca usar el endpoint pooled.
3. Verificar el respaldo mediante `pg_restore --list` y una restauración de
   ensayo en una base aislada.
4. Ante una pérdida, detener escrituras, elegir recuperación temporal de Neon o
   restaurar el último dump, validar conteos/FK y recién entonces cambiar
   `DATABASE_URL`.
5. Rotar credenciales expuestas y comprobar `/api/ready/`, login y recorridos
   críticos. No copiar datos personales ni credenciales a documentos o tickets.

Servicios que deben conservarse: Cloudflare Registrar/DNS/Worker, Render Web
Service, Neon, GitHub y Cron-Job.org. Pueden eliminarse, después de comprobar
que no tienen tráfico ni automatizaciones activas, los antiguos proyectos de
Cloudflare Pages, Render Static Site, Koyeb, Render PostgreSQL y cualquier
frontend técnico anterior. La URL técnica de Render del backend sí se conserva.

## Problemas comunes

- `401`: token ausente, revocado o vencido; iniciar sesión otra vez.
- `403`: el usuario existe pero no tiene `is_staff=True`.
- Error CORS: el origen debe coincidir exactamente, sin ruta ni slash sobrante.
- Build Vite falla: falta `VITE_API_BASE_URL` en el entorno de producción.
- Render no responde: comprobar deploy, `PORT`, Procfile y `/api/health/`.
- Readiness devuelve 503: comprobar Neon, URL pooled, TLS y migraciones.
- `DisallowedHost`: añadir solo el hostname real a `DJANGO_ALLOWED_HOSTS`.
- Manifest de estáticos: ejecutar `collectstatic` antes de Gunicorn.

## Documentación

Los documentos funcionales, arquitectura, modelo de datos, UI/UX, estado,
pruebas, migraciones y despliegue están en [`docs/`](docs/).
