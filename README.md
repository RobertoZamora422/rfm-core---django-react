# RFM Core

RFM Core es un sistema web para la pre-cotización, gestión comercial y análisis de rentabilidad de un salón de eventos.

El sistema contempla el siguiente flujo principal:

```text
Pre-cotización -> Gestión comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Estado actual

El proyecto se encuentra en etapa de consolidación del backend base.

- Fase 0: Documentación base completada.
- Fase 1: Inicialización técnica completada.
- Fase 2: Configuración base del backend completada.
- Fase 3: Modelado del dominio completado.
- Fase 4: Administración del sistema y datos semilla completada.
- Fase 5: API REST del core completada.
- Fase 6: Servicios de negocio y endpoints de acciones completada.
- Fase 7: Frontend base y layout administrativo completada.
- Siguiente etapa: Fase 8 - Módulos base de administración en frontend.

## Alcance del sistema

Se define como alcance central del sistema:

- Clientes.
- Tipos de evento.
- Paquetes.
- Configuración del negocio.
- Pre-cotizaciones y cotizaciones.
- Conversión de cotizaciones confirmadas a contratos.
- Contratos con estado comercial y estado de pago separados.
- Costos directos por contrato/evento.
- Gastos fijos mensuales.
- Inicio administrativo operativo.
- Dashboard financiero backend-first.
- Reportes básicos.
- API REST y frontend administrativo.

Quedan fuera de esta versión las reservas online automáticas, pasarela de pagos, facturación electrónica, firma electrónica, gestión contable completa, nómina, inventario avanzado, aplicación móvil nativa, chatbot completo, automatización completa con WhatsApp Business API e inteligencia artificial para recomendar paquetes.

## Stack técnico

Backend:

- Python 3.13.7 en entorno local.
- Django 5.2.14.
- Django REST Framework.
- django-cors-headers.
- python-dotenv.
- Django Admin.
- SQLite para desarrollo.
- PostgreSQL previsto para producción.

Frontend:

- React.
- Vite.
- React Router.
- Axios.
- lucide-react.

Deploy previsto:

- Render Web Service para backend Django/DRF.
- Render Static Site para frontend React/Vite.
- Render PostgreSQL para base de datos.

## Estructura del repositorio

```text
rfm-core/
|-- backend/
|-- frontend/
|-- docs/
|-- README.md
`-- .gitignore
```

## Documentación

La documentación viva del proyecto se encuentra en:

```text
docs/
|-- 00-estado-del-proyecto.md
|-- 01-documento-maestro.md
|-- 02-arquitectura-tecnica.md
|-- 03-modelo-datos.md
|-- 04-diseno-ui-ux.md
`-- 05_plan_tecnico_implementacion.md
```

Orden de prioridad cuando exista conflicto entre documentos:

1. `docs/01-documento-maestro.md`
2. `docs/02-arquitectura-tecnica.md`
3. `docs/03-modelo-datos.md`
4. `docs/04-diseno-ui-ux.md`
5. `docs/05_plan_tecnico_implementacion.md`
6. `docs/00-estado-del-proyecto.md`

## API REST actual

Al cierre de la Fase 6, el backend establece endpoints autenticados para recursos principales y acciones comerciales:

```text
/api/auth/login/
/api/auth/logout/
/api/auth/me/
/api/pre-cotizacion/
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
```

El endpoint `/api/health/` se mantiene disponible para verificación básica del backend.

La Fase 6 establece servicios backend para pre-cotización, cambio de estado comercial y conversión controlada de cotizaciones confirmadas a contratos.

## Frontend actual

La Fase 7 establece la base administrativa del frontend:

```text
frontend/src/
|-- routes/
|-- layouts/
|-- components/
|-- pages/
|-- services/
|-- hooks/
|-- utils/
`-- styles/
```

El frontend cuenta con rutas protegidas, página de login, layout administrativo responsive, Sidebar, Topbar, cliente HTTP con Axios y componentes base reutilizables.

## Ejecución local

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

Datos base y demo:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py seed_base
.\.venv\Scripts\python.exe manage.py seed_demo
.\.venv\Scripts\python.exe manage.py clear_demo
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
npm run build
npm run lint
```

## Configuración de entorno

Backend:

```text
backend/.env.example
```

Frontend:

```text
frontend/.env.example
```

Los archivos `.env` reales no deben versionarse.

## Reglas críticas

- Una cotización no es ingreso real.
- Solo un contrato confirmado representa ingreso real.
- Un contrato cancelado no alimenta métricas financieras principales.
- `estado_contrato` y `estado_pago` son conceptos distintos.
- El saldo pendiente se calcula como `valor_final - monto_abonado`.
- `monto_abonado` no puede superar `valor_final`.
- La lógica financiera principal se calcula en backend, no en React.
- No se deben usar datos quemados permanentes en frontend.

## Siguiente etapa

La siguiente etapa corresponde a la Fase 8 - Módulos base de administración en frontend. Se deberán implementar las interfaces de gestión para clientes, tipos de evento, paquetes y configuración del negocio.
