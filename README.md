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
- Fase 8: Módulos base de administración en frontend completada.
- Fase 9: Pre-cotización completada.
- Fase 10: Gestión comercial de cotizaciones completada.
- Fase 11: Contratos y pagos completada.
- Fase 12: Costos directos y gastos fijos completada.
- Fase 13: Inicio administrativo backend-first completada.
- Fase 14: Dashboard financiero backend-first completada.
- Fase 15: Reportes completada.
- Fase 16: Responsive, limpieza visual y experiencia de usuario completada.
- Fase 17: Pruebas y validacion integral completada.
- Siguiente etapa: Fase 18 - README final y documentacion de uso.

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
|-- 05_plan_tecnico_implementacion.md
`-- 06_validacion_fase_17.md
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
/api/gastos-fijos/resumen/
/api/inicio-resumen/
/api/dashboard-financiero/
/api/reportes/comercial/
/api/reportes/financiero/
/api/reportes/eventos/
/api/reportes/paquetes/
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

Al cierre de la Fase 8, las pantallas de clientes, tipos de evento, paquetes y configuración consumen datos reales desde la API y permiten creación y edición con validaciones visibles.

Al cierre de la Fase 9, la pantalla de pre-cotización consume catálogos reales, registra solicitudes iniciales en `/api/pre-cotizacion/` y muestra el resultado referencial devuelto por backend.

Al cierre de la Fase 10, la pantalla de cotizaciones consume `/api/cotizaciones/` con filtros reales por estado, tipo de evento, fecha y búsqueda por cliente o teléfono. También permite ver detalle, cambiar estado comercial y convertir cotizaciones confirmadas a contrato usando las acciones del backend.

Al cierre de la Fase 11, la pantalla de contratos consume `/api/contratos/` con filtros reales, detalle por contrato, estados separados de contrato y pago, saldo pendiente y cancelación controlada sin eliminar registros.

Al cierre de la Fase 12, las pantallas `/costos-directos` y `/gastos-fijos` consumen datos reales del backend. Costos directos permite crear, editar, eliminar, listar y filtrar costos asociados a contratos mediante select real. Gastos fijos permite crear, editar, eliminar, listar y filtrar gastos por mes, año y concepto, con total del periodo desde `/api/gastos-fijos/resumen/`.

Al cierre de la Fase 13, la pantalla `/inicio` consume `/api/inicio-resumen/` para mostrar KPIs operativos, eventos proximos enlazados al detalle de contrato, pendientes importantes generados por backend y acciones rapidas administrativas.

Al cierre de la Fase 14, la pantalla `/dashboard-financiero` consume `/api/dashboard-financiero/` con filtros de mes y anio, KPIs financieros, comparacion contra el mes anterior, rentabilidad por evento, estado de pagos e interpretacion del periodo calculados desde backend.

Al cierre de la Fase 15, la pantalla `/reportes` consume endpoints reales para reportes comercial, financiero, eventos y paquetes. Los reportes se consultan por rango de fechas o mes/anio segun corresponda, y el reporte financiero reutiliza la logica backend del dashboard financiero.

Al cierre de la Fase 16, el layout administrativo refuerza el comportamiento responsive con menu movil accesible, bloqueo de scroll al abrir paneles, cierre por teclado, enlace para saltar al contenido, filtros adaptables, modales con scroll interno y tablas/cards con mejor control de overflow.

Al cierre de la Fase 17, el proyecto incorpora una prueba integral automatizada del flujo comercial-financiero, valida la conversion controlada de cotizaciones, confirma que los contratos cancelados no alimentan metricas financieras principales y deja documentada la matriz de checks de backend, migraciones, frontend y recorrido manual.

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

La siguiente etapa corresponde a la Fase 18 - README final y documentacion de uso. Se debera consolidar la guia final de instalacion, ejecucion, datos base, variables de entorno, deploy y solucion de problemas comunes.
