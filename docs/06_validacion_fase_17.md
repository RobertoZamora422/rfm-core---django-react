# Validacion Fase 17

Fecha de cierre: 2026-05-18

Nota de mantenimiento: este documento conserva la evidencia historica de Fase 17. La validacion actual posterior al deploy en Render se registra en `docs/07-consolidacion-pre-cotizacion-publica-y-deploy.md`.

Nota dashboard financiero: la revision posterior del dashboard financiero backend-first fue validada localmente con `manage.py test financiero reportes`, `npm run lint` y `npm run build`. Esta revision agrega KPIs financieros completos, graficos con Recharts, costos directos imputados por `Contrato.fecha_evento`, cancelados separados en cobranza y estados vacios profesionales.

## Objetivo

Validar el flujo completo de RFM Core antes de pasar a la documentacion final:

```text
Pre-cotizacion -> Gestion comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Cobertura automatizada agregada

Archivo principal:

```text
backend/config/test_integral.py
```

La prueba integral cubre:

- Creacion de pre-cotizacion desde `/api/pre-cotizacion/`.
- Cambio de estado comercial a cotizacion confirmada.
- Conversion controlada a contrato desde `/api/cotizaciones/{id}/convertir-contrato/`.
- Rechazo de conversion doble.
- Rechazo de conversion para cotizacion descartada.
- Creacion de costos directos y gastos fijos desde API.
- Dashboard financiero calculado desde backend.
- Reporte financiero reutilizando metricas del dashboard.
- Reporte de eventos diferenciando contratos confirmados y cancelados.
- Inicio administrativo con evento proximo y pendiente de saldo.

## Matriz de validacion ejecutada

| Area | Validacion | Resultado |
| --- | --- | --- |
| Backend | `manage.py check` | Sin issues |
| Backend | `manage.py test` | 56 pruebas OK |
| Migraciones | `manage.py makemigrations --check --dry-run` | Sin cambios pendientes |
| Frontend | `npm run lint` | Sin errores |
| Frontend | `npm run build` | Build generado correctamente |
| Runtime backend | `GET /api/health/` en `127.0.0.1:8000` | HTTP 200 |
| Runtime frontend | `GET /` en `127.0.0.1:5173` | HTTP 200 |
| Navegacion manual | Login administrativo y rutas principales | Sin redireccion indebida a login |
| Navegacion manual | `/inicio`, `/pre-cotizacion`, `/cotizaciones`, `/contratos`, `/costos-directos`, `/gastos-fijos`, `/dashboard-financiero`, `/reportes` | Contenido visible y encabezado esperado |
| Navegacion manual | Consola del navegador | Sin errores |
| Navegacion manual | Overflow horizontal escritorio | Sin overflow luego del ajuste responsive |

## Ajuste detectado durante validacion

Durante el recorrido manual se detecto overflow horizontal en escritorio en pantallas con filtros extensos. La causa fue el breakpoint de filtros, que usaba el ancho del viewport y no el ancho real disponible despues del sidebar.

Correccion aplicada:

- Los contenedores `.page-stack`, `.card`, `.kpi-card` y `.table-wrap` ahora permiten reducirse con `min-width: 0`.
- El breakpoint de filtros pasa a `max-width: 1400px` para que las pantallas con sidebar usen una grilla mas estable antes de desbordar.

## Criterio de cierre

La Fase 17 queda completada cuando los comandos de calidad y el recorrido manual anterior finalizan sin errores bloqueantes. Cualquier cambio posterior en endpoints, layout o filtros debe repetir al menos:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run

cd ..\frontend
npm run lint
npm run build
```

## Nota de consolidacion posterior

La intervencion de consolidacion de pre-cotizacion publica y preparacion de deploy actualiza el contrato de rutas:

- `/pre-cotizacion` deja de ser ruta administrativa protegida.
- Las cuatro pantallas publicas usan `PublicLayout`.
- El panel administrativo permanece protegido desde `/login`.
- La autenticacion de API administrativa usa `Authorization: Token <token>`.

La matriz vigente de esta intervencion queda documentada en `docs/07-consolidacion-pre-cotizacion-publica-y-deploy.md`.
