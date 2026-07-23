# Plan técnico y estado de implementación

## Completado

### Plataforma y dominio

- Django REST Framework y React/Vite.
- services, selectors, strategies y validators con responsabilidades separadas.
- Persona canónica y migraciones históricas reproducibles.
- pre-cotización, pipeline comercial, contratos, finanzas y reportes.
- gastos recurrentes versionados sin duplicación mensual.
- snapshots de oferta y eliminación lógica financiera.

### Seguridad

- API privada para personal autorizado;
- tokens con expiración y revocación;
- límites de abuso y tamaño de solicitudes públicas;
- borrado físico bloqueado para documentos históricos;
- configuración productiva HTTPS, HSTS, CORS/CSRF y PostgreSQL.

### Rendimiento

- consultas relacionadas y agregaciones en ORM;
- dashboard de seis periodos consolidado por rango;
- índices para filtros financieros y comerciales frecuentes;
- búsqueda remota, debounce y paginación.

### Frontend y UX

- composición visual Rancho Flor María;
- navegación protegida, ruta 404 y cierre local sin red;
- estados de carga, error, vacío, reintento y envío;
- tablas que cambian a cards/listas en móvil;
- labels, foco visible, modales con trampa/restauración de foco y reduced motion;
- Vitest y Testing Library para sesión y rutas.

### Despliegue

- Cloudflare Pages: `_redirects`, `_headers`, Node fijado y build `dist`;
- Koyeb: Python fijado, Procfile, Gunicorn, logging, staticfiles y readiness;
- Neon: SSL, conexión saludable y compatibilidad con pooler;
- ejemplos de entorno y documentación sin Render como opción vigente.

## Convenciones

Backend:

```text
models -> integridad estructural
serializers -> contrato HTTP
services -> negocio y transacciones
selectors -> consultas y agregaciones
views -> autorización, parámetros y respuesta
```

Frontend:

```text
services -> API
hooks/context -> sesión y estado reutilizable
components -> interacción compartida
pages -> tareas del usuario
```

## Control de cambios

1. auditar el flujo página -> service -> endpoint -> backend;
2. conservar contratos públicos y datos históricos;
3. crear migraciones nuevas, nunca reescribir aplicadas;
4. añadir prueba de regresión;
5. ejecutar tests, checks, lint, build y `git diff --check`;
6. validar navegador y configuración productiva.

## Futuro condicionado a producto

- auditoría inmutable de eventos, si se define el nivel de trazabilidad;
- segundo factor o identidad externa, si cambia el riesgo operativo;
- cache/throttling compartido, si Koyeb escala a varias instancias;
- importación masiva, cuando existan datos y reglas de conciliación reales.
