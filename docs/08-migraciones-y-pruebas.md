# Estrategia de migraciones y pruebas

## Migraciones

Las migraciones aplicadas son historial inmutable. Un cambio estructural crea
una migración nueva y compatible.

Secuencia:

1. revisar `migrate --plan`;
2. migrar SQLite temporal desde cero;
3. crear un respaldo y una rama restaurable de Neon;
4. migrar esa rama con endpoint directo;
5. comparar conteos, claves y restricciones;
6. ejecutar `makemigrations --check --dry-run`;
7. programar la aplicación productiva como una única tarea administrativa.

El endpoint pooler es para runtime. Migraciones y `pg_dump` usan la conexión
directa. `migrate` no forma parte del comando de Gunicorn.

La base productiva no se usa para pruebas, no se resetea y no recibe fixtures.
Nunca se modifican migraciones ya aplicadas ni se usa `--fake` para sortear un
error real.

## Backend

La suite cubre modelos, constraints, serializers, services, selectors, API,
identidad, flujo integral, gastos, reportes, permisos y autenticación.

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test
```

## Frontend

Vitest y Testing Library cubren almacenamiento y restauración de sesión, timeout,
rutas protegidas y cierre local cuando la red falla.

```powershell
cd frontend
npm ci
npm test
npm run lint
npm run build
npm audit
npx wrangler deploy --dry-run
```

Las pruebas automatizadas no sustituyen el recorrido real en navegador ni la
validación final sobre PostgreSQL.
