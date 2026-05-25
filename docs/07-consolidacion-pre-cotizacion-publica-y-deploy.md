# Consolidacion de pre-cotizacion publica y preparacion de deploy

## Objetivo

Corregir la regresion conceptual que trataba la pre-cotizacion como parte del panel protegido y dejar el proyecto preparado para validacion final y mantenimiento posterior al deploy en Render.

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
- `CSRF_TRUSTED_ORIGINS` leido desde entorno.
- Falla explicita si `DJANGO_DEBUG=False` y faltan variables criticas.

Deploy activo verificado:

- Frontend: https://rfm-core-frontend.onrender.com/
- Backend API: https://rfm-core-backend.onrender.com/api
- Backend health: https://rfm-core-backend.onrender.com/api/health/

## Configuracion exacta para Render

Backend Render Web Service:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: gunicorn config.wsgi:application
```

Variables backend obligatorias:

```text
DJANGO_SECRET_KEY=<valor-seguro-generado>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=rfm-core-backend.onrender.com
DATABASE_URL=<Render PostgreSQL Internal Database URL>
CORS_ALLOWED_ORIGINS=https://rfm-core-frontend.onrender.com
CSRF_TRUSTED_ORIGINS=https://rfm-core-frontend.onrender.com,https://rfm-core-backend.onrender.com
FRONTEND_PUBLIC_URL=https://rfm-core-frontend.onrender.com
```

Comandos operativos backend:

```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_base
python manage.py createsuperuser
```

Frontend Render Static Site:

```text
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
VITE_API_BASE_URL=https://rfm-core-backend.onrender.com/api
```

PostgreSQL:

- Crear una base PostgreSQL en Render.
- Usar su `DATABASE_URL` en el backend.
- Ejecutar migraciones antes de registrar datos reales.
- Mantener `seed_base` para datos base y `seed_demo` separado de datos reales.

## Cierres funcionales posteriores a la auditoria

- Configuracion del negocio no puede desactivarse ni eliminarse desde la API normal.
- Contratos y cotizaciones administrativas validan catalogos activos para nuevas asignaciones.
- Cotizaciones administrativas cuentan con rutas de creacion y edicion.
- Costos directos y gastos fijos usan eliminacion logica.
- Reportes se pueden exportar como CSV desde los datos backend ya calculados.
- El resultado publico de pre-cotizacion se persiste temporalmente para sobrevivir refrescos.

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
| Backend | `manage.py test` | 90 pruebas OK |
| Frontend | `npm install` | Dependencias al dia, 0 vulnerabilidades reportadas |
| Frontend | `npm run lint` | Sin errores |
| Frontend | `npm run build` | Build generado correctamente |
| Runtime local API | `GET /`, `GET /api/health/` en `127.0.0.1:8000` | HTTP 200 |
| Runtime local UI | `GET /pre-cotizacion` en `127.0.0.1:5173` | HTTP 200 |
| Runtime produccion | `GET https://rfm-core-frontend.onrender.com/` | HTTP 200 |
| Runtime produccion | `GET https://rfm-core-backend.onrender.com/api/health/` | HTTP 200 |

Nota: durante `manage.py test` aparece una advertencia no bloqueante de WhiteNoise porque `staticfiles/` no existe hasta ejecutar `collectstatic`.

## Criterios de no regresion

- Las cotizaciones publicas aparecen en `/cotizaciones` despues de login.
- Las rutas administrativas redirigen a `/login` sin token.
- La API administrativa sigue protegida.
- La pre-cotizacion publica no expone CRUD.
- Backend sigue siendo fuente de verdad para calculos.
