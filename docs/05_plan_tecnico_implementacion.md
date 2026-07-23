# Plan Técnico de Implementación

## Objetivo

Mantener RFM Core como un producto coherente desde base de datos hasta interfaz, con reglas comerciales y financieras centralizadas en backend.

## Estado de fases

### Plataforma base — completada

- Django REST Framework y React/Vite.
- autenticación administrativa por token;
- configuración local y Render;
- migraciones, checks y suites automatizadas.

### Flujo público — completada

- pre-cotización sin login;
- cálculo por estrategias de alquiler, servicio completo o comparación;
- registro transaccional de Persona y Cotización;
- continuidad por WhatsApp configurado en backend.

### Gestión comercial — completada

- Personas, Cotizaciones, Contratos, Tipos de evento y Paquetes;
- búsqueda, filtros, detalle, creación, edición y acciones por estado;
- creación rápida y selección remota de personas;
- conversión única de cotización a contrato;
- responsive, accesibilidad y estados vacíos.

### Finanzas y reportes — completada

- costos directos, gastos recurrentes y gastos adicionales;
- dashboard mensual y reportes históricos;
- exclusión de contratos cancelados de métricas principales;
- selectors y services para evitar lógica duplicada.

### Canonicalización de Persona — completada

- modelo `Persona` y tabla `negocio_persona`;
- FK `persona` en Cotización y Contrato;
- serializers y viewset de Persona;
- `/api/personas/` y rutas frontend `/personas`;
- sidebar `Personas` y pantalla `Clientes & Interesados`;
- clasificación Cliente/Interesado derivada de contratos históricos;
- teléfono normalizado único, alias y origen preservados;
- retirada de la nomenclatura técnica genérica anterior.

### Preparación para datos reales — completada

- eliminación de datos operativos demo locales;
- conservación de configuración activa y administrador;
- eliminación de semillas y marcadores demo;
- comando explícito `limpiar_datos_operativos` con simulación por defecto;
- migración comprobada sobre copia y desde base vacía.

## Convenciones vigentes

### Backend

- models: integridad estructural y validaciones base;
- serializers: contrato HTTP y errores de campo;
- services: operaciones compuestas y transacciones;
- selectors: consultas, filtros, anotaciones y optimización;
- views: autorización, parámetros y respuesta HTTP.

### Frontend

- services: rutas HTTP centralizadas;
- hooks: carga, debounce, refresco y coincidencias;
- componentes compartidos solo cuando mejoran consistencia;
- páginas orientadas a tareas y no a reproducir el esquema del endpoint.

## Contratos de datos principales

```text
Persona: id, nombre, telefono, correo, origen, clasificacion, conteos
Cotizacion: persona, tipo_evento, paquete, fecha, invitados, estado, total
Contrato: persona, cotizacion, evento, pago, valor, saldo, costos
```

Las relaciones se envían como IDs en `persona`, nunca como identificadores escritos manualmente por el usuario.

## Política de datos iniciales

- `migrate` solo crea estructura y permisos del framework.
- `createsuperuser` se ejecuta de forma explícita.
- Configuración, tipos de evento y paquetes se registran con información real.
- No hay fixtures o seeds demo automáticos.
- La limpieza destructiva requiere `limpiar_datos_operativos --execute`.

## Control de cambios

Antes de integrar una modificación sustancial:

1. auditar modelos, serializers, services, selectors, endpoints y consumidores;
2. proteger compatibilidad solo cuando exista un consumidor real;
3. generar migraciones no destructivas o justificar explícitamente la limpieza;
4. actualizar pruebas del comportamiento modificado;
5. ejecutar checks, suite backend, lint, build y `git diff --check`;
6. validar los flujos críticos en navegador.

## Trabajo futuro condicionado a decisión de producto

- auditoría de eventos totalmente persistida: solo si el negocio requiere trazabilidad más allá del historial verificable actual;
- integración de mensajería: solo con alcance, consentimiento y proveedor definidos;
- importación masiva: solo cuando existan datos reales que justifiquen reglas de conciliación.

No se agregan métricas, estados ni automatizaciones sin una tarea operativa demostrable.
