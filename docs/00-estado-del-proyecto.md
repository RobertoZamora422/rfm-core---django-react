# Estado actual de RFM Core

Fecha de referencia: 23 de julio de 2026.

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
- búsqueda remota con debounce y paginación administrativa opcional.

## Despliegue oficial

- Cloudflare Pages: React/Vite.
- Koyeb: Django/DRF y Gunicorn.
- Neon: PostgreSQL con TLS.
- GitHub: código y activación de despliegues.
- GitHub Actions: validación de backend y frontend en push y pull request.

El objetivo es $0/mes dentro de las cuotas gratuitas. Render solo pertenece al
historial documental anterior.

## Pendiente operativo

1. Crear proyecto y credenciales reales en Neon, Koyeb y Cloudflare.
2. Aplicar migraciones con una conexión directa de Neon.
3. Crear el administrador inicial y retirar su contraseña del entorno.
4. Registrar configuración y catálogos reales.
5. Ejecutar el recorrido de aceptación sobre las URLs productivas.
6. Evaluar Recharts 3 en una tarea separada; la rama 2 está deprecada, aunque
   la auditoría npm actual no reporta vulnerabilidades.
