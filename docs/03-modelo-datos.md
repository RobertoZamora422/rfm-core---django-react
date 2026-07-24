# Modelo de Datos Detallado

> Estado: modelo vigente. Las migraciones `comercial.0009` y
> `financiero.0007` agregan índices no destructivos sobre filtros frecuentes.

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
GastoRecurrente
  |--< GastoRecurrenteVersion
  `--< GastoRecurrenteAjuste
GastoAdicional
```

## Persona

Representa a cualquier persona relacionada con Rancho Flor María.

Campos principales:

- `nombre`: nombre principal editable.
- `telefono`: celular ecuatoriano almacenado como `09XXXXXXXX`.
- `telefono_normalizado`: el mismo valor canónico `09XXXXXXXX`, único y no
  editable. Los formatos `5939XXXXXXXX` y `+5939XXXXXXXX` se convierten antes
  de buscar, comparar o guardar.
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

### GastoRecurrente

Define un compromiso habitual mediante concepto, observaciones, periodo inicial,
periodo final opcional y estado activo. No se generan filas mensuales futuras.

### GastoRecurrenteVersion

Conserva cada valor mensual con `vigente_desde` y `vigente_hasta`. Sus intervalos
no pueden solaparse dentro de una misma recurrencia. Un cambio permanente crea
una nueva versión efectiva y no reescribe valores anteriores.

### GastoRecurrenteAjuste

Excepción de valor para un único periodo. La restricción única
`(gasto_recurrente, periodo)` impide contabilizar dos ajustes para la misma
recurrencia y mes.

### GastoAdicional

Gasto general no asociado a contratos que ocurre en una fecha concreta.
Mantiene eliminación lógica. Los registros del antiguo `GastoFijoMensual` se
conservan aquí con `origen_legacy=True` y la fecha equivalente al primer día del
mes original.

### ConfiguracionNegocio

Parámetros vigentes para la pre-cotización pública. Solo puede existir una configuración activa.

## Integridad

- unicidad de `Persona.telefono_normalizado` en formato canónico
  `09XXXXXXXX`;
- nombre de Persona con al menos tres letras y separadores internos válidos;
- aliases únicos por persona y nombre normalizado;
- valores monetarios no negativos;
- versiones recurrentes con vigencia válida e inicio único por recurrencia;
- un único ajuste por recurrencia y periodo;
- invitados positivos;
- monto abonado no mayor al valor final;
- catálogos inactivos excluidos de registros nuevos;
- relaciones protegidas o desactivadas cuando forman parte del historial.

## Migraciones de nomenclatura

- `negocio.0006_rename_cliente_persona`: renombra modelo, tabla y FK de alias; elimina el marcador demo.
- `negocio.0009_person_name_and_ecuador_mobile_validation`: normaliza celulares
  ecuatorianos existentes al formato `09XXXXXXXX` y registra los validadores
  compartidos de nombres.
- `comercial.0005_rename_cliente_persona`: renombra la FK de Cotización y elimina el marcador demo.
- `financiero.0004_rename_cliente_persona`: renombra la FK de Contrato y elimina marcadores demo financieros.
- `financiero.0005_gastos_recurrentes_y_adicionales`: conserva los gastos
  mensuales como adicionales históricos y agrega recurrencias, versiones y
  ajustes mensuales sin crear aplicaciones futuras.

Las migraciones históricas anteriores conservan los nombres antiguos porque documentan estados previos necesarios para reconstruir la base desde cero.
