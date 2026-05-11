# Estado del proyecto — RFM CORE

## Estado general

El proyecto RFM CORE se encuentra en etapa de inicialización técnica. La base documental fue definida y el repositorio cuenta con una estructura inicial separada para backend y frontend.

El desarrollo se organiza por fases cerradas, verificables y documentadas, con el objetivo de mantener trazabilidad técnica y coherencia entre la planificación, la implementación y la evolución del sistema.

El flujo principal definido para el sistema es:

```text
Pre-cotización -> Gestión comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Fase 0 — Documentación base

Estado: Completada

### Objetivo de la fase

La fase tuvo como objetivo definir la base conceptual, funcional, técnica y visual del sistema antes de iniciar la implementación de código ejecutable.

Se define en esta etapa el alcance general del sistema, las reglas de negocio críticas, la arquitectura prevista, el modelo de datos, los lineamientos UI/UX y el plan técnico de implementación por fases.

## Fase 1 — Inicialización técnica

Estado: Completada

### Objetivo de la fase

La fase tiene como objetivo inicializar la estructura técnica mínima del proyecto, creando la base del backend, la base del frontend y los archivos de configuración necesarios para ejecución local.

### Observaciones

La fase no incluye modelos del dominio, apps Django del negocio, Django REST Framework, CORS, autenticación API, rutas administrativas, servicios HTTP del frontend ni pantallas funcionales. Ese alcance corresponde a fases posteriores.

Durante la validación de servidores locales se realizó un primer intento de arranque con redirección de salida estándar y error al mismo archivo. PowerShell rechazó esa configuración. Se corrigió usando archivos de log separados y la validación HTTP posterior fue exitosa.

## Fase 2 — Configuración base del backend

Estado: Pendiente

### Objetivo de la fase

La siguiente etapa corresponde a configurar la base del backend para soportar API REST, CORS, estructura de apps y un endpoint de salud.

### Actividades previstas

- Configurar Django REST Framework.
- Configurar CORS para comunicación con el frontend local.
- Crear las apps base previstas: `accounts`, `negocio`, `comercial`, `financiero` y `reportes`.
- Definir una organización inicial por `services.py`, `selectors.py` y `validators.py` cuando aplique.
- Crear el endpoint `/api/health/`.
- Mantener variables de entorno documentadas.
- Ejecutar verificaciones de backend después de la configuración.

## Próximos pasos

La siguiente etapa corresponde a la configuración base del backend. Se deberá mantener el enfoque backend-first definido en la documentación y evitar la implementación de modelos o flujos comerciales antes de cerrar la configuración técnica inicial.
