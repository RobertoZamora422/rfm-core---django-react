# Frontend - RFM Core

Aplicacion React/Vite del panel administrativo y flujo publico de pre-cotizacion de RFM Core.

## Comandos

```powershell
npm install
npm run dev
npm run lint
npm run build
```

## Configuracion local

El archivo `.env.example` define la URL base de la API:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

En desarrollo existe fallback a `http://127.0.0.1:8000/api` si la variable no esta definida. En produccion `VITE_API_BASE_URL` es obligatoria.

## Render Static Site

```text
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
```

Variable requerida:

```text
VITE_API_BASE_URL=https://backend-url.onrender.com/api
```
