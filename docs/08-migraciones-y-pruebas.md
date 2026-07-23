# Estrategia de migraciones y pruebas

## Migraciones

Las migraciones aplicadas son historial inmutable. Un cambio estructural crea
una migración nueva y compatible.

Secuencia:

1. revisar `migrate --plan`;
2. migrar SQLite temporal desde cero;
3. migrar una copia o rama de Neon con endpoint directo;
4. comparar conteos, claves y restricciones;
5. ejecutar `makemigrations --check --dry-run`;
6. respaldar o exportar antes de producción.

El endpoint pooler es para runtime. Migraciones y `pg_dump` usan la conexión
directa. `migrate` no forma parte del comando de Gunicorn.

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
npm test
npm run lint
npm run build
```

Las pruebas automatizadas no sustituyen el recorrido real en navegador ni la
validación final sobre PostgreSQL.
