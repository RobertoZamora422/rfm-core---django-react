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
GitHub -> Cloudflare Pages -> Koyeb -> Neon PostgreSQL
```

### Cloudflare Pages

- Root: `frontend`.
- Install: `npm ci`.
- Build: `npm run build`.
- Output: `dist`.
- Node: `.node-version`.
- Variable: `VITE_API_BASE_URL=https://<koyeb>.koyeb.app/api`.
- SPA y headers: `frontend/public`.

### Koyeb

- Work directory: `backend`.
- Builder: buildpack.
- Build: `python manage.py collectstatic --noinput`.
- Run: `backend/Procfile`.
- Health check: `/api/ready/`.
- Entorno: `backend/.env.example`.

El arranque no ejecuta migraciones para evitar carreras entre workers.

### Neon

- Runtime: URL `-pooler` con TLS.
- Migraciones y exportaciones: URL directa.
- Django: conexiones saludables, vida corta y cursores de servidor desactivados.

Ejecutar como una sola tarea antes de tráfico:

```powershell
cd backend
$env:DATABASE_URL="<neon-direct-url>"
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py create_admin_from_env
```

No guardar URLs ni contraseñas en Git o scripts.

## Verificación

Ejecutar las órdenes de `06_validacion_fase_17.md`. Después comprobar HTTPS,
health, readiness, CORS, login, pre-cotización, recarga de ruta interna y los
flujos administrativos principales.

## Nota histórica

Versiones anteriores describían Render. Ya no es la arquitectura oficial ni
debe usarse como procedimiento vigente.
