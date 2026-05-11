# Estado del proyecto - RFM CORE

## Estado general

El proyecto se encuentra en etapa de consolidacion del flujo comercial inicial. La documentacion inicial, el backend core, los servicios de negocio, el layout frontend administrativo, los modulos base de administracion, la pre-cotizacion y la gestion comercial de cotizaciones se encuentran completados.

El sistema contempla como flujo principal:

```text
Pre-cotizacion -> Gestion comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Fases completadas

- Fase 0 - Documentacion base: Completada.
- Fase 1 - Inicializacion tecnica: Completada.
- Fase 2 - Configuracion base del backend: Completada.
- Fase 3 - Modelado del dominio: Completada.
- Fase 4 - Administracion del sistema y datos semilla: Completada.
- Fase 5 - API REST del core: Completada.
- Fase 6 - Servicios de negocio y endpoints de acciones: Completada.
- Fase 7 - Frontend base y layout administrativo: Completada.
- Fase 8 - Modulos base de administracion en frontend: Completada.
- Fase 9 - Pre-cotizacion: Completada.
- Fase 10 - Gestion comercial de cotizaciones: Completada.

## Fase actual

La fase actual corresponde al cierre de la gestion comercial de cotizaciones.

Se establece un pipeline comercial conectado al backend para listar cotizaciones reales, filtrar por estado, tipo de evento, fecha y busqueda por cliente o telefono, consultar detalle, cambiar estado y convertir cotizaciones confirmadas a contrato sin permitir conversion doble.

## Proximos pasos

La siguiente etapa corresponde a la Fase 11 - Contratos y pagos.

Se debera implementar la gestion operativa de contratos como ventas reales: listado, detalle, estado contractual, estado de pago, monto abonado, saldo pendiente y cancelacion controlada.
