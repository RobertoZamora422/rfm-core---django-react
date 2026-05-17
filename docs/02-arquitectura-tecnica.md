# Arquitectura Técnica - RFM Core

## Principios arquitectónicos

- Separar interfaz, API, modelos, reglas de negocio, cálculos financieros y persistencia.
- Mantener backend como fuente de verdad para validaciones y cálculos.
- Desarrollar por fases cerradas y verificables.
- Evitar datos quemados permanentes en frontend.
- Exponer una API REST clara y reutilizable.
- Priorizar mantenibilidad sobre complejidad innecesaria.

## Stack tecnológico

Backend:

- Python.
- Django.
- Django REST Framework.
- django-cors-headers.
- python-dotenv.
- Django Admin.
- SQLite para desarrollo.
- PostgreSQL para producción.

Frontend:

- React.
- Vite.
- React Router.
- Axios.
- lucide-react para iconografía de interfaz.
- CSS modular, CSS tradicional, SASS o estrategia definida en el proyecto.

Deploy:

- Render Web Service para backend.
- Render Static Site para frontend.
- Render PostgreSQL para producción.

## Estructura esperada del repositorio

```text
rfm-core/
├── backend/
├── frontend/
├── docs/
├── README.md
└── .gitignore
```

Al cierre de la Fase 2, el repositorio contiene `backend/` y `frontend/`, Django REST Framework, CORS, apps base del backend y el endpoint `/api/health/`.

Al cierre de la Fase 5, el backend expone endpoints CRUD autenticados para clientes, tipos de evento, paquetes, configuración del negocio, cotizaciones, contratos, costos directos y gastos fijos.

Al cierre de la Fase 6, el backend expone servicios de negocio para pre-cotización, cambio de estado comercial y conversión controlada de cotizaciones confirmadas a contratos.

Al cierre de la Fase 7, el frontend cuenta con React Router, layout administrativo responsive, cliente HTTP, autenticación inicial y componentes base reutilizables.

Al cierre de la Fase 8, el frontend consume la API real para administrar clientes, tipos de evento, paquetes y configuración del negocio.

Al cierre de la Fase 9, el frontend consume `/api/pre-cotizacion/` para registrar solicitudes iniciales y crear cotizaciones reales con resultado referencial generado por backend.

Al cierre de la Fase 10, el backend expone filtros comerciales para `/api/cotizaciones/` por estado, tipo de evento, rango de fecha y búsqueda por cliente o teléfono. El frontend reemplaza el placeholder de cotizaciones por listado, resumen por estado, detalle, cambio de estado y conversión controlada a contrato.

Al cierre de la Fase 11, el backend y frontend gestionan contratos como ventas reales mediante `/api/contratos/`, filtros backend, detalle administrativo, estado contractual, estado de pago calculado, saldo pendiente y cancelación controlada sin eliminación física.

Al cierre de la Fase 12, `/api/costos-directos/` permite filtrar por contrato, búsqueda por cliente/teléfono/concepto y rango de fecha. `/api/gastos-fijos/` permite filtrar por mes, año y concepto, y `/api/gastos-fijos/resumen/` devuelve el total del periodo filtrado. El frontend reemplaza placeholders por pantallas administrativas reales en `/costos-directos` y `/gastos-fijos`.

## Organización backend propuesta

Proyecto Django principal:

```text
backend/config/
```

Apps recomendadas:

- `accounts`: autenticación y usuario administrativo.
- `negocio`: clientes, tipos de evento, paquetes y configuración del negocio.
- `comercial`: pre-cotizaciones, cotizaciones y conversión a contratos.
- `financiero`: contratos, costos directos, gastos fijos y métricas financieras.
- `reportes`: reportes comerciales, financieros, eventos y paquetes.

Apps iniciales configuradas:

```text
accounts
negocio
comercial
financiero
reportes
```

Estructura interna recomendada por app:

```text
models.py
serializers.py
views.py
urls.py
admin.py
services.py
selectors.py
validators.py
tests.py
migrations/
```

## Reglas backend

- No concentrar toda la lógica en `views.py`.
- Usar `services.py` para acciones de negocio.
- Usar `selectors.py` para consultas reutilizables.
- Usar `validators.py` para validaciones reutilizables.
- Usar serializers para validaciones de API.
- Usar modelos para restricciones fundamentales.
- Usar `DecimalField` para dinero, nunca `FloatField`.
- Calcular KPIs financieros principales en backend.

## API REST prevista

Endpoints esperados por fases:

```text
/api/health/

/api/auth/login/
/api/auth/logout/
/api/auth/me/

/api/clientes/
/api/tipos-evento/
/api/paquetes/
/api/configuracion-negocio/

/api/pre-cotizacion/
/api/cotizaciones/
/api/cotizaciones/{id}/cambiar-estado/
/api/cotizaciones/{id}/convertir-contrato/

/api/contratos/
/api/costos-directos/
/api/gastos-fijos/
/api/gastos-fijos/resumen/

/api/inicio-resumen/
/api/dashboard-financiero/

/api/reportes/comercial/
/api/reportes/financiero/
/api/reportes/eventos/
/api/reportes/paquetes/
```

No todos los endpoints se implementan en una sola fase. Cada fase debe cerrar únicamente su alcance.

En la Fase 5 se implementan los endpoints CRUD principales. En la Fase 6 se implementan las acciones especiales de pre-cotización, cambio de estado y conversión a contrato.

## Organización frontend propuesta

```text
frontend/src/
├── main.jsx
├── App.jsx
├── routes/
├── layouts/
├── components/
├── pages/
├── services/
├── hooks/
├── utils/
└── styles/
```

Rutas esperadas:

```text
/login
/inicio
/pre-cotizacion
/cotizaciones
/cotizaciones/:id
/contratos
/contratos/:id
/clientes
/tipos-evento
/paquetes
/costos-directos
/gastos-fijos
/dashboard-financiero
/reportes
/configuracion
```

## Comunicación frontend-backend

- El frontend debe consumir API real.
- La URL base de API debe configurarse por variable de entorno.
- Los errores de validación backend deben mostrarse en UI cerca del campo correspondiente cuando aplique.
- React no debe duplicar reglas financieras críticas.

## Deploy previsto

Backend en Render:

- Servicio web Django/DRF.
- Variables de entorno.
- Migraciones aplicadas.
- Archivos estáticos configurados.
- PostgreSQL en producción.

Frontend en Render:

- Static Site.
- Build de Vite.
- Variable de entorno para API de producción.

Base de datos:

- SQLite solo para desarrollo.
- PostgreSQL para producción.
