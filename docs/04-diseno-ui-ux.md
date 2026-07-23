# Diseño UI/UX

## Identidad

RFM Core usa la calidez y elegancia de Rancho Flor María con superficies claras, acentos verdes y dorados controlados, bordes suaves e iconografía consistente. Inter y la pila del sistema se reservan para tablas, cifras, formularios y acciones.

## Estructura

El flujo público no muestra navegación administrativa. El panel protegido organiza:

- Inicio;
- Comercial: Personas, Cotizaciones, Contratos, Tipos de evento y Paquetes;
- Finanzas: Dashboard, Costos directos, Gastos y Reportes;
- Configuración.

## Personas

El sidebar usa `Personas`. La ruta general es `/personas`; el título visible es `Clientes & Interesados` porque explica la clasificación comercial al usuario final.

La pantalla conserva:

- descripción: “Encuentra personas por nombre o teléfono y revisa rápidamente su relación con el negocio.”;
- segmentos Todos, Clientes e Interesados;
- búsqueda remota por nombre, teléfono o correo;
- conteos de cotizaciones y contratos;
- origen y clasificación visible;
- acción primaria Detalle y menú contextual accesible;
- creación y edición sin abandonar la página.

El detalle `/personas/:id` diferencia identidad, nombres utilizados, resumen, documentos relacionados e historial verificable.

## Selector de persona

Cotizaciones y contratos reutilizan `PersonaSelector`:

- debounce y estados de carga;
- sugerencias por nombre;
- coincidencia exacta por teléfono;
- indicador Cliente o Interesado;
- navegación por teclado;
- creación rápida integrada;
- conservación del formulario principal.

La interfaz ayuda a reutilizar, pero la validación definitiva permanece en backend.

## Cotizaciones y contratos

Las cotizaciones muestran “Persona”, porque pueden pertenecer a un interesado. Los contratos y vistas financieras pueden mostrar “Cliente”, porque toda persona con un contrato ya cumple esa clasificación histórica.

Los estados de contrato y pago se presentan por separado, con texto además de color. Las acciones imposibles se ocultan según estado y las delicadas piden confirmación.

## Responsive y accesibilidad

- tablas de escritorio con columnas priorizadas;
- cards/listas legibles en móvil;
- objetivos táctiles mínimos de 44 px;
- labels visibles, errores junto al campo y foco en el primer error;
- menús cerrables con Escape y clic exterior;
- modales con foco inicial y restauración de foco;
- estados vacíos distintos para ausencia de datos y filtros sin resultados;
- carga y errores en lenguaje no técnico.

## Actualización

Las operaciones exitosas refrescan los recursos sin recargar la página. La búsqueda usa debounce y no carga la colección completa. Los filtros se aplican automáticamente y se conservan en la URL cuando corresponde.
