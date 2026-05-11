# RFM Core

Sistema web para la pre-cotización, gestión comercial y análisis de rentabilidad de un salón de eventos.

RFM Core conecta el flujo principal del negocio:

```text
Pre-cotización -> Gestión comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Estado actual

Fase actual: **Fase 0 - Documentación base del sistema**.

En esta fase el repositorio contiene documentación inicial, README y `.gitignore`. Todavía no se ha inicializado el backend Django ni el frontend React/Vite.

## Alcance del sistema

RFM Core se centra en el core aprobado:

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

Quedan fuera de esta versión las reservas online automáticas, pasarela de pagos, facturación electrónica, firma electrónica, gestión contable completa, nómina, inventario avanzado, app móvil nativa, chatbot completo, automatización completa de WhatsApp Business API e inteligencia artificial para recomendar paquetes.

## Stack previsto

Backend:

- Python.
- Django.
- Django REST Framework.
- Django Admin.
- SQLite para desarrollo.
- PostgreSQL para producción.

Frontend:

- React.
- Vite.
- React Router.
- Axios o cliente HTTP equivalente.
- CSS modular, CSS tradicional, SASS o la estrategia definida en el proyecto.

Deploy previsto:

- Render Web Service para backend Django/DRF.
- Render Static Site para frontend React/Vite.
- Render PostgreSQL para base de datos.

## Estructura esperada

```text
rfm-core/
├── backend/
├── frontend/
├── docs/
├── README.md
└── .gitignore
```

En Fase 0 solo existen `docs/`, `README.md` y `.gitignore`. La estructura `backend/` y `frontend/` corresponde a fases posteriores.

## Documentación

La documentación viva del proyecto está en:

```text
docs/
├── 00-estado-del-proyecto.md
├── 01-documento-maestro.md
├── 02-arquitectura-tecnica.md
├── 03-modelo-datos.md
├── 04-diseno-ui-ux.md
└── 05_plan_tecnico_implementacion.md
```

Orden de prioridad cuando exista conflicto entre documentos:

1. `docs/01-documento-maestro.md`
2. `docs/02-arquitectura-tecnica.md`
3. `docs/03-modelo-datos.md`
4. `docs/04-diseno-ui-ux.md`
5. `docs/05_plan_tecnico_implementacion.md`
6. `docs/00-estado-del-proyecto.md`

## Reglas críticas

- Una cotización no es ingreso real.
- Solo un contrato confirmado representa ingreso real.
- Un contrato cancelado no alimenta métricas financieras principales.
- `estado_contrato` y `estado_pago` son conceptos distintos.
- El saldo pendiente se calcula como `valor_final - monto_abonado`.
- `monto_abonado` no puede superar `valor_final`.
- La lógica financiera principal se calcula en backend, no en React.
- No se deben usar datos quemados permanentes en frontend.

## Siguiente fase

La siguiente fase es **Fase 1 - Inicialización del proyecto y repositorio**, enfocada en crear la estructura mínima `backend/`, `frontend/`, configuración inicial y validación de ejecución local.
