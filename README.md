# RFM Core

RFM Core es un sistema web para pre-cotizacion publica, gestion comercial y analisis de rentabilidad de un salon de eventos.

Flujo principal:

```text
Pre-cotizacion publica -> Gestion comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Estado actual

El proyecto se encuentra en validacion integral y documentacion final previa a deploy. La version actual consolida la separacion entre flujo publico y panel administrativo, mantiene el backend como fuente de verdad para calculos y deja la configuracion preparada para Render sin afirmar que el despliegue ya exista.

La administracion de contratos permite creacion manual, edicion de campos operativos/financieros editables, detalle de rentabilidad por contrato y registro de costos directos desde el detalle. La sesion administrativa se persiste en `localStorage` para mantenerse entre pestanas del mismo navegador.

## Flujo publico

La pre-cotizacion publica no requiere login y no muestra Sidebar ni Topbar administrativo.

Pantallas:

- `/pre-cotizacion`: formulario inicial para cliente/interesado.
- `/pre-cotizacion/alquiler`: resultado referencial de alquiler del local.
- `/pre-cotizacion/servicio-completo`: paquetes activos con total referencial por paquete.
- `/pre-cotizacion/comparacion`: comparacion entre alquiler y servicio completo.

El formulario publico solicita solo nombre, telefono/WhatsApp, tipo de evento, fecha tentativa, numero aproximado de invitados y tipo de servicio de interes. Al enviarlo, el backend registra una cotizacion en estado `nueva`, calcula valores referenciales y permite continuar por WhatsApp usando el numero configurado en Configuracion del negocio.

## Rutas

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

## Stack tecnico

Backend:

- Python 3.13
- Django 5.2
- Django REST Framework
- TokenAuthentication de DRF
- django-cors-headers
- python-dotenv
- WhiteNoise
- dj-database-url
- SQLite local y PostgreSQL previsto en Render

Frontend:

- React
- Vite
- React Router
- Axios
- lucide-react
- CSS tradicional del proyecto

Deploy previsto:

- Render Web Service para Django/DRF
- Render Static Site para React/Vite
- Render PostgreSQL

## Ejecucion local

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_base
.\.venv\Scripts\python.exe manage.py runserver
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Datos demo:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py seed_demo
.\.venv\Scripts\python.exe manage.py clear_demo
```

## Validacion

Backend:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

## Variables de entorno

Backend (`backend/.env`):

```text
DJANGO_SECRET_KEY=
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=
```

Frontend (`frontend/.env`):

```text
VITE_API_URL=http://127.0.0.1:8000/api
```

`VITE_API_URL` es la convencion unica para la URL base del API.

El WhatsApp del negocio no se configura en variables de entorno del frontend. El administrador lo ingresa en `/configuracion` con formato ecuatoriano local `09XXXXXXXX`; el backend lo expone al flujo publico como numero listo para `wa.me`. Ejemplo: `0991234567` -> `593991234567`.

## URLs locales

- Backend API: http://127.0.0.1:8000/api
- Backend health: http://127.0.0.1:8000/api/health/
- Backend root: http://127.0.0.1:8000/
- Frontend: http://localhost:5173/
- Pre-cotizacion publica: http://localhost:5173/pre-cotizacion
- Panel administrativo: http://localhost:5173/login

## API principal

Publica:

```text
GET  /api/public/tipos-evento/
GET  /api/public/paquetes/
GET  /api/public/configuracion/
POST /api/pre-cotizacion/
```

Administrativa protegida:

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
/api/dashboard-financiero/
/api/reportes/
```

El login devuelve `Authorization: Token <token>` para las solicitudes administrativas.

## Usuario demo

Si se ejecutan los comandos de seed del proyecto, revisar la salida de `seed_base` o `seed_demo` para las credenciales disponibles en el entorno local. No se debe asumir que existen usuarios en una base limpia sin ejecutar migraciones y semillas.

## Reglas criticas

- La pre-cotizacion publica no es reserva ni precio final.
- WhatsApp continua la atencion humana.
- El WhatsApp del negocio se administra desde Configuracion del negocio.
- El endpoint publico no abre CRUD administrativo.
- Solo paquetes y tipos de evento activos se exponen al flujo publico.
- Una cotizacion no es ingreso real.
- Solo un contrato confirmado representa ingreso real.
- Los calculos comerciales y financieros se mantienen en backend.
- Render esta previsto como destino de deploy, pero este repositorio no declara un deploy activo.
