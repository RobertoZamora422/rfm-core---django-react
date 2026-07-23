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

## Cloudflare Pages

Configuración oficial:

```text
Root directory: frontend
Install command: npm ci
Build command: npm run build
Output directory: dist
Node: 22.20.0 (.node-version)
```

Definir:

```text
VITE_API_BASE_URL=https://<servicio-koyeb>.koyeb.app/api
VITE_API_TIMEOUT_MS=15000
```

`public/_redirects` resuelve rutas SPA hacia `index.html`. `public/_headers`
agrega cabeceras defensivas que Cloudflare copia al resultado de producción.

Después del despliegue, registrar el origen exacto de Pages o del dominio
personalizado en CORS/CSRF del backend.
