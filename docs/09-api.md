# API de RFM Core

Base local: `http://127.0.0.1:8000/api`.

## Autenticación

```http
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/
```

El login recibe `username` y `password`. Solo usuarios activos con
`is_staff=True` reciben un token. Las rutas privadas usan:

```http
Authorization: Token <token>
```

El token vence según `AUTH_TOKEN_TTL_HOURS` y se revoca al salir.

## Rutas públicas

```http
GET  /api/health/
GET  /api/ready/
GET  /api/public/tipos-evento/
GET  /api/public/paquetes/
GET  /api/public/configuracion/
POST /api/pre-cotizacion/
POST /api/pre-cotizacion/preferencia/
```

Las escrituras públicas tienen throttling. La pre-cotización no acepta un ID de
Persona y no revela coincidencias administrativas.

## Recursos administrativos

Los recursos DRF aceptan `GET` de lista/detalle y, según corresponda, `POST`,
`PUT` o `PATCH`.

```http
/api/personas/
/api/tipos-evento/
/api/paquetes/
/api/beneficios-paquetes/
/api/configuracion-negocio/
/api/cotizaciones/
/api/contratos/
/api/costos-directos/
/api/gastos-recurrentes/
/api/gastos-adicionales/
```

Acciones:

```http
GET  /api/personas/resumen/
GET  /api/personas/coincidencias/?buscar=<texto>&exclude=<id>
GET  /api/cotizaciones/resumen/
POST /api/cotizaciones/{id}/cambiar-estado/
POST /api/cotizaciones/{id}/convertir-contrato/
GET  /api/contratos/resumen/
POST /api/contratos/{id}/cancelar/
GET  /api/costos-directos/resumen/
POST /api/gastos-recurrentes/{id}/ajustar-desde/
POST /api/gastos-recurrentes/{id}/ajustar-periodo/
POST /api/gastos-recurrentes/{id}/desactivar/
POST /api/gastos-recurrentes/{id}/reactivar/
GET  /api/gastos-recurrentes/{id}/historial/
```

`DELETE` de cotización y contrato devuelve 400 para conservar el historial.
Tipos de evento y paquetes se desactivan. Costos directos y gastos adicionales
interpretan `DELETE` como eliminación lógica.

## Resúmenes y reportes

```http
GET /api/inicio-resumen/
GET /api/gastos/resumen/?mes=7&anio=2026
GET /api/dashboard-financiero/?mes=7&anio=2026
GET /api/reportes/comercial/?mes=7&anio=2026
GET /api/reportes/financiero/?mes=7&anio=2026
GET /api/reportes/eventos/?desde=2026-07-01&hasta=2026-07-31
GET /api/reportes/paquetes/?desde=2026-01-01&hasta=2026-12-31
```

Los periodos usan año y mes; los rangos usan `YYYY-MM-DD`. Los contratos
cancelados y registros eliminados lógicamente no participan en las métricas
financieras principales.

## Listados

Los recursos con paginación opcional aceptan:

```text
?page=1&page_size=12
```

Filtros comunes:

```text
?buscar=<texto>
?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
?estado=<choice>
?persona=<id>
?tipo_evento=<id>
?tipo_servicio=<choice>
```

Sin `page`, los consumidores internos pueden obtener una lista simple cuando el
viewset lo permite.

## Errores

- `400`: validación de campo o transición de dominio inválida.
- `401`: token ausente, vencido o revocado.
- `403`: usuario autenticado sin permiso administrativo.
- `404`: recurso inexistente.
- `429`: límite de solicitudes excedido.
- `503`: readiness sin conexión de base de datos.

Los errores de validación se devuelven como objeto por campo. Producción no
expone trazas; los detalles operativos se escriben en stdout.
