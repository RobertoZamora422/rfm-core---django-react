# Estado actual de RFM Core

Fecha de referencia: 30 de julio de 2026.

## Implementado

- pre-cotización pública sin autenticación;
- panel administrativo restringido a usuarios activos con `is_staff=True`;
- Persona canónica, teléfono normalizado, alias y clasificación derivada;
- cotizaciones, conversión única, contratos, pagos y cancelación histórica;
- alquiler separado de paquetes de servicio completo;
- snapshots históricos de ofertas;
- costos directos con eliminación lógica;
- gastos recurrentes versionados, ajustes de periodo y gastos adicionales;
- Inicio, dashboard financiero, reportes y configuración del negocio;
- diseño responsive y actualización automática entre vistas y pestañas;
- pruebas automatizadas de backend y frontend.

## Integridad y seguridad

- el backend concentra reglas comerciales, financieras y autorizaciones;
- cotizaciones y contratos no admiten borrado físico;
- tokens administrativos revocables con vencimiento de 24 horas por defecto;
- límites configurables sobre login y escrituras públicas;
- límites de tamaño y longitud en la pre-cotización;
- producción exige secreto, hosts, CORS, CSRF y PostgreSQL;
- HTTPS, cookies seguras, HSTS y cabeceras defensivas se activan sin `DEBUG`;
- `/api/health/` comprueba el proceso y `/api/ready/` la base de datos.

## Datos e historial

`Persona` es la identidad única. Interesado significa cero contratos históricos;
Cliente significa uno o más, aunque se hayan cancelado. Cancelar conserva la
clasificación pero excluye el contrato de ingresos y rankings financieros.

Las cotizaciones no son ingresos. Los costos y gastos eliminados lógicamente no
afectan cálculos activos. Los gastos recurrentes se resuelven por intervalos de
vigencia sin crear filas futuras por cada mes.

No existen semillas demo automáticas. Usuarios, configuración y catálogos reales
se crean explícitamente.

## Rendimiento

- relaciones precargadas y agregaciones en base de datos;
- clasificación y conteos anotados;
- evolución del dashboard consultada por rango en vez de repetir todo por mes;
- índices compuestos sobre estados, fechas, pagos, soft delete y vigencias;
- búsqueda remota con debounce y paginación administrativa opcional;
- páginas administrativas cargadas por ruta con `React.lazy`: el build auditado
  redujo el chunk inicial de 902,03 kB a 335,31 kB y aisló el dashboard con
  Recharts en un chunk de 397,66 kB.

## Despliegue oficial

- Cloudflare Registrar administra `ranchoflormaria.com`.
- Cloudflare DNS, `Always Use HTTPS` y una regla 301 llevan HTTP y `www` al
  dominio raíz, conservando ruta y query string.
- Cloudflare Worker `ranchoflormaria` sirve React/Vite mediante Static Assets.
- Render Web Service publica Django/DRF y Gunicorn en
  `rfm-core-backend.onrender.com`.
- Neon `rfm-core-production` aporta PostgreSQL 17 mediante URL pooled.
- GitHub `main` activa CI, Cloudflare Workers Build y el despliegue de Render.
- Cron-Job.org consulta `/api/health/` cada 10 minutos; no usa `/api/ready/`.

La infraestructura está desplegada y las migraciones ya fueron aplicadas. El
objetivo sigue siendo USD 0 mensual fuera del dominio anual.

## Seguimiento operativo

1. Mantener sincronizadas las variables de Cloudflare y Render con los ejemplos
   versionados, sin copiar valores secretos.
2. Probar respaldos lógicos y recuperación en una base aislada.
3. Revisar CI y despliegues automáticos después de cada cambio en `main`.
4. Evaluar Recharts 3 en una tarea separada: la versión 2.15.4 está deprecada,
   pero una migración mayor requiere pruebas visuales y de gráficos.
5. Retirar servicios heredados solo después de confirmar que no reciben tráfico
   ni conservan automatizaciones necesarias.
