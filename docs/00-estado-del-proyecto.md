# Estado del proyecto — RFM CORE

## Estado general

El proyecto se encuentra en etapa de modelado inicial del dominio. La documentación base, la estructura backend/frontend, la configuración base del backend y los modelos principales ya fueron completados.

El sistema contempla como flujo principal:

```text
Pre-cotización -> Gestión comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Fases completadas

- Fase 0 — Documentación base: Completada.
- Fase 1 — Inicialización técnica: Completada.
- Fase 2 — Configuración base del backend: Completada.
- Fase 3 — Modelado del dominio: Completada.

## Fase actual

La fase actual corresponde al cierre del modelado inicial del dominio.

Se establecieron las entidades principales, sus relaciones, choices, validaciones iniciales y migraciones.

## Próximos pasos

La siguiente etapa corresponde a la Fase 4 — Administración del sistema y datos semilla.

Se deberán registrar los modelos en Django Admin y preparar comandos idempotentes para datos base y datos demo.
