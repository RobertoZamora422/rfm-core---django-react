# Estado actual de RFM Core

Fecha de referencia: 22 de julio de 2026.

## Estado funcional

RFM Core dispone de:

- pre-cotización pública sin autenticación;
- autenticación administrativa por token;
- Inicio operativo;
- Personas, Cotizaciones, Contratos, Tipos de evento y Paquetes;
- Configuración del negocio;
- costos directos, gastos recurrentes, gastos adicionales, dashboard financiero y reportes;
- diseño responsive y actualización automática de recursos administrativos.

## Dominio de identidad

`Persona` es la única entidad canónica para cualquier persona relacionada con el negocio. Cotizaciones y contratos apuntan a `persona`.

La clasificación se calcula desde backend:

- Interesado: cero contratos históricos.
- Cliente: uno o más contratos históricos, incluidos los cancelados.

No hay modelos `Cliente` o `Interesado`, ni un campo editable de clasificación. El teléfono normalizado es único; el origen inicial y los alias se conservan.

## Navegación y API

- Menú: `Personas`.
- Pantalla: `Clientes & Interesados`.
- Ruta: `/personas` y detalle `/personas/:id`.
- API: `/api/personas/`, `/api/personas/resumen/` y `/api/personas/coincidencias/`.
- La API y las rutas antiguas de la entidad genérica ya no se mantienen.

## Estado de datos

La base local está preparada para información real:

- cero personas, alias, cotizaciones y contratos;
- cero tipos de evento, paquetes, costos directos y gastos operativos;
- una configuración activa de Rancho Flor María;
- un usuario administrativo.

No existen cargas demo automáticas. Los comandos antiguos de semillas y sus marcadores técnicos fueron eliminados.

## Calidad y mantenimiento

- reglas de negocio en servicios, selectors y serializers;
- transacciones para creación compuesta y deduplicación;
- consultas anotadas para clasificación y conteos;
- búsqueda remota con debounce en selectores de persona;
- migraciones reproducibles desde una base vacía;
- limpieza operativa explícita mediante `limpiar_datos_operativos`.

## Próximos pasos operativos

1. Registrar tipos de evento reales.
2. Registrar paquetes reales.
3. Confirmar la configuración vigente del negocio.
4. Iniciar la captación pública y administrativa de personas.
5. Mantener las validaciones descritas en `06_validacion_fase_17.md` como control de regresión.
