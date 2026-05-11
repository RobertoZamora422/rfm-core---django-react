# Diseño UI/UX - RFM Core

## Principios de diseño

- Claridad antes que decoración.
- Interfaz administrativa profesional.
- Jerarquía visual clara.
- Backend-first en la presentación de datos.
- Consistencia visual entre pantallas.
- Diseño responsive desde el inicio.
- No usar datos quemados permanentes.

## Layout general

Estructura esperada:

- Sidebar para navegación principal.
- Topbar o header global.
- Área principal de contenido.
- Páginas con encabezado claro, acciones primarias y estado de carga/error/vacío.

Al cierre de la Fase 7, el frontend establece el layout administrativo base con `Sidebar`, `Topbar`, rutas protegidas, página de login y componentes reutilizables iniciales.

Al cierre de la Fase 8, las pantallas de clientes, tipos de evento, paquetes y configuración cuentan con listado, formulario de creación/edición, estados de carga/error/vacío y fallback móvil.

El inicio administrativo y el dashboard financiero deben diferenciarse:

- Inicio administrativo: resumen operativo y pendientes.
- Dashboard financiero: análisis de rentabilidad.

## Navegación principal

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

Agrupación sugerida:

- Operación: Inicio, Pre-cotización, Cotizaciones, Contratos.
- Catálogos: Clientes, Tipos de evento, Paquetes.
- Finanzas: Costos directos, Gastos fijos, Dashboard financiero, Reportes.
- Sistema: Configuración.

## Componentes reutilizables esperados

```text
Button
Input
Select
Textarea
DataTable
Card
KpiCard
StatusBadge
Modal
PageHeader
EmptyState
LoadingState
ErrorMessage
Sidebar
Topbar
```

## Badges de estado

Cotizaciones:

```text
nueva       -> informativo
contactada  -> advertencia suave
confirmada  -> positivo
convertida  -> positivo fuerte
descartada  -> neutro/gris
```

Contratos:

```text
confirmado -> positivo
cancelado  -> neutro/gris oscuro
```

Pagos:

```text
pendiente -> naranja
abonado   -> amarillo/dorado
pagado    -> verde
```

## Formularios

- Usar labels visibles.
- Mostrar errores de validación cerca del campo correspondiente.
- Usar selects para relaciones como cliente, tipo de evento, paquete y contrato.
- Evitar que el usuario escriba identificadores manualmente.
- Mantener botones primarios y secundarios consistentes.

## Tablas y listados

- Usar columnas claras y acciones por fila.
- Incluir filtros cuando ayuden al flujo.
- Evitar tablas que rompan el diseño en móvil.
- Usar fallback tipo cards en pantallas pequeñas.
- Incluir estados de carga, error y vacío.

## Pantallas principales

Login:

- Formulario simple para usuario administrativo.
- Mensajes de error claros.

Inicio administrativo:

- Resumen operativo.
- KPIs de actividad comercial.
- Acciones rápidas.
- Eventos próximos.
- Pendientes importantes.

Pre-cotización:

- Formulario para datos del cliente y evento.
- Selección de tipo de servicio.
- Resultado referencial generado desde backend.
- Creación de cotización real.

Al cierre de la Fase 9, la pantalla de pre-cotización permite seleccionar cliente existente o registrar cliente nuevo, elegir tipo de evento, tipo de servicio, paquete cuando corresponde y mostrar el resultado devuelto por backend.

Cotizaciones:

- Listado por estado.
- Filtros.
- Acciones para ver detalle, cambiar estado y convertir cuando corresponda.
- Al cierre de Fase 10, la pantalla incluye filtros por busqueda, estado, tipo de evento y rango de fecha, KPIs de pipeline sobre la vista filtrada, tabla de escritorio y fallback movil.
- El detalle de cotizacion muestra resumen comercial, estado editable y enlace al contrato cuando la cotizacion ya fue convertida.

Detalle de cotización:

- Datos del cliente, evento y propuesta.
- Historial básico o estado actual.
- Acción de conversión solo si está confirmada y no convertida.

Contratos:

- Listado de ventas reales.
- Separación visual de estado de contrato y estado de pago.
- Acceso al detalle.

Detalle de contrato:

- Información del evento.
- Datos de pago.
- Costos directos asociados.
- KPIs de utilidad bruta y margen bruto.

Costos directos:

- Registro de costos asociados a contratos.
- Filtro por contrato o periodo.

Gastos fijos:

- Registro mensual de gastos operativos.
- Validación de mes y año.

Dashboard financiero:

- KPIs principales.
- Ingresos, costos, gastos, utilidad y márgenes.
- Ranking o comparativas basadas solo en contratos financieros válidos.

Reportes:

- Reportes comerciales, financieros, eventos y paquetes.
- Datos desde backend.

Configuración:

- Parámetros del negocio.
- Una sola configuración activa.

## Reglas UX obligatorias

- Mantener una interfaz administrativa clara.
- Usar badges consistentes.
- Mostrar errores útiles.
- No ocultar validaciones críticas solo en frontend.
- No calcular KPIs financieros principales en React.
- No reservar espacio visual para datos inexistentes.
- Mantener el sidebar responsive.
