# Validación Integral Vigente

Este documento reemplaza resultados históricos como fuente de verdad. Los números exactos de cada ejecución deben reportarse en la entrega correspondiente.

## Backend obligatorio

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test
```

Cobertura mínima de identidad:

- formatos telefónicos equivalentes producen una sola Persona;
- teléfonos diferentes no se fusionan por nombre;
- un nombre diferente se conserva como alias;
- el origen inicial no cambia;
- sin contratos se clasifica Interesado;
- con cualquier contrato histórico se clasifica Cliente;
- un contrato cancelado mantiene la clasificación histórica;
- creación rápida desde cotización y contrato es transaccional;
- formulario público reutiliza Persona sin revelar coincidencias;
- conteos y detalle usan consultas backend eficientes.

Cobertura mínima comercial y financiera:

- transiciones válidas de cotización;
- conversión única a contrato;
- estados de contrato y pago separados;
- monto abonado no supera valor final;
- cancelados excluidos de métricas principales;
- eliminación lógica de costos y gastos;
- reportes y dashboard conservan sus reglas de periodo.

## Migraciones

Validar dos escenarios:

1. aplicar las migraciones nuevas sobre una copia de una base existente y comparar conteos, IDs y FKs;
2. aplicar todas las migraciones desde cero sobre una base SQLite temporal vacía.

Después:

```powershell
.\.venv\Scripts\python.exe manage.py showmigrations
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

## Frontend obligatorio

```powershell
cd frontend
npm run lint
npm run build
```

Verificar que no existan imports, servicios, rutas o payloads con nomenclatura técnica obsoleta.

## Navegador

En escritorio y móvil:

- login y navegación protegida;
- sidebar `Personas`;
- `/personas` con título `Clientes & Interesados`;
- segmentos Todos, Clientes e Interesados;
- búsqueda, creación, edición y detalle;
- preselección desde persona hacia nueva cotización y contrato;
- creación rápida sin perder el formulario;
- formulario público;
- estados vacíos, foco, Escape, menús y objetivos táctiles.

Los registros de validación temporales deben eliminarse al terminar.

## Higiene del repositorio

```powershell
git diff --check
```

Buscar globalmente referencias a rutas, clases, campos, semillas y copias obsoletas. Las apariciones históricas dentro de migraciones antiguas son válidas porque Django necesita reconstruir cada estado previo.

## Estado de datos

Antes de empezar con información real debe comprobarse:

- cero datos operativos demo;
- configuración activa presente;
- administrador presente;
- ausencia de copias `.bak` y bases temporales;
- ausencia de carga demo automática en inicio o despliegue.
