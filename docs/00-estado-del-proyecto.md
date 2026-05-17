# Estado del proyecto - RFM CORE

## Estado general

El proyecto se encuentra en etapa de consolidacion del flujo comercial y financiero inicial. La documentacion inicial, el backend core, los servicios de negocio, el layout frontend administrativo, los modulos base de administracion, la pre-cotizacion, la gestion comercial de cotizaciones, contratos y la Fase 12 de costos directos/gastos fijos se encuentran completados.

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
- Fase 11 - Contratos y pagos: Completada.
- Fase 12 - Costos directos y gastos fijos: Completada.

## Fase actual

La fase actual corresponde al cierre de costos directos y gastos fijos.

Se establecen pantallas administrativas conectadas al backend para registrar, listar, editar, eliminar y filtrar costos directos asociados a contratos reales, y gastos fijos mensuales independientes de contratos. El backend valida montos, fechas, mes/anio y relaciones obligatorias; ademas expone un resumen de total de gastos del periodo filtrado.

## Proximos pasos

La siguiente etapa corresponde a la Fase 13 - Inicio administrativo backend-first.

Se debera implementar un endpoint agregado para el inicio administrativo y mover los KPIs operativos al backend sin duplicar reglas de negocio en React.
