# Consolidacion de pre-cotizacion publica y preparacion de deploy

## Objetivo

Corregir la regresion conceptual que trataba la pre-cotizacion como parte del panel protegido y dejar el proyecto preparado para validacion final previa a deploy en Render.

## Cambios funcionales

- La pre-cotizacion es publica y accesible sin login.
- El flujo publico tiene tres opciones:
  - Alquiler del local.
  - Servicio completo.
  - Aun no estoy seguro.
- El flujo publico tiene cuatro pantallas:
  - `/pre-cotizacion`
  - `/pre-cotizacion/alquiler`
  - `/pre-cotizacion/servicio-completo`
  - `/pre-cotizacion/comparacion`
- Las pantallas publicas usan `PublicLayout` y no muestran Sidebar ni Topbar administrativo.
- El panel administrativo conserva `AdminLayout` y `ProtectedRoute`.

## Backend

Endpoints publicos controlados:

```text
GET  /api/public/tipos-evento/
GET  /api/public/paquetes/
GET  /api/public/configuracion/
POST /api/pre-cotizacion/
```

Reglas:

- `POST /api/pre-cotizacion/` usa `AllowAny`.
- Crea una cotizacion en estado `nueva`.
- No requiere correo.
- No guarda correo desde el flujo publico.
- No permite seleccionar clientes existentes por ID.
- Calcula alquiler, servicio completo o comparacion desde servicios backend.
- Solo expone tipos de evento y paquetes activos en endpoints publicos.

## WhatsApp

Las pantallas de resultado construyen un enlace `wa.me` con mensaje prellenado. El numero no depende de variables de entorno del frontend: se administra desde Configuracion del negocio.

Formato administrativo:

```text
0991234567
```

El backend lo normaliza para WhatsApp:

```text
0991234567 -> 593991234567
```

WhatsApp continua la atencion humana. El sistema no reserva fechas ni confirma precios finales automaticamente.

## Autenticacion

La API administrativa migra a TokenAuthentication:

- Login devuelve `auth.type = token`.
- Frontend envia `Authorization: Token <token>`.
- `/api/auth/me/` requiere token.
- Logout invalida el token actual.

## Render

La preparacion para Render incluye:

- `gunicorn`.
- `whitenoise`.
- `dj-database-url`.
- `psycopg2-binary`.
- `DATABASE_URL` con SQLite como fallback local.
- `STATIC_ROOT`.
- WhiteNoise para estaticos en produccion.

No se declara deploy activo. La Fase 19 debe crear servicios y variables reales en Render.

## Validacion requerida

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test

cd ..\frontend
npm run lint
npm run build
```

## Validacion ejecutada

| Area | Validacion | Resultado |
| --- | --- | --- |
| Backend | `manage.py check` | Sin issues |
| Backend | `manage.py makemigrations --check --dry-run` | No changes detected |
| Backend | `manage.py test` | 68 pruebas OK |
| Frontend | `npm run lint` | Sin errores |
| Frontend | `npm run build` | Build generado correctamente |
| Runtime API | `GET /`, `GET /api/health/`, catalogos publicos, `POST /api/pre-cotizacion/` | OK |
| Runtime API | `/api/cotizaciones/` sin token | 401 |
| Runtime API | Login token, `/api/auth/me/`, cotizacion publica visible en admin | OK |
| Runtime UI | `/pre-cotizacion` y rutas de resultado en navegador interno | OK |
| Runtime UI | `/inicio` sin token redirige a `/login` | OK |
| Runtime UI | Login administrativo con token | OK |
| Runtime UI | Enlace WhatsApp con `wa.me`, numero de Configuracion y mensaje prellenado | OK |

Nota: durante `manage.py test` aparece una advertencia no bloqueante de WhiteNoise porque `staticfiles/` no existe hasta ejecutar `collectstatic`.

## Criterios de no regresion

- Las cotizaciones publicas aparecen en `/cotizaciones` despues de login.
- Las rutas administrativas redirigen a `/login` sin token.
- La API administrativa sigue protegida.
- La pre-cotizacion publica no expone CRUD.
- Backend sigue siendo fuente de verdad para calculos.
