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

El backend limita longitudes, tamaño y frecuencia. Normaliza el teléfono,
reutiliza Persona, conserva alias, calcula mediante estrategia, guarda la
cotización y devuelve una estimación referencial. La respuesta no revela si la
identidad ya existía.

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
