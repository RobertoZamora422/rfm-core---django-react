# Diseno UI/UX - RFM Core

## Principios

- Claridad antes que decoracion.
- Separacion visual entre experiencia publica y panel administrativo.
- Backend-first en valores, estados y calculos.
- Estados de carga, error y vacio visibles.
- Responsive real para formularios, tablas y cards.
- Sin datos quemados permanentes en frontend.

## PublicLayout

El flujo publico usa `PublicLayout`.

Caracteristicas:

- No muestra Sidebar ni Topbar administrativo.
- Presenta marca, acceso administrativo y contenido centrado.
- Esta orientado a cliente/interesado.
- No solicita correo ni registro de usuario.
- Prioriza completar datos minimos y continuar por WhatsApp.

Pantallas publicas:

- `/pre-cotizacion`: formulario inicial.
- `/pre-cotizacion/alquiler`: resumen del evento, calculo de alquiler, advertencia y WhatsApp.
- `/pre-cotizacion/servicio-completo`: resumen del evento, paquetes activos, totales por paquete y WhatsApp.
- `/pre-cotizacion/comparacion`: resumen, comparacion de modalidades, advertencia y WhatsApp.

Opciones del formulario publico:

- Alquiler del local.
- Servicio completo.
- Aun no estoy seguro.

## AdminLayout

El panel administrativo usa `AdminLayout`.

Caracteristicas:

- Protegido por `ProtectedRoute`.
- Incluye Sidebar, Topbar y contenido administrativo.
- Gestiona clientes, tipos de evento, paquetes, configuracion, cotizaciones, contratos, costos, gastos, dashboard y reportes.
- No contiene la pre-cotizacion publica como modulo protegido.

## Inicio administrativo

`/inicio` es la primera pantalla operativa del panel administrativo.

Debe comunicar trabajo pendiente y proximas acciones:

- Encabezado de bienvenida con fecha y accion de actualizar.
- Cuatro KPIs operativos del resumen backend: cotizaciones nuevas, cotizaciones del mes, eventos del mes y eventos proximos.
- Accesos rapidos agrupados en gestion comercial y finanzas/reportes.
- Eventos proximos con enlace al detalle del contrato y datos minimos de cliente, tipo, paquete si aplica, fecha, estado de pago y saldo.
- Pendientes importantes calculados en backend.

Estados esperados:

- Loading mientras se consulta `GET /api/inicio-resumen/`.
- Error visible si falla la consulta.
- Empty state cuando no hay resumen, eventos o pendientes.

Limites de UX:

- No debe mezclar graficas financieras ni reportes historicos.
- No debe mostrar datos quemados permanentes.
- No debe recalcular KPIs a partir de listas completas en React.

## Dashboard financiero

`/dashboard-financiero` es una pantalla ejecutiva de analisis mensual, separada de Inicio y Reportes.

Estructura visual:

- Header con titulo, descripcion, selector de mes/anio y accion de actualizar.
- KPIs financieros principales en grid responsive: ingresos, costos directos, utilidad bruta/margen bruto, gastos fijos, utilidad neta/margen neto y ticket promedio.
- Desempeno comercial separado de los KPIs: paquete mas vendido, paquete mas rentable, tipo de evento mas frecuente y tipo de evento mas rentable.
- Analisis comparativo del negocio con graficos de evolucion mensual, mes actual vs mes anterior, rentabilidad por paquete, analisis por tipo de evento, top de eventos rentables y cobranza.
- Tabla de rentabilidad por evento.
- Pendientes financieros.
- Interpretacion del periodo.

Estados esperados:

- Loading mientras se consulta `GET /api/dashboard-financiero/`.
- Error visible si falla la consulta.
- Empty states profesionales cuando no hay contratos confirmados, costos, gastos, comparacion o informacion suficiente para interpretar el periodo.

Limites de UX:

- No debe mostrar datos inventados ni mocks permanentes.
- No debe mezclar las cards comerciales con los KPIs financieros principales.
- No debe contar cotizaciones ni contratos cancelados como ingresos.
- Debe renderizar metricas principales calculadas por backend y usar graficos solo como visualizacion.

## Navegacion

Publica:

```text
/
/pre-cotizacion
/pre-cotizacion/alquiler
/pre-cotizacion/servicio-completo
/pre-cotizacion/comparacion
/login
```

Administrativa:

```text
/inicio
/clientes
/tipos-evento
/paquetes
/configuracion
/cotizaciones
/cotizaciones/:id
/contratos
/contratos/:id
/costos-directos
/gastos-fijos
/dashboard-financiero
/reportes
```

## Reglas UX

- El resultado publico debe indicar que el valor es referencial.
- WhatsApp debe llevar un mensaje prellenado con datos del evento y usar el numero normalizado recibido desde backend.
- El servicio completo muestra solo paquetes activos.
- La comparacion ayuda a entender diferencias, no reemplaza asesoria humana.
- Las rutas administrativas redirigen a `/login` sin token.
- La UI administrativa conserva tablas con fallback movil, filtros y acciones existentes.
- Los calculos visibles deben venir del backend.
- La pantalla administrativa de Configuracion permite editar el WhatsApp del negocio en formato `09XXXXXXXX`; el frontend valida el formato y el backend conserva la validacion final.
