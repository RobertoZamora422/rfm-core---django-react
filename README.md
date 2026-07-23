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

Arquitectura oficial:

```text
GitHub
  |-- Cloudflare Pages: React/Vite
  |        |
  |        `-- HTTPS -> Koyeb: Django/DRF + Gunicorn
  |                         |
  |                         `-- TLS -> Neon PostgreSQL
```

- Frontend: Cloudflare Pages.
- Backend: Koyeb.
- Base de datos: Neon PostgreSQL.
- Código y despliegues: GitHub.
- Objetivo: $0/mes dentro de los límites gratuitos vigentes de cada proveedor.

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
- React 19, Vite 8, React Router, Axios, Recharts y Lucide.
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
- Node.js 22 y npm 10.
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
| `DJANGO_ALLOWED_HOSTS` | host de Koyeb, sin esquema |
| `DATABASE_URL` | URL PostgreSQL de Neon |
| `CORS_ALLOWED_ORIGINS` | orígenes HTTPS exactos de Cloudflare |
| `CSRF_TRUSTED_ORIGINS` | orígenes confiables con esquema |
| `FRONTEND_PUBLIC_URL` | URL pública del frontend |
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
npm audit --omit=dev

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

Antes de producción se valida desde una base vacía y sobre una copia o rama de
Neon. Las migraciones deben usar el endpoint directo de Neon, no el pooler
transaccional, y ejecutarse como una única tarea antes de iniciar tráfico.

## Despliegue oficial

### 1. Neon

1. Crear proyecto, rol y base PostgreSQL.
2. Conservar dos URLs secretas: directa para migraciones y `-pooler` para runtime.
3. Usar `sslmode=require`; no versionar ninguna URL.
4. Aplicar migraciones una vez con la URL directa.

### 2. Koyeb

- GitHub repository y branch de producción.
- Work directory: `backend`.
- Builder: buildpack.
- Build command: `python manage.py collectstatic --noinput`.
- Run command: el contenido de `backend/Procfile`.
- Health check HTTP: `/api/ready/`.
- Puerto: variable `PORT` proporcionada por Koyeb.
- Variables: las descritas en `backend/.env.example`.

Ejecutar migraciones como tarea única con la URL directa. No se incluyen en el
comando Gunicorn para evitar carreras entre workers. Después, ejecutar
`create_admin_from_env` una vez y retirar la contraseña del entorno si la
plataforma y el procedimiento operativo lo permiten.

### 3. Cloudflare Pages

- Repository: el mismo GitHub.
- Root directory: `frontend`.
- Install: `npm ci`.
- Build: `npm run build`.
- Output: `dist`.
- Variable: `VITE_API_BASE_URL=https://<koyeb-host>/api`.

`frontend/public/_redirects` preserva las rutas de React al recargar y
`frontend/public/_headers` añade cabeceras defensivas básicas.

### 4. Dominios y CORS

Primero desplegar Koyeb, después configurar su URL en Cloudflare y finalmente
registrar el dominio real de Cloudflare en `CORS_ALLOWED_ORIGINS`,
`CSRF_TRUSTED_ORIGINS` y `FRONTEND_PUBLIC_URL`. Todo el tráfico productivo debe
usar HTTPS.

### 5. GitHub

`.github/workflows/ci.yml` ejecuta checks, migraciones pendientes, 158 pruebas
backend, pruebas frontend, lint y build en cada pull request y push a `main`.
Cloudflare y Koyeb deben conectarse al mismo repositorio después de que CI quede
verde.

## Problemas comunes

- `401`: token ausente, revocado o vencido; iniciar sesión otra vez.
- `403`: el usuario existe pero no tiene `is_staff=True`.
- Error CORS: el origen debe coincidir exactamente, sin ruta ni slash sobrante.
- Build Vite falla: falta `VITE_API_BASE_URL` en el entorno de producción.
- Koyeb no queda ready: comprobar `DATABASE_URL`, TLS, migraciones y `/api/ready/`.
- `DisallowedHost`: añadir solo el hostname real a `DJANGO_ALLOWED_HOSTS`.
- Manifest de estáticos: ejecutar `collectstatic` antes de Gunicorn.

## Documentación

Los documentos funcionales, arquitectura, modelo de datos, UI/UX, estado,
pruebas, migraciones y despliegue están en [`docs/`](docs/).
