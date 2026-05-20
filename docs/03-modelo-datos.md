# Modelo de Datos - RFM Core

## Principios

- Una cotización es una oportunidad comercial, no ingreso real.
- Un contrato confirmado representa ingreso real.
- Estado de contrato y estado de pago son conceptos separados.
- Las relaciones se implementan con claves foráneas.
- Los valores monetarios usan `DecimalField`.
- Las validaciones críticas viven en backend.
- Los contratos cancelados no alimentan métricas financieras principales.

## Entidades principales

```text
Cliente
TipoEvento
Paquete
ConfiguracionNegocio
Cotizacion
Contrato
CostoDirecto
GastoFijoMensual
```

## Estado de implementación

Al cierre de la Fase 3, el modelo inicial del dominio se encuentra implementado en backend:

- `negocio`: `Cliente`, `TipoEvento`, `Paquete`, `ConfiguracionNegocio`.
- `comercial`: `Cotizacion`.
- `financiero`: `Contrato`, `CostoDirecto`, `GastoFijoMensual`.

Las entidades cuentan con migraciones iniciales, relaciones principales, choices y validaciones backend de primer nivel.

La Fase 4 agregó el campo `es_demo` en las entidades operativas que pueden formar parte de datos de demostración:

- `Cliente`.
- `Cotizacion`.
- `Contrato`.
- `CostoDirecto`.
- `GastoFijoMensual`.

Este marcador permite que `clear_demo` elimine únicamente datos demo sin afectar tipos de evento, paquetes, configuración del negocio ni registros reales.

## Cliente

Campos mínimos:

```text
nombre
telefono
correo
observaciones
creado_en
actualizado_en
```

Reglas:

- `nombre` obligatorio.
- `telefono` obligatorio.
- Teléfono validado en backend.

## TipoEvento

Campos mínimos:

```text
nombre
descripcion
activo
creado_en
actualizado_en
```

Reglas:

- `nombre` obligatorio.
- No duplicar nombres exactos.

## Paquete

Campos mínimos:

```text
nombre
tipo_servicio
precio_por_persona
descripcion
activo
creado_en
actualizado_en
```

Choices de `tipo_servicio`:

```text
alquiler
servicio_completo
```

Reglas:

- Precio no negativo.
- Si es servicio completo, debe tener precio por persona.

## ConfiguracionNegocio

Campos mínimos:

```text
nombre_negocio
tarifa_base_alquiler
invitados_incluidos_alquiler
costo_invitado_adicional
whatsapp_negocio
activo
creado_en
actualizado_en
```

Reglas:

- Debe existir una sola configuración activa.
- Los valores monetarios no pueden ser negativos.

Notas de WhatsApp:

- `whatsapp_negocio` es opcional inicialmente y, cuando se ingresa, debe usar formato local ecuatoriano `09XXXXXXXX`.
- El backend normaliza `whatsapp_negocio` a `whatsapp_numero_url` para enlaces `wa.me`, por ejemplo `0991234567` -> `593991234567`.

## Cotizacion

Campos mínimos:

```text
cliente
tipo_evento
paquete
fecha_tentativa
numero_invitados
tipo_servicio
estado
total_estimado
observaciones
creado_en
actualizado_en
```

Estados:

```text
nueva
contactada
confirmada
convertida
descartada
```

Reglas:

- Número de invitados mayor que cero.
- Total estimado no negativo.
- Una cotización convertida no debe convertirse otra vez.
- Una cotización no debe alimentar métricas financieras como ingreso real.

## Contrato

Campos mínimos:

```text
cotizacion
cliente
tipo_evento
paquete
fecha_evento
numero_invitados
valor_final
monto_abonado
estado_contrato
estado_pago
observaciones
creado_en
actualizado_en
```

Estados de contrato:

```text
confirmado
cancelado
```

Estados de pago:

```text
pendiente
abonado
pagado
```

Reglas:

- Valor final no negativo.
- Monto abonado no negativo.
- Monto abonado no puede superar valor final.
- Contratos cancelados se excluyen de métricas financieras principales.

## CostoDirecto

Campos mínimos:

```text
contrato
concepto
valor
fecha
observaciones
creado_en
actualizado_en
```

Reglas:

- Debe estar asociado a un contrato.
- Valor no negativo.
- Alimenta utilidad bruta y rentabilidad por evento cuando el contrato cuenta financieramente.

## GastoFijoMensual

Campos mínimos:

```text
concepto
valor
mes
anio
observaciones
creado_en
actualizado_en
```

Reglas:

- Valor no negativo.
- Mes entre 1 y 12.
- Año válido.
- Afecta utilidad neta mensual.

## Reglas de cálculo

Saldo pendiente:

```text
saldo_pendiente = valor_final - monto_abonado
```

Estado de pago recomendado:

```text
Si monto_abonado = 0:
    estado_pago = pendiente

Si monto_abonado > 0 y monto_abonado < valor_final:
    estado_pago = abonado

Si monto_abonado = valor_final:
    estado_pago = pagado
```

Utilidad bruta:

```text
utilidad_bruta = valor_final - total_costos_directos
```

Margen bruto:

```text
margen_bruto = (utilidad_bruta / valor_final) * 100
```

Utilidad neta mensual:

```text
utilidad_neta = ingresos_mes - costos_directos_mes - gastos_fijos_mes
```

Margen neto mensual:

```text
margen_neto = (utilidad_neta / ingresos_mes) * 100
```

Las divisiones deben evitar errores cuando el denominador sea cero.

## Entidades opcionales de evolución

No implementar en la primera versión salvo decisión explícita:

- `SeguimientoCotizacion`.
- `PagoContrato`.
- `CategoriaCosto`.
- `CategoriaGasto`.

La versión inicial usará `monto_abonado` en `Contrato` en lugar de un historial avanzado de pagos.
