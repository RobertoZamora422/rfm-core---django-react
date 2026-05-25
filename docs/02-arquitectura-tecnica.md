# Arquitectura Tecnica - RFM Core

## Principios

- Separar interfaz publica, panel administrativo, API, modelos, servicios de negocio y persistencia.
- Mantener backend como fuente de verdad para validaciones y calculos.
- Evitar datos quemados permanentes en frontend.
- Exponer endpoints publicos controlados sin abrir CRUD administrativo.
- Mantener rutas administrativas protegidas por token.
- Preparar deploy en Render sin romper compatibilidad local.

## Stack

Backend:

- Python 3.13.
- Django 5.2.
- Django REST Framework.
- TokenAuthentication.
- django-cors-headers.
- python-dotenv.
- WhiteNoise para estaticos en produccion.
- dj-database-url para `DATABASE_URL`.
- SQLite local como fallback.
- PostgreSQL en Render.

Frontend:

- React.
- Vite.
- React Router.
- Axios.
- lucide-react.
- CSS tradicional del proyecto.

Deploy actual:

- Render Web Service para Django/DRF.
- Render Static Site para React/Vite.
- Render PostgreSQL.

## Backend

Apps principales:

```text
accounts
negocio
comercial
financiero
reportes
```

Reglas backend:

- `services.py` contiene acciones y calculos de negocio.
- `selectors.py` contiene consultas reutilizables.
- Serializers validan contratos de API.
- ViewSets administrativos usan permisos autenticados por defecto.
- API publica usa `AllowAny` solo en endpoints acotados.
- Dinero usa `DecimalField`, no `FloatField`.

## API publica

```text
GET  /api/public/tipos-evento/
GET  /api/public/paquetes/
GET  /api/public/configuracion/
POST /api/pre-cotizacion/
```

Restricciones:

- Tipos de evento: solo activos.
- Paquetes: solo activos.
- Configuracion: solo campos necesarios para el calculo publico.
- Configuracion publica incluye `whatsapp_numero_url` listo para `wa.me`, no el valor editable administrativo.
- `POST /api/pre-cotizacion/` no requiere login.
- El flujo publico no permite seleccionar clientes existentes por ID.
- No se guarda correo electronico desde la pre-cotizacion publica.
- No hay edicion ni eliminacion publica.

## API administrativa

```text
/api/auth/login/
/api/auth/logout/
/api/auth/me/
/api/clientes/
/api/tipos-evento/
/api/paquetes/
/api/configuracion-negocio/
/api/cotizaciones/
/api/cotizaciones/{id}/
/api/cotizaciones/{id}/cambiar-estado/
/api/cotizaciones/{id}/convertir-contrato/
/api/contratos/
/api/costos-directos/
/api/gastos-fijos/
/api/inicio-resumen/
/api/dashboard-financiero/
/api/reportes/
```

### Inicio administrativo

`GET /api/inicio-resumen/` es el contrato backend-first para la pantalla `/inicio`.

Implementacion:

- Servicio: `backend/negocio/services.py` -> `inicio_resumen()`.
- Vista: `backend/negocio/views.py` -> `InicioResumenAPIView`.
- Ruta: `backend/negocio/urls.py` -> `inicio-resumen/`.
- Consumo frontend: `frontend/src/services/resourceService.js` -> `inicioService.resumen()`.

Payload principal:

- `fecha_referencia` y `periodo`.
- `kpis`: cotizaciones nuevas, cotizaciones del mes, contratos confirmados del mes y eventos proximos.
- `eventos_proximos`: contratos confirmados futuros, excluyendo cancelados, listos para enlazar a `/contratos/:id`.
- `pendientes_importantes`: senales operativas calculadas en backend.

Decisiones tecnicas:

- Inicio no carga `/api/cotizaciones/` ni `/api/contratos/` para calcular KPIs en React.
- Los eventos proximos y metricas operativas principales excluyen contratos cancelados.
- Los pendientes de eventos realizados sin costos consideran costos directos activos; costos eliminados logicamente no cierran el pendiente.
- Inicio no reemplaza `/api/dashboard-financiero/` ni `/api/reportes/`; esos endpoints cubren analisis financiero y reportes historicos.

Autenticacion:

- Login devuelve `{ auth: { type: "token", token: "..." } }`.
- Frontend envia `Authorization: Token <token>`.
- Frontend conserva la sesion administrativa en `localStorage` usando las claves `rfm_core_auth_token` y `rfm_core_auth_user`.
- `/api/auth/me/` requiere token.
- Logout invalida el token actual.

## Frontend

Layouts:

- `PublicLayout`: rutas publicas, sin Sidebar ni Topbar administrativo.
- `AdminLayout`: panel protegido con Sidebar, Topbar y contenido administrativo.

Rutas publicas:

```text
/
/pre-cotizacion
/pre-cotizacion/alquiler
/pre-cotizacion/servicio-completo
/pre-cotizacion/comparacion
/login
```

Rutas administrativas protegidas:

```text
/inicio
/clientes
/tipos-evento
/paquetes
/configuracion
/cotizaciones
/cotizaciones/nueva
/cotizaciones/:id
/cotizaciones/:id/editar
/contratos
/contratos/nuevo
/contratos/:id
/contratos/:id/editar
/costos-directos
/gastos-fijos
/dashboard-financiero
/reportes
```

## Variables de entorno

Backend:

```text
DJANGO_SECRET_KEY=
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CSRF_TRUSTED_ORIGINS=
FRONTEND_PUBLIC_URL=http://localhost:5173
DATABASE_URL=
```

Frontend:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

`VITE_API_BASE_URL` es la convencion vigente para la URL del API en frontend. En produccion debe estar definida; el fallback local solo aplica a desarrollo.

Con `DJANGO_DEBUG=False`, el backend exige `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` y `DATABASE_URL`.

`FRONTEND_PUBLIC_URL` alimenta los enlaces informativos de la raiz JSON del backend. No participa en calculos ni autenticacion.

## Render manual

Backend Render Web Service:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: gunicorn config.wsgi:application
```

Variables backend:

```text
DJANGO_SECRET_KEY=<valor-seguro-generado>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=rfm-core-backend.onrender.com
DATABASE_URL=<Render PostgreSQL Internal Database URL>
CORS_ALLOWED_ORIGINS=https://rfm-core-frontend.onrender.com
CSRF_TRUSTED_ORIGINS=https://rfm-core-frontend.onrender.com,https://rfm-core-backend.onrender.com
FRONTEND_PUBLIC_URL=https://rfm-core-frontend.onrender.com
```

Comandos posteriores a crear el servicio:

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

PostgreSQL debe proveer `DATABASE_URL`; las migraciones deben ejecutarse antes de operar con datos reales. `seed_demo` no debe mezclarse con datos reales.

El numero de WhatsApp del negocio se administra en `ConfiguracionNegocio.whatsapp_negocio` con formato local ecuatoriano `09XXXXXXXX`. La API publica lo entrega normalizado como `whatsapp_numero_url`, por ejemplo `0991234567` -> `593991234567`.

## Raiz backend

`GET /` devuelve JSON util con enlaces a health, admin, API, frontend local y pre-cotizacion publica. No reemplaza `/api/health/`.
