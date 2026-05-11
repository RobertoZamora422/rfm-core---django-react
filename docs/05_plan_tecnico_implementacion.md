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

Objetivo: definir la base conceptual, técnica y visual antes de implementar código.

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

Objetivo: preparar backend y frontend mínimos.

Alcance:

- Crear `backend/`.
- Crear `frontend/`.
- Inicializar proyecto Django.
- Inicializar proyecto React/Vite.
- Crear archivos de entorno ejemplo.
- Validar ejecución local mínima.

No incluye todavía modelos del dominio ni API completa.

## Fase 2 - Configuración base del backend

Objetivo: configurar Django, DRF, CORS, autenticación inicial y endpoint de salud.

Alcance:

- Configurar settings por entorno.
- Instalar dependencias backend.
- Crear apps base sugeridas.
- Agregar `/api/health/`.
- Validar `python manage.py check`.

## Fase 3 - Modelado del dominio

Objetivo: crear modelos principales y migraciones.

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

Objetivo: permitir gestión desde Django Admin y crear datos base/demo.

Alcance:

- Registrar modelos en Admin.
- Crear `seed_base`.
- Crear `seed_demo`.
- Crear `clear_demo`.
- Mantener comandos idempotentes.
- No eliminar datos reales con `clear_demo`.

## Fase 5 - API REST del core

Objetivo: exponer CRUD y validaciones de recursos principales.

Alcance:

- Clientes.
- Tipos de evento.
- Paquetes.
- Configuración del negocio.
- Cotizaciones.
- Contratos.
- Costos directos.
- Gastos fijos.

## Fase 6 - Servicios de negocio y endpoints de acciones

Objetivo: implementar acciones críticas con lógica en backend.

Alcance:

- Cálculo de pre-cotización.
- Cambio de estado de cotización.
- Conversión de cotización confirmada a contrato.
- Validación de no conversión doble.
- Cálculo o validación de estado de pago.

## Fase 7 - Frontend base y layout administrativo

Objetivo: crear base visual y navegación administrativa.

Alcance:

- React Router.
- Layout administrativo.
- Sidebar responsive.
- Topbar.
- Componentes base.
- Cliente HTTP.
- Manejo inicial de autenticación.

## Fase 8 - Módulos base de administración en frontend

Objetivo: gestionar catálogos y datos base desde la UI.

Alcance:

- Clientes.
- Tipos de evento.
- Paquetes.
- Configuración.
- Formularios con validación visible.
- Estados loading/error/empty.

## Fase 9 - Pre-cotización

Objetivo: registrar solicitudes y crear cotizaciones reales.

Alcance:

- Formulario de pre-cotización.
- Selección de tipo de servicio.
- Resultado referencial desde backend.
- Creación de cotización en estado inicial.

## Fase 10 - Gestión comercial de cotizaciones

Objetivo: implementar pipeline comercial.

Alcance:

- Listado y filtros.
- Cards o resumen por estado.
- Detalle de cotización.
- Cambio de estado.
- Acción de conversión cuando aplique.

## Fase 11 - Contratos y pagos

Objetivo: gestionar contratos como ventas reales.

Alcance:

- Listado y detalle de contratos.
- Estado de contrato.
- Estado de pago.
- Monto abonado.
- Saldo pendiente.
- Validación de que el abono no supere el valor final.

## Fase 12 - Costos directos y gastos fijos

Objetivo: registrar costos y gastos que alimentan rentabilidad.

Alcance:

- Costos directos por contrato.
- Gastos fijos por mes/año.
- Validaciones backend.
- Consumo real desde frontend.

## Fase 13 - Inicio administrativo backend-first

Objetivo: mostrar resumen operativo desde un endpoint agregado.

Alcance:

- `/api/inicio-resumen/`.
- KPIs operativos.
- Eventos próximos.
- Pendientes importantes.
- Acciones rápidas.

## Fase 14 - Dashboard financiero backend-first

Objetivo: mostrar análisis financiero con cálculos en backend.

Alcance:

- `/api/dashboard-financiero/`.
- Ingresos de contratos confirmados.
- Exclusión de contratos cancelados.
- Costos directos.
- Gastos fijos.
- Utilidad y márgenes.
- Estado de pagos.

## Fase 15 - Reportes

Objetivo: implementar reportes básicos.

Alcance:

- Reporte comercial.
- Reporte financiero.
- Reporte de eventos.
- Reporte de paquetes.
- Filtros por periodo cuando aplique.

## Fase 16 - Responsive, limpieza visual y experiencia de usuario

Objetivo: pulir la experiencia administrativa.

Alcance:

- Sidebar responsive.
- Tablas con fallback móvil.
- Formularios legibles.
- Estados visuales consistentes.
- Revisión de navegación.

## Fase 17 - Pruebas y validación integral

Objetivo: validar el flujo completo.

Pruebas prioritarias:

- Validaciones backend.
- Migraciones.
- Conversión de cotización a contrato.
- Exclusión financiera de contratos cancelados.
- Dashboard financiero.
- Build frontend.
- Flujo manual principal.

## Fase 18 - README final y documentación de uso

Objetivo: dejar el proyecto listo para instalación, ejecución y evaluación.

Alcance:

- Instalación backend.
- Instalación frontend.
- Comandos de desarrollo.
- Datos base y demo.
- Variables de entorno.
- Deploy.
- Solución de problemas comunes.

## Fase 19 - Deploy en Render

Objetivo: desplegar backend, frontend y base de datos.

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
