# Modelo de Datos Detallado

## Diagrama conceptual

```text
Persona
  |--< NombrePersona
  |--< Cotizacion >-- TipoEvento
  |        |-------> Paquete (opcional)
  |        `-- 0..1 Contrato
  `--< Contrato >-- TipoEvento
           |------> Paquete (opcional)
           `--< CostoDirecto

ConfiguracionNegocio
GastoFijoMensual
```

## Persona

Representa a cualquier persona relacionada con Rancho Flor María.

Campos principales:

- `nombre`: nombre principal editable.
- `telefono`: representación legible ingresada por el usuario.
- `telefono_normalizado`: valor canónico, único y no editable.
- `correo` y `observaciones`.
- `origen`: formulario público, cotización manual, contrato directo o registro manual.
- `creado_en` y `actualizado_en`.

No existe un campo de clasificación. La API calcula:

- Interesado cuando `contratos.count() == 0`.
- Cliente cuando `contratos.count() >= 1`, independientemente del estado posterior del contrato.

## NombrePersona

Conserva nombres alternativos:

- FK `persona`.
- `nombre` y `nombre_normalizado`.
- `origen` y fecha.
- restricción única `(persona, nombre_normalizado)`.

El nombre principal no se sobrescribe al recibir una nueva pre-cotización pública.

## Cotizacion

- FK `persona` con `related_name="cotizaciones"`.
- FK `tipo_evento`.
- FK opcional `paquete`.
- fecha tentativa, invitados, modalidad, estado, total estimado y observaciones.
- origen del documento y timestamps.

Una cotización no es una venta ni un ingreso. La relación a Contrato es uno a uno cuando se convierte.

## Contrato

- FK `persona` con `related_name="contratos"`.
- relación uno a uno opcional con Cotización.
- tipo de evento, paquete, fecha, invitados, valor final y monto abonado.
- estado de contrato y estado de pago separados.

Los saldos y estados de pago se derivan en backend. Los cancelados no participan en métricas financieras principales, pero sí en la historia contractual de la Persona.

## Catálogos

### TipoEvento

Nombre único, descripción y estado activo. Se inactiva para dejar de ofrecerlo sin romper el historial.

### Paquete

Nombre, modalidad, precio por persona, descripción y estado activo. Los paquetes históricos no se eliminan físicamente durante la operación normal.

## Finanzas

### CostoDirecto

FK a Contrato, concepto, valor, fecha, observaciones y campos de eliminación lógica.

### GastoFijoMensual

Concepto, valor, mes, año, observaciones y campos de eliminación lógica.

### ConfiguracionNegocio

Parámetros vigentes para la pre-cotización pública. Solo puede existir una configuración activa.

## Integridad

- unicidad de `Persona.telefono_normalizado`;
- aliases únicos por persona y nombre normalizado;
- valores monetarios no negativos;
- invitados positivos;
- monto abonado no mayor al valor final;
- catálogos inactivos excluidos de registros nuevos;
- relaciones protegidas o desactivadas cuando forman parte del historial.

## Migraciones de nomenclatura

- `negocio.0006_rename_cliente_persona`: renombra modelo, tabla y FK de alias; elimina el marcador demo.
- `comercial.0005_rename_cliente_persona`: renombra la FK de Cotización y elimina el marcador demo.
- `financiero.0004_rename_cliente_persona`: renombra la FK de Contrato y elimina marcadores demo financieros.

Las migraciones históricas anteriores conservan los nombres antiguos porque documentan estados previos necesarios para reconstruir la base desde cero.
