# Estado del proyecto — RFM CORE

## Estado general

El proyecto se encuentra en etapa de consolidación del backend base. La documentación inicial, la estructura técnica, los modelos principales, la administración del sistema, los datos semilla y la API REST del core se encuentran completados.

El sistema contempla como flujo principal:

```text
Pre-cotización -> Gestión comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Fases completadas

- Fase 0 — Documentación base: Completada.
- Fase 1 — Inicialización técnica: Completada.
- Fase 2 — Configuración base del backend: Completada.
- Fase 3 — Modelado del dominio: Completada.
- Fase 4 — Administración del sistema y datos semilla: Completada.
- Fase 5 — API REST del core: Completada.

## Fase actual

La fase actual corresponde al cierre de la API REST del core.

Se establecen endpoints CRUD autenticados para los recursos principales del sistema y validaciones backend coherentes con el modelo aprobado.

## Próximos pasos

La siguiente etapa corresponde a la Fase 6 — Servicios de negocio y endpoints de acciones.

Se deberán implementar las acciones críticas de pre-cotización, cambio de estado comercial y conversión de cotizaciones confirmadas a contratos.
