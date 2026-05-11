# RFM Core

RFM Core es un sistema web para la pre-cotización, gestión comercial y análisis de rentabilidad de un salón de eventos.

El sistema contempla el siguiente flujo principal:

```text
Pre-cotización -> Gestión comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Estado actual

El proyecto se encuentra en etapa de inicialización técnica.

- Fase 0: Documentación base completada.
- Fase 1: Inicialización técnica completada.
- Siguiente etapa: Fase 2 - Configuración base del backend.

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
- Django REST Framework previsto para la Fase 2.
- Django Admin.
- SQLite para desarrollo.
- PostgreSQL previsto para producción.

Frontend:

- React.
- Vite.
- React Router previsto para fases de frontend administrativo.
- Axios o cliente HTTP equivalente previsto para integración con API.

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

## Ejecución local

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
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

La siguiente etapa corresponde a la Fase 2 - Configuración base del backend. Se deberá configurar Django REST Framework, CORS, apps base y un endpoint de salud antes de avanzar al modelado del dominio.
