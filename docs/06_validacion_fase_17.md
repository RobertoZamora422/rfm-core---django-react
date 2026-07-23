# Validación integral vigente

## Backend

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe -m pip check
```

Con variables equivalentes a producción:

```powershell
.\.venv\Scripts\python.exe manage.py check --deploy
.\.venv\Scripts\python.exe manage.py collectstatic --noinput
```

La cobertura debe conservar identidad, transiciones, conversión única,
modalidades, pagos, cancelación, soft delete, recurrencias, periodos vacíos,
división por cero, exclusión financiera, permisos y endpoints públicos.

## Migraciones

Validar:

1. `migrate --plan`;
2. base SQLite temporal vacía desde cero;
3. copia o rama de Neon con URL directa;
4. conteos, IDs, FKs, constraints e índices;
5. `makemigrations --check --dry-run`.

No ejecutar migraciones dentro de Gunicorn ni con varios workers.

## Frontend

```powershell
cd frontend
npm test
npm run lint
npm run build
npm audit --omit=dev
```

## Navegador

En escritorio y móvil:

- pre-cotización y resultado referencial;
- login, sesión vencida y ruta protegida;
- Personas, Cotizaciones y conversión;
- Contratos, pago y costo directo;
- Gastos, Inicio, dashboard y reportes;
- configuración y catálogos;
- carga, error, vacío, foco, teclado, modales y menús;
- ausencia de scroll horizontal inesperado.

## Producción

- `/api/health/` devuelve 200;
- `/api/ready/` devuelve 200 con PostgreSQL accesible;
- una ruta React interna recarga mediante `_redirects`;
- CORS usa el origen exacto de Cloudflare;
- login rechaza usuarios sin `is_staff`;
- el bundle no contiene secretos;
- runtime usa pooler y migraciones la conexión directa de Neon.

## Higiene

```powershell
git diff --check
```

Buscar secretos, bases, dumps, builds, cachés y documentación contradictoria.
