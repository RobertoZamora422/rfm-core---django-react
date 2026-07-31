# Pre-cotización pública y despliegue oficial

## Contrato público

```http
POST /api/pre-cotizacion/
```

```json
{
  "nombre_persona": "Ana Zamora",
  "telefono_persona": "+593 99 123 4567",
  "tipo_evento": 1,
  "fecha_tentativa": "2026-12-10",
  "numero_invitados": 80,
  "tipo_servicio": "alquiler"
}
```

El backend limita longitudes, tamaño y frecuencia. Solo admite celulares
ecuatorianos en formato nacional `09XXXXXXXX` o internacional
`5939XXXXXXXX`/`+5939XXXXXXXX`; antes de buscar o guardar los convierte al
formato canónico `09XXXXXXXX`. Así, las representaciones nacional e
internacional reutilizan la misma `Persona`.

El nombre se normaliza, requiere al menos tres letras y admite espacios,
apóstrofes y guiones internos. La fecha tentativa acepta hoy o una fecha
posterior según la zona horaria de Django, y los invitados deben ser un entero
positivo. El tipo de evento debe estar activo y la modalidad es obligatoria. En
servicio completo el paquete sigue siendo opcional.

La página solicita primero la información del evento, después la modalidad y al
final los datos de contacto. El cálculo se realiza mediante la estrategia del
backend, guarda una sola cotización durante la sesión mediante
`solicitud_token` y devuelve estimaciones, beneficios configurados y acciones de
WhatsApp contextuales. La respuesta no revela si la identidad ya existía.

`GET /api/public/configuracion/` expone `fecha_minima_cotizacion` para que el
calendario aplique visualmente la misma regla diaria que valida el servidor.

## Arquitectura

```text
Usuario
  -> Cloudflare DNS, HTTPS y redirecciones
  -> ranchoflormaria.com
  -> Cloudflare Workers Static Assets
  -> Render Web Service
  -> Neon PostgreSQL
```

```text
GitHub main
  -> Cloudflare Workers Build
  -> npm ci
  -> npm run build
  -> npx wrangler deploy
```

### Cloudflare

- Registrar: Cloudflare administra `ranchoflormaria.com`.
- Worker: `ranchoflormaria`.
- Dominio canónico: `https://ranchoflormaria.com`.
- Root: `frontend`.
- Install: `npm ci`.
- Build: `npm run build`.
- Production deploy: `npx wrangler deploy`.
- Non-production version: `npx wrangler versions upload`.
- Node: `.node-version`.
- Variables: `VITE_API_BASE_URL=https://rfm-core-backend.onrender.com/api` y
  `VITE_API_TIMEOUT_MS=15000`.
- SPA: `assets.not_found_handling: single-page-application`.
- Headers: `frontend/public/_headers`.
- URLs técnicas: `workers_dev: false` y `preview_urls: false`.

La redirección HTTP→HTTPS (`Always Use HTTPS`), la redirección 301
`www`→raíz y el dominio personalizado son configuración del panel. La
redirección conserva ruta y query string. No existe `public/_redirects` porque
la regla histórica de Pages entraba en bucle bajo Workers Static Assets.

### Render

- Servicio: `rfm-core-backend`.
- URL: `https://rfm-core-backend.onrender.com`.
- Work directory: `backend`.
- Build: instalar requirements y `python manage.py collectstatic --noinput`.
- Run: `backend/Procfile`.
- Health check: `/api/health/`.
- Readiness: `/api/ready/`.
- Entorno: `backend/.env.example`.

El build y el arranque no ejecutan migraciones para evitar carreras entre
workers. `DJANGO_ALLOWED_HOSTS` usa el host técnico; CORS, CSRF y
`FRONTEND_PUBLIC_URL` usan únicamente el dominio raíz HTTPS.

Cron-Job.org hace `GET /api/health/` cada 10 minutos. No debe apuntar a
readiness, porque readiness consulta PostgreSQL.

### Neon

- Proyecto: `rfm-core-production`.
- Motor y región: PostgreSQL 17, AWS US East 1 / N. Virginia.
- Runtime: URL `-pooler` con TLS.
- Migraciones y exportaciones: URL directa.
- Django: conexiones saludables, vida corta y cursores de servidor desactivados.

Las migraciones vigentes ya están aplicadas. Para una migración futura, ejecutar
como una sola tarea controlada con respaldo previo:

```powershell
cd backend
$env:DATABASE_URL="<neon-direct-url>"
.\.venv\Scripts\python.exe manage.py migrate
```

Para crear el superusuario inicial de forma idempotente:

```powershell
$env:DJANGO_SUPERUSER_USERNAME="<usuario>"
$env:DJANGO_SUPERUSER_EMAIL="<correo>"
$env:DJANGO_SUPERUSER_PASSWORD="<secreto-temporal>"
.\.venv\Scripts\python.exe manage.py create_admin_from_env
```

Retirar la contraseña temporal del entorno después de comprobar el acceso. No
guardar URLs, contraseñas, datos personales ni información de facturación en Git
o en esta guía.

### Respaldo

Usar `pg_dump` con la URL directa, cifrar el resultado y guardarlo fuera del
repositorio. Verificar con `pg_restore --list` y restaurar periódicamente en una
base aislada. Antes de cambios de alto riesgo, confirmar en Neon el restore
window efectivo del plan y crear una rama recuperable.

## Verificación

Ejecutar las órdenes de `06_validacion_fase_17.md`. Después comprobar HTTPS,
health, readiness, CORS, login, pre-cotización, recarga de ruta interna y los
flujos administrativos principales.

## Nota histórica

Cloudflare Pages, Koyeb, Render Static Site, Render PostgreSQL, la antigua URL
pública del frontend de Render y cualquier URL `workers.dev` solo describen
iteraciones anteriores. Pueden eliminarse de los paneles cuando se confirme que
no reciben tráfico ni sostienen automatizaciones. El Render Web Service del
backend y su URL técnica sí son parte de la arquitectura vigente.
