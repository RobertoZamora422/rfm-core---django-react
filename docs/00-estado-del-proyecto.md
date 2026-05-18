# Estado del proyecto - RFM CORE

## Estado general

El proyecto se encuentra en etapa de consolidacion del flujo comercial y financiero inicial. La documentacion inicial, el backend core, los servicios de negocio, el layout frontend administrativo, los modulos base de administracion, la pre-cotizacion, la gestion comercial de cotizaciones, contratos, costos directos/gastos fijos, el inicio administrativo backend-first y el dashboard financiero backend-first se encuentran completados.

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
- Fase 13 - Inicio administrativo backend-first: Completada.
- Fase 14 - Dashboard financiero backend-first: Completada.

## Fase actual

La fase actual corresponde al cierre del dashboard financiero backend-first.

Se establece el endpoint `/api/dashboard-financiero/` como fuente de verdad para KPIs financieros, comparacion mensual, rentabilidad por evento, estado de pagos e interpretacion del periodo. La pantalla `/dashboard-financiero` consume ese endpoint y permite filtrar por mes y anio sin recalcular metricas principales en React.

## Proximos pasos

La siguiente etapa corresponde a la Fase 15 - Reportes.

Se deberan implementar reportes comerciales y financieros basicos reutilizando la logica backend existente y evitando duplicar calculos del dashboard en frontend.
