# Arquitectura técnica

## Componentes

```text
Usuario
  -> Cloudflare DNS, HTTPS y redirecciones
  -> ranchoflormaria.com
  -> Cloudflare Workers Static Assets (React/Vite)
  -> HTTPS / Axios
  -> Render (Gunicorn -> Django REST Framework)
  -> Services y Selectors
  -> Django ORM
  -> Neon PostgreSQL
```

- React controla presentación, navegación y estado transitorio.
- Axios centraliza URL, token, timeout y expiración de sesión.
- DRF valida el contrato HTTP y los permisos.
- Services coordinan reglas y operaciones transaccionales.
- Selectors concentran consultas, agregaciones y precargas.
- Modelos, constraints e índices protegen la integridad final.

## Límites de confianza

La API privada exige `IsAdminUser`. Login, catálogos públicos, pre-cotización,
health y readiness declaran acceso anónimo de manera explícita. El token se
revoca al cerrar sesión y al vencer. Las escrituras públicas y el login tienen
throttling configurable.

CORS acepta únicamente orígenes exactos. En producción Django redirige a HTTPS,
confía en `X-Forwarded-Proto` del proxy, activa cookies seguras y HSTS y no
permite una base distinta de PostgreSQL.

El único origen CORS productivo es `https://ranchoflormaria.com`. HTTP se
resuelve antes en Cloudflare y `www` es una redirección, no una segunda
aplicación. El host técnico del backend permanece en `DJANGO_ALLOWED_HOSTS`.

## Dominio

```text
Persona 1 --- N NombrePersona
Persona 1 --- N Cotizacion 0..1 --- Contrato
Persona 1 --- N Contrato 1 --- N CostoDirecto

GastoRecurrente 1 --- N GastoRecurrenteVersion
GastoRecurrente 1 --- N GastoRecurrenteAjuste
GastoAdicional
ConfiguracionNegocio
```

La identidad se deduplica por teléfono normalizado dentro de transacciones. La
clasificación Cliente/Interesado se deriva. Cotización y contrato guardan una
fotografía de la oferta para que cambios futuros de catálogo no alteren el
historial.

## Flujos compuestos

### Pre-cotización

El serializer limita y valida entrada. El service crea o reutiliza Persona,
elige la estrategia de cálculo, crea la cotización y devuelve un token firmado
para recalcular la misma solicitud sin exponer coincidencias internas.

### Conversión

La cotización se bloquea con `select_for_update`; se valida el estado, se crea un
solo contrato y se marca Convertida dentro de la misma transacción.

### Finanzas

Solo contratos confirmados alimentan ingresos y rentabilidad. Costos eliminados
y contratos cancelados se excluyen. La evolución mensual agrega valores por
rango y los gastos recurrentes se resuelven mediante versiones y ajustes.

## Frontend

- `apiClient`: base URL, token, timeout, 401, eventos de mutación.
- `resourceService`: endpoints administrativos centralizados.
- `AuthProvider` y `ProtectedRoute`: sesión y rutas privadas.
- `useAutoRefresh`: mutaciones, `BroadcastChannel`, foco y visibilidad.
- componentes UI: tablas/cards responsive, modales con foco, estados y errores.

## Producción

`frontend/wrangler.jsonc` es la fuente versionada del Worker
`ranchoflormaria`. El plugin oficial de Cloudflare genera el
`dist/wrangler.json` usado por Wrangler. El fallback SPA se define con
`assets.not_found_handling: single-page-application`; no existe `_redirects`.
`_headers` añade cabeceras defensivas y CSP.

`workers_dev: false` y `preview_urls: false` evitan URLs técnicas públicas.
El dominio personalizado, la redirección `www` y `Always Use HTTPS` viven en el
panel de Cloudflare. GitHub `main` ejecuta `npm ci`, `npm run build` y
`npx wrangler deploy`.

Render instala el backend, ejecuta `collectstatic` y arranca el `Procfile`.
Gunicorn no ejecuta migraciones. `/api/health/` no consulta PostgreSQL;
`/api/ready/` ejecuta `SELECT 1`. Cron-Job.org usa exclusivamente health cada
10 minutos.

Neon aporta una URL pooled para runtime y una directa para
migraciones/exportaciones. Los estáticos de Django se sirven mediante
WhiteNoise. Render y el Worker no guardan datos persistentes en sus sistemas de
archivos.
