# Arquitectura Técnica Detallada

## Componentes

```text
React/Vite -> Axios -> Django REST Framework -> Services/Selectors -> Django ORM -> SQLite/PostgreSQL
```

- React controla presentación, navegación y estado de formularios.
- DRF valida contratos HTTP y permisos.
- Services coordinan operaciones compuestas y transacciones.
- Selectors centralizan consultas anotadas y filtros reutilizables.
- Modelos y restricciones de base protegen la integridad final.

## Entidad Persona

`negocio.models.Persona` reemplaza al nombre de dominio genérico anterior. Las relaciones vigentes son:

```text
Persona 1 --- N NombrePersona
Persona 1 --- N Cotizacion
Persona 1 --- N Contrato
```

Los campos ORM y JSON son `persona` y `persona_id`. La tabla física vigente es `negocio_persona`; cotizaciones y contratos contienen `persona_id`.

La clasificación se obtiene mediante conteos de contratos anotados. Un contrato cancelado sigue siendo histórico y, por tanto, mantiene la clasificación Cliente.

## Identidad y concurrencia

La normalización telefónica está centralizada en `negocio.validators.normalizar_telefono`. `telefono_normalizado` tiene unicidad en base de datos. `persona_services.py` usa transacciones y captura conflictos de integridad para evitar duplicados incluso con solicitudes concurrentes.

`NombrePersona` conserva alias únicos por persona y nombre normalizado. La persona mantiene su origen inicial.

## API de personas

```text
GET|POST       /api/personas/
GET|PUT|PATCH  /api/personas/{id}/
GET            /api/personas/resumen/
GET            /api/personas/coincidencias/?buscar=...
GET            /api/personas/coincidencias/?telefono=...
```

La búsqueda devuelve sugerencias por nombre y una coincidencia exacta separada cuando el teléfono normalizado ya existe. Los listados incluyen conteos eficientes de cotizaciones y contratos.

No existe una ruta de compatibilidad heredada porque frontend y backend se actualizan en conjunto y no se identificó un consumidor externo.

## Flujos compuestos

### Pre-cotización pública

`POST /api/pre-cotizacion/` recibe `nombre_persona` y `telefono_persona`. El service reutiliza o crea Persona, registra alias y crea la cotización en una transacción. La respuesta pública no expone coincidencias administrativas.

### Cotización administrativa

`CotizacionSerializer` acepta una relación `persona` o `persona_nueva`, nunca ambas. Si se crea una persona, su origen es `cotizacion_manual` y ambos registros se confirman o revierten juntos.

### Contrato directo

`ContratoSerializer` aplica el mismo patrón. Una persona nueva nace con origen `contrato_directo`; una persona existente conserva su origen. Al guardar el contrato su clasificación derivada pasa a Cliente.

## Frontend

- `personasService` consume `/personas/`.
- `usePersonaMatches` deduplica solicitudes idénticas y aplica búsqueda remota.
- `PersonaSelector` se reutiliza en cotizaciones y contratos.
- `PersonasPage` usa `/personas` y `DetallePersonaPage` usa `/personas/:id`.
- Los parámetros de preselección usan `?persona={id}`.

## Rendimiento

- `select_related` para persona, tipo de evento y paquete.
- `prefetch_related` para detalle de persona.
- `Count(..., distinct=True)` para clasificación y conteos.
- paginación opcional en recursos administrativos.
- debounce en búsquedas de texto.
- no se cargan todas las personas en los formularios.

## Instalación y despliegue

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
```

La configuración y los catálogos reales se crean de forma explícita. No hay seeds automáticos. En producción se usa PostgreSQL mediante `DATABASE_URL`; el frontend recibe la URL del API en `VITE_API_BASE_URL`.

## Limpieza controlada

`limpiar_datos_operativos` audita por defecto y exige `--execute`. Conserva usuarios y Configuración del negocio. No debe formar parte de build, startup ni deploy.
