# Frontend de RFM Core

Aplicación React/Vite para el panel administrativo y la pre-cotización pública
de Rancho Flor María. Los cálculos y las reglas críticas provienen de la API.

## Desarrollo

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Comandos de calidad:

```powershell
npm test
npm run lint
npm run build
npm audit --omit=dev
```

Variables:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_API_TIMEOUT_MS=15000
```

En producción `VITE_API_BASE_URL` es obligatoria. Las variables `VITE_*` quedan
expuestas en el bundle y no deben contener secretos.

## Cloudflare Workers Static Assets

Configuración oficial:

```text
Worker: ranchoflormaria
Dominio: https://ranchoflormaria.com
Rama: main
Root directory: frontend
Install command: npm ci
Build command: npm run build
Production deploy command: npx wrangler deploy
Non-production version command: npx wrangler versions upload
Node: 22.23.1 (.node-version)
```

Definir:

```text
VITE_API_BASE_URL=https://rfm-core-backend.onrender.com/api
VITE_API_TIMEOUT_MS=15000
```

`wrangler.jsonc` es la fuente versionada. `assets.not_found_handling` usa
`single-page-application`, por lo que las rutas React recargan con `index.html`
sin `public/_redirects`. Ese archivo no debe regenerarse: la antigua regla
`/* /index.html 200` generaba un bucle con Workers Static Assets.

`workers_dev: false` y `preview_urls: false` impiden exponer URLs públicas
`workers.dev`. El dominio personalizado se conserva en el panel de Cloudflare,
no en un `routes` versionado. `public/_headers` sí es compatible con Static
Assets y añade CSP y cabeceras defensivas al build.

El plugin oficial `@cloudflare/vite-plugin` genera `dist/wrangler.json`, que
Wrangler usa en preview y deploy. Se conserva porque integra el build Vite con
Workers y las pruebas Vitest actuales pasan con el plugin activo.

Validación sin publicar:

```powershell
npm ci
npm run test
npm run lint
npm run build
npm audit
npx wrangler deploy --dry-run
```

Las URL `www` y HTTP se redirigen mediante reglas administradas en Cloudflare;
no deben implementarse como una segunda aplicación ni mediante `_redirects`.
