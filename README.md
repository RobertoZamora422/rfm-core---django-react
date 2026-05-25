# RFM Core

RFM Core es un sistema web para pre-cotizacion publica, gestion comercial y analisis de rentabilidad de un salon de eventos.

Flujo principal:

```text
Pre-cotizacion publica -> Gestion comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Estado actual

El proyecto ya cuenta con deploy manual en Render y se encuentra en etapa de mantenimiento tecnico, validacion academica y revision operativa. La version actual consolida la separacion entre flujo publico y panel administrativo, mantiene el backend como fuente de verdad para calculos y conserva configuracion compatible con ejecucion local y Render.

URLs de produccion verificadas:

- Frontend: https://rfm-core-frontend.onrender.com/
- Backend API: https://rfm-core-backend.onrender.com/api
- Backend health: https://rfm-core-backend.onrender.com/api/health/

La administracion de contratos permite creacion manual, edicion de campos operativos/financieros editables, detalle de rentabilidad por contrato y registro de costos directos desde el detalle. La sesion administrativa se persiste en `localStorage` para mantenerse entre pestanas del mismo navegador.

La administracion de cotizaciones permite crear y editar oportunidades comerciales desde el panel sin confundirlas con ingresos reales. Las cotizaciones convertidas bloquean cambios criticos para no romper su contrato asociado.

## Inicio administrativo, dashboard y reportes

`/inicio` es la pantalla operativa diaria del panel administrativo. Consume `GET /api/inicio-resumen/` y muestra cotizaciones nuevas, cotizaciones del mes, eventos del mes, eventos proximos, pendientes importantes y accesos rapidos agrupados por gestion comercial y finanzas/reportes.

Los eventos proximos salen de contratos confirmados no cancelados, maximo 5 en Inicio, con enlace al detalle del contrato. Los pendientes importantes priorizan cotizaciones nuevas sin gestionar, eventos proximos sin costos directos activos, eventos proximos con saldo pendiente y oportunidades avanzadas sin contrato.

`/dashboard-financiero` es el tablero de analisis financiero mensual. Consume `GET /api/dashboard-financiero/` y muestra ingresos, costos, utilidad, margenes, estado de pagos y comparaciones.

`/reportes` concentra consultas historicas o exportables por periodo. Consume los endpoints bajo `/api/reportes/`.

React no calcula KPIs de Inicio cargando listas completas; el backend entrega el resumen listo para presentar.

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
- SQLite local y PostgreSQL en Render

Frontend:

- React
- Vite
- React Router
- Axios
- lucide-react
- CSS tradicional del proyecto

Deploy actual:

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
CSRF_TRUSTED_ORIGINS=
FRONTEND_PUBLIC_URL=http://localhost:5173
DATABASE_URL=
```

Frontend (`frontend/.env`):

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

`VITE_API_BASE_URL` es la convencion vigente para la URL base del API. En desarrollo el frontend conserva fallback local; en produccion debe definirse explicitamente.

Si `DJANGO_DEBUG=False`, el backend exige `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` y `DATABASE_URL`. Si falta alguna, Django falla al iniciar con un error claro.

`FRONTEND_PUBLIC_URL` es opcional para desarrollo y permite que la raiz JSON del backend publique enlaces coherentes al frontend. En Render debe apuntar al Static Site activo.

El WhatsApp del negocio no se configura en variables de entorno del frontend. El administrador lo ingresa en `/configuracion` con formato ecuatoriano local `09XXXXXXXX`; el backend lo expone al flujo publico como numero listo para `wa.me`. Ejemplo: `0991234567` -> `593991234567`.

## URLs locales

- Backend API: http://127.0.0.1:8000/api
- Backend health: http://127.0.0.1:8000/api/health/
- Backend root: http://127.0.0.1:8000/
- Frontend: http://localhost:5173/
- Pre-cotizacion publica: http://localhost:5173/pre-cotizacion
- Panel administrativo: http://localhost:5173/login

## URLs de produccion

- Frontend: https://rfm-core-frontend.onrender.com/
- Pre-cotizacion publica: https://rfm-core-frontend.onrender.com/pre-cotizacion
- Panel administrativo: https://rfm-core-frontend.onrender.com/login
- Backend API: https://rfm-core-backend.onrender.com/api
- Backend health: https://rfm-core-backend.onrender.com/api/health/

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
/api/inicio-resumen/
/api/dashboard-financiero/
/api/reportes/
```

El login devuelve `Authorization: Token <token>` para las solicitudes administrativas.

## Deploy manual en Render

Render es el entorno real de produccion del proyecto. Para mantener o recrear el deploy, conservar las rutas, nombres de variables y comandos siguientes.

Backend Render Web Service:

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn config.wsgi:application`
- Runtime: Python
- Variables obligatorias:
  - `DJANGO_SECRET_KEY=<valor-seguro-generado>`
  - `DJANGO_DEBUG=False`
  - `DJANGO_ALLOWED_HOSTS=rfm-core-backend.onrender.com`
  - `DATABASE_URL=<Render PostgreSQL Internal Database URL>`
  - `CORS_ALLOWED_ORIGINS=https://rfm-core-frontend.onrender.com`
  - `CSRF_TRUSTED_ORIGINS=https://rfm-core-frontend.onrender.com,https://rfm-core-backend.onrender.com`
  - `FRONTEND_PUBLIC_URL=https://rfm-core-frontend.onrender.com`

Comandos operativos backend:

```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_base
python manage.py createsuperuser
```

`seed_base` carga datos base reales del negocio. `seed_demo` queda separado para demostracion y no debe ejecutarse sobre datos reales salvo decision explicita.

Frontend Render Static Site:

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Variable obligatoria:
  - `VITE_API_BASE_URL=https://rfm-core-backend.onrender.com/api`

PostgreSQL:

- Crear una base PostgreSQL en Render.
- Copiar su `DATABASE_URL` al Web Service backend.
- Ejecutar migraciones antes de operar con datos reales.
- No mezclar datos demo con datos reales.

## Usuario demo

Si se ejecutan los comandos de seed del proyecto, revisar la salida de `seed_base` o `seed_demo` para las credenciales disponibles en el entorno local. No se debe asumir que existen usuarios en una base limpia sin ejecutar migraciones y semillas.

## Reglas criticas

- La pre-cotizacion publica no es reserva ni precio final.
- WhatsApp continua la atencion humana.
- El WhatsApp del negocio se administra desde Configuracion del negocio.
- El endpoint publico no abre CRUD administrativo.
- Solo paquetes y tipos de evento activos se exponen al flujo publico.
- Contratos y cotizaciones administrativas nuevas solo deben asignar catalogos activos.
- Costos directos y gastos fijos se eliminan logicamente desde la API para no borrar evidencia financiera.
- Reportes pueden exportarse como CSV desde la respuesta backend ya calculada.
- Una cotizacion no es ingreso real.
- Solo un contrato confirmado representa ingreso real.
- Los calculos comerciales y financieros se mantienen en backend.
- Render es el entorno real de produccion; cualquier cambio debe validarse localmente antes de actualizar servicios.
