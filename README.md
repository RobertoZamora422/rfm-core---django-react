# RFM Core

RFM Core gestiona la pre-cotización pública, el proceso comercial y el análisis financiero de Rancho Flor María.

```text
Pre-cotización pública -> Cotización administrativa -> Contrato -> Costos y gastos -> Rentabilidad
```

## Estado actual

El backend es la fuente de verdad para identidad, reglas comerciales, estados y cálculos financieros. El frontend React consume la API de Django REST Framework y no reconstruye métricas cargando relaciones completas.

La entidad canónica de identidad es `Persona`:

- `Interesado`: persona sin contratos históricos.
- `Cliente`: persona con al menos un contrato histórico, incluso si fue cancelado.
- Las clasificaciones son derivadas; no son modelos ni campos editables.
- El teléfono normalizado es único y permite reutilizar una persona en lugar de duplicarla.
- El origen inicial y los nombres alternativos se conservan.
- Cotizaciones y contratos se relacionan mediante `persona`.

En el menú administrativo la sección se llama **Personas**. Su pantalla conserva el título **Clientes & Interesados** y los filtros Todos, Clientes e Interesados.

La base local se entrega sin datos operativos demo. Solo permanece la configuración activa del negocio y el usuario administrativo. No existen semillas automáticas de demostración.

## Rutas

Públicas:

```text
/
/pre-cotizacion
/login
```

Administrativas protegidas:

```text
/inicio
/personas
/personas/:id
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

## API principal

Pública:

```text
GET  /api/public/tipos-evento/
GET  /api/public/paquetes/
GET  /api/public/configuracion/
POST /api/pre-cotizacion/
```

El formulario público envía `nombre_persona` y `telefono_persona`. El backend normaliza el teléfono, reutiliza la persona existente cuando corresponde y registra nombres alternativos sin revelar esa coincidencia al usuario público.

Administrativa protegida:

```text
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/
/api/personas/
/api/personas/resumen/
/api/personas/coincidencias/
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

Frontend y backend usan exclusivamente el endpoint canónico `/api/personas/`.

## Stack

Backend:

- Python 3.13
- Django 5.2 y Django REST Framework
- TokenAuthentication
- SQLite local y PostgreSQL en Render
- WhiteNoise, django-cors-headers y dj-database-url

Frontend:

- React, Vite y React Router
- Axios
- lucide-react y Recharts
- CSS propio de Rancho Flor María

## Instalación local

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver
```

Después de crear el administrador, registrar la configuración vigente desde `/configuracion` y los catálogos reales desde Tipos de evento y Paquetes. Migrar o iniciar el sistema no inserta datos demo.

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Limpieza operativa explícita

El comando primero audita y solo elimina cuando se indica `--execute`:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py limpiar_datos_operativos
.\.venv\Scripts\python.exe manage.py limpiar_datos_operativos --execute
```

Elimina personas, alias, cotizaciones, contratos, tipos de evento, paquetes, costos directos y gastos fijos. Conserva usuarios y configuración del negocio. Es una operación destructiva y no forma parte de instalación ni despliegue.

## Validación

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test

cd ..\frontend
npm run lint
npm run build
```

El frontend no define actualmente un script de pruebas automatizadas adicional; `lint` y el build de producción son obligatorios.

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

El WhatsApp se administra desde Configuración del negocio en formato ecuatoriano `09XXXXXXXX`; el backend produce el número internacional utilizado por `wa.me`.

## Despliegue en Render

Backend Web Service:

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn config.wsgi:application`
- Antes de operar: `python manage.py migrate` y `python manage.py collectstatic --noinput`
- Crear el superusuario y la configuración real de forma explícita.
- No ejecutar comandos de carga demo; no existen como parte del flujo normal.

Frontend Static Site:

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- `VITE_API_BASE_URL=https://rfm-core-backend.onrender.com/api`

## Reglas críticas

- Una cotización no representa un ingreso.
- Una cotización convertida no puede convertirse otra vez.
- Un contrato cancelado no participa en métricas financieras principales, pero conserva la clasificación histórica de Cliente para su persona.
- El monto abonado no puede superar el valor final.
- Solo catálogos activos aparecen en registros nuevos.
- Los costos y gastos usan eliminación lógica en la operación normal.
- Normalización, unicidad, clasificación y cálculos permanecen en backend.
- No se cargan datos demo al iniciar, migrar o desplegar.

Documentación detallada: [`docs/`](docs/).
