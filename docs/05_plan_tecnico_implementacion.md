# Plan Técnico de Implementación - RFM Core

## Enfoque general

RFM Core se implementará por fases cerradas, verificables y documentadas. Cada fase debe dejar un entregable funcional o documental claro antes de avanzar a la siguiente.

Regla principal:

```text
Pre-cotización -> Gestión comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

No se deben implementar módulos fuera del core aprobado ni adelantar fases sin instrucción explícita.

## Reglas de ejecución

Para cada fase:

1. Inspeccionar el estado real del repositorio.
2. Planificar qué se modificará y qué no se tocará.
3. Implementar solo el alcance de la fase.
4. Ejecutar pruebas o verificaciones proporcionales.
5. Actualizar documentación viva.
6. Cerrar con resumen de cambios, pruebas, pendientes y siguiente bloque.

## Fase 0 - Documentación base del sistema

Estado: Completada.

La fase tuvo como objetivo definir la base conceptual, técnica y visual antes de implementar código.

Entregables:

```text
docs/00-estado-del-proyecto.md
docs/01-documento-maestro.md
docs/02-arquitectura-tecnica.md
docs/03-modelo-datos.md
docs/04-diseno-ui-ux.md
docs/05_plan_tecnico_implementacion.md
README.md
.gitignore
```

Criterios de cierre:

- Alcance claro.
- Módulos principales definidos.
- Modelo de datos conceptual definido.
- Arquitectura técnica definida.
- Diseño UI/UX base definido.
- Estado del proyecto actualizado.

## Fase 1 - Inicialización del proyecto y repositorio

Estado: Completada.

La fase tiene como objetivo preparar backend y frontend mínimos.

Alcance:

- Crear `backend/`.
- Crear `frontend/`.
- Inicializar proyecto Django.
- Inicializar proyecto React/Vite.
- Crear archivos de entorno ejemplo.
- Validar ejecución local mínima.

La fase no contempla modelos del dominio ni API completa.

## Fase 2 - Configuración base del backend

Estado: Completada.

La fase tiene como objetivo configurar Django, DRF, CORS, autenticación inicial y endpoint de salud.

Alcance:

- Configurar settings por entorno.
- Instalar dependencias backend.
- Crear apps base sugeridas.
- Agregar `/api/health/`.
- Validar `python manage.py check`.

## Fase 3 - Modelado del dominio

Estado: Completada.

La fase tiene como objetivo crear modelos principales y migraciones.

Alcance:

- `Cliente`.
- `TipoEvento`.
- `Paquete`.
- `ConfiguracionNegocio`.
- `Cotizacion`.
- `Contrato`.
- `CostoDirecto`.
- `GastoFijoMensual`.
- Choices, relaciones y validaciones críticas.

## Fase 4 - Administración del sistema y datos semilla

Estado: Completada.

La fase tiene como objetivo permitir gestión desde Django Admin y crear datos base/demo.

Alcance:

- Registrar modelos en Admin.
- Crear `seed_base`.
- Crear `seed_demo`.
- Crear `clear_demo`.
- Mantener comandos idempotentes.
- No eliminar datos reales con `clear_demo`.

## Fase 5 - API REST del core

Estado: Completada.

La fase tiene como objetivo exponer CRUD y validaciones de recursos principales.

Alcance:

- Clientes.
- Tipos de evento.
- Paquetes.
- Configuración del negocio.
- Cotizaciones.
- Contratos.
- Costos directos.
- Gastos fijos.

Entregables:

- Serializers de los recursos principales.
- ViewSets autenticados para operaciones CRUD.
- Rutas API por app.
- Pruebas de API para validaciones principales.

## Fase 6 - Servicios de negocio y endpoints de acciones

Estado: Completada.

La fase tiene como objetivo implementar acciones críticas con lógica en backend.

Alcance:

- Cálculo de pre-cotización.
- Cambio de estado de cotización.
- Conversión de cotización confirmada a contrato.
- Validación de no conversión doble.
- Cálculo o validación de estado de pago.

Entregables:

- Servicio de cálculo de pre-cotización.
- Endpoint `/api/pre-cotizacion/`.
- Acción `/api/cotizaciones/{id}/cambiar-estado/`.
- Acción `/api/cotizaciones/{id}/convertir-contrato/`.
- Pruebas de validación para estados y conversión.

## Fase 7 - Frontend base y layout administrativo

Estado: Completada.

La fase tiene como objetivo crear la base visual y la navegación administrativa.

Alcance:

- React Router.
- Layout administrativo.
- Sidebar responsive.
- Topbar.
- Componentes base.
- Cliente HTTP.
- Manejo inicial de autenticación.

Entregables:

- React Router configurado.
- Layout administrativo responsive.
- Sidebar y Topbar.
- Componentes base reutilizables.
- Cliente HTTP con Axios.
- Manejo inicial de autenticación contra `/api/auth/`.

## Fase 8 - Módulos base de administración en frontend

Estado: Completada.

La fase tiene como objetivo gestionar catálogos y datos base desde la UI.

Alcance:

- Clientes.
- Tipos de evento.
- Paquetes.
- Configuración.
- Formularios con validación visible.
- Estados loading/error/empty.

Entregables:

- Pantalla de clientes conectada a `/api/clientes/`.
- Pantalla de tipos de evento conectada a `/api/tipos-evento/`.
- Pantalla de paquetes conectada a `/api/paquetes/`.
- Pantalla de configuración conectada a `/api/configuracion-negocio/`.
- Hook y servicio reutilizable para CRUD frontend.
- Fallback móvil para listados administrativos.

## Fase 9 - Pre-cotización

Estado: Completada.

La fase tiene como objetivo registrar solicitudes y crear cotizaciones reales.

Alcance:

- Formulario de pre-cotización.
- Selección de tipo de servicio.
- Resultado referencial desde backend.
- Creación de cotización en estado inicial.

Entregables:

- Pantalla `/pre-cotizacion` conectada a `/api/pre-cotizacion/`.
- Carga de clientes, tipos de evento y paquetes desde API real.
- Registro de cliente nuevo o selección de cliente existente.
- Resultado referencial devuelto por backend.
- Creación de cotización real en estado `nueva`.

## Fase 10 - Gestión comercial de cotizaciones

Estado: Completada.

La fase tiene como objetivo implementar el pipeline comercial.

Alcance:

- Listado y filtros.
- Cards o resumen por estado.
- Detalle de cotización.
- Cambio de estado.
- Acción de conversión cuando aplique.

Entregables:

- Pantalla `/cotizaciones` conectada a `/api/cotizaciones/`.
- Filtros backend por estado, tipo de evento, rango de fecha y búsqueda por cliente o teléfono.
- Resumen de pipeline por estado para la vista filtrada.
- Pantalla `/cotizaciones/:id` con detalle comercial completo.
- Cambio de estado desde listado y detalle usando `/api/cotizaciones/{id}/cambiar-estado/`.
- Conversión de cotización confirmada a contrato usando `/api/cotizaciones/{id}/convertir-contrato/`.
- Protección backend contra conversión doble y exposición de `contrato_id` para cotizaciones convertidas.

## Fase 11 - Contratos y pagos

Estado: Completada.

La fase tiene como objetivo gestionar contratos como ventas reales.

Alcance:

- Listado y detalle de contratos.
- Estado de contrato.
- Estado de pago.
- Monto abonado.
- Saldo pendiente.
- Validación de que el abono no supere el valor final.

## Fase 12 - Costos directos y gastos fijos

Estado: Completada.

La fase tiene como objetivo registrar costos y gastos que alimentan la rentabilidad.

Alcance:

- Costos directos por contrato.
- Gastos fijos por mes/año.
- Validaciones backend.
- Consumo real desde frontend.

Entregables:

- `/api/costos-directos/` con filtros por contrato, búsqueda por cliente/teléfono/concepto y rango de fecha.
- `/api/gastos-fijos/` con filtros por mes, año y concepto.
- `/api/gastos-fijos/resumen/` para total de gastos del periodo filtrado.
- Pantalla `/costos-directos` con listado, filtros, formulario con select real de contrato y acciones de edición/eliminación.
- Pantalla `/gastos-fijos` con listado, filtros, resumen del periodo y acciones de edición/eliminación.
- Datos demo con costos directos asociados a contratos confirmados y cancelados, y gastos fijos en periodo actual y otro periodo.

## Fase 13 - Inicio administrativo backend-first

Estado: Completada.

La fase tiene como objetivo mostrar un resumen operativo desde un endpoint agregado.

Alcance:

- `/api/inicio-resumen/`.
- KPIs operativos.
- Eventos próximos.
- Pendientes importantes.
- Acciones rápidas.

Entregables:

- Servicio backend `inicio_resumen` con KPIs operativos y pendientes importantes.
- Endpoint autenticado `GET /api/inicio-resumen/`.
- Prueba backend del resumen con cotizaciones, contratos confirmados/cancelados y pendientes.
- Pantalla `/inicio` conectada a datos reales del backend.
- Eventos proximos enlazados al detalle de contrato.
- Acciones rapidas administrativas sin datos quemados permanentes.

## Fase 14 - Dashboard financiero backend-first

Estado: Completada.

La fase tiene como objetivo mostrar análisis financiero con cálculos en backend.

Alcance:

- `/api/dashboard-financiero/`.
- Ingresos de contratos confirmados.
- Exclusión de contratos cancelados.
- Costos directos.
- Gastos fijos.
- Utilidad y márgenes.
- Estado de pagos.

Entregables:

- Servicio backend `dashboard_financiero` con calculo de ingresos, costos, gastos, utilidad, margen, comparacion mensual, rentabilidad por evento y estado de pagos.
- Endpoint autenticado `GET /api/dashboard-financiero/?mes=MM&anio=YYYY`.
- Pruebas backend para contratos confirmados, exclusion de cancelados, comparacion contra mes anterior y periodos sin ingresos.
- Pantalla `/dashboard-financiero` conectada al endpoint real con filtros de mes y anio.
- KPI cards, comparacion mensual, tabla responsive de rentabilidad por evento, estado de pagos e interpretacion del periodo renderizados desde payload backend.

## Fase 15 - Reportes

Estado: Completada.

La fase tiene como objetivo implementar reportes básicos.

Alcance:

- Reporte comercial.
- Reporte financiero.
- Reporte de eventos.
- Reporte de paquetes.
- Filtros por periodo cuando aplique.

Entregables:

- Servicio backend de reportes con `reporte_comercial`, `reporte_financiero`, `reporte_eventos` y `reporte_paquetes`.
- Endpoints autenticados `GET /api/reportes/comercial/`, `GET /api/reportes/financiero/`, `GET /api/reportes/eventos/` y `GET /api/reportes/paquetes/`.
- Validaciones backend para rangos de fecha y filtros de mes/anio.
- Reporte financiero reutilizando `dashboard_financiero` para evitar duplicar calculos.
- Pruebas backend de los cuatro reportes, validacion de periodos y exclusion financiera de contratos cancelados.
- Pantalla `/reportes` conectada a los endpoints reales con selector de reporte, filtros, KPIs, desgloses y tablas responsive.

## Fase 16 - Responsive, limpieza visual y experiencia de usuario

Estado: Completada.

La fase tiene como objetivo consolidar la experiencia administrativa y el comportamiento responsive.

Alcance:

- Sidebar responsive.
- Tablas con fallback móvil.
- Formularios legibles.
- Estados visuales consistentes.
- Revisión de navegación.

Entregables:

- Menu movil del layout administrativo con estado accesible, overlay, bloqueo de scroll y cierre por tecla Escape.
- Enlace de salto al contenido principal para navegacion por teclado.
- Ajustes responsive para filtros, acciones de pagina, tarjetas KPI, tablas, cards moviles y reportes.
- Modales con cierre por overlay/Escape, bloqueo de scroll del fondo y scroll interno del contenido.
- Estilos de foco visibles y control de overflow para textos, botones, celdas y valores largos.

## Fase 17 - Pruebas y validación integral

La fase tiene como objetivo validar el flujo completo.

Pruebas prioritarias:

- Validaciones backend.
- Migraciones.
- Conversión de cotización a contrato.
- Exclusión financiera de contratos cancelados.
- Dashboard financiero.
- Build frontend.
- Flujo manual principal.

Entregables completados:

- Prueba integral automatizada del flujo pre-cotizacion -> cotizacion confirmada -> contrato -> costos/gastos -> dashboard/reportes/inicio.
- Validacion de rechazo de conversion para cotizacion descartada y de no conversion doble.
- Validacion de exclusion de contratos cancelados en metricas financieras principales.
- Matriz de validacion documentada en `docs/06_validacion_fase_17.md`.

## Fase 18 - README final y documentación de uso

La fase tiene como objetivo dejar el proyecto listo para instalación, ejecución y evaluación.

Alcance:

- Instalación backend.
- Instalación frontend.
- Comandos de desarrollo.
- Datos base y demo.
- Variables de entorno.
- Deploy.
- Solución de problemas comunes.

## Fase 19 - Deploy en Render

La fase tiene como objetivo desplegar backend, frontend y base de datos.

Alcance:

- Render Web Service para Django.
- Render Static Site para React/Vite.
- Render PostgreSQL.
- Variables de entorno.
- Migraciones en producción.

## Mejoras futuras

Pueden documentarse para versiones posteriores:

- Exportación PDF.
- Exportación Excel.
- Historial detallado de seguimiento comercial.
- Múltiples pagos por contrato.
- Calendario avanzado.
- Integraciones externas.
- Automatizaciones comerciales avanzadas.
