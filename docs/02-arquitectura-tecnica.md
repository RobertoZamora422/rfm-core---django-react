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
- PostgreSQL previsto para Render.

Frontend:

- React.
- Vite.
- React Router.
- Axios.
- lucide-react.
- CSS tradicional del proyecto.

Deploy previsto:

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
/api/cotizaciones/{id}/cambiar-estado/
/api/cotizaciones/{id}/convertir-contrato/
/api/contratos/
/api/costos-directos/
/api/gastos-fijos/
/api/inicio-resumen/
/api/dashboard-financiero/
/api/reportes/
```

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
/cotizaciones/:id
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
DATABASE_URL=
```

Frontend:

```text
VITE_API_URL=http://127.0.0.1:8000/api
```

`VITE_API_URL` es la unica convencion vigente para la URL del API en frontend.

El numero de WhatsApp del negocio se administra en `ConfiguracionNegocio.whatsapp_negocio` con formato local ecuatoriano `09XXXXXXXX`. La API publica lo entrega normalizado como `whatsapp_numero_url`, por ejemplo `0991234567` -> `593991234567`.

## Raiz backend

`GET /` devuelve JSON util con enlaces a health, admin, API, frontend local y pre-cotizacion publica. No reemplaza `/api/health/`.
