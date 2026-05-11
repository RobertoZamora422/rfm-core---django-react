# Estado del proyecto — RFM CORE

## Estado general

El proyecto se encuentra en etapa de administración inicial del sistema. La documentación base, la estructura backend/frontend, la configuración base del backend, los modelos principales y la administración con datos semilla ya fueron completados.

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

## Fase actual

La fase actual corresponde al cierre de la administración inicial del sistema y datos semilla.

Se registraron los modelos principales en Django Admin y se establecieron comandos idempotentes para datos base, datos demo y limpieza segura de datos demo.

## Próximos pasos

La siguiente etapa corresponde a la Fase 5 — API REST del core.

Se deberán implementar serializers, vistas y rutas API para los recursos principales del sistema.
