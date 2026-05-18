# Estado del proyecto - RFM CORE

## Estado general

El proyecto se encuentra en etapa de consolidacion del flujo comercial y financiero inicial. La documentacion inicial, el backend core, los servicios de negocio, el layout frontend administrativo, los modulos base de administracion, la pre-cotizacion, la gestion comercial de cotizaciones, contratos, costos directos/gastos fijos y el inicio administrativo backend-first se encuentran completados.

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

## Fase actual

La fase actual corresponde al cierre del inicio administrativo backend-first.

Se establece el endpoint `/api/inicio-resumen/` como fuente de verdad para KPIs operativos, eventos proximos y pendientes importantes. La pantalla `/inicio` consume ese endpoint, mantiene acciones rapidas administrativas y enlaza eventos proximos al detalle del contrato.

## Proximos pasos

La siguiente etapa corresponde a la Fase 14 - Dashboard financiero backend-first.

Se debera implementar el analisis financiero desde backend, excluyendo contratos cancelados de metricas principales y evitando calculos financieros duplicados en React.
