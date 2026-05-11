# Estado del proyecto — RFM CORE

## Estado general

El proyecto se encuentra en etapa de configuración técnica inicial. La documentación base, la estructura backend/frontend y la configuración base del backend ya fueron completadas.

El sistema contempla como flujo principal:

```text
Pre-cotización -> Gestión comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Fases completadas

- Fase 0 — Documentación base: Completada.
- Fase 1 — Inicialización técnica: Completada.
- Fase 2 — Configuración base del backend: Completada.

## Fase actual

La fase actual corresponde al cierre de la configuración base del backend.

Se estableció la base para API REST con Django REST Framework, configuración CORS, apps iniciales del backend y endpoint de salud en `/api/health/`.

## Próximos pasos

La siguiente etapa corresponde a la Fase 3 — Modelado del dominio.

Se deberán implementar los modelos principales del sistema, sus relaciones, validaciones iniciales y migraciones, manteniendo las reglas de negocio definidas en la documentación.
