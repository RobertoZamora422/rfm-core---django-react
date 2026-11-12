# E04 — Regresiones del backend

La evidencia del 11 de noviembre de 2026 se elaboró sobre el commit
`d9fe5ae`. El informe de auditoría original y los registros completos se
conservan en el paquete local `E04-evidencia-RFM-CORE.zip`.

## Cobertura incorporada

- **QA-06 (RN-03).** Una pre-cotización de servicio completo puede registrarse
  y confirmarse sin paquete. Al intentar formalizarla, la API devuelve HTTP 400
  en el campo `paquete`. La cotización sigue confirmada y no se crea un contrato.
- **QA-14 (RN-09).** Se ampliaron las dos pruebas existentes de conservación
  histórica. Al convertir con el mismo paquete o con parámetros de alquiler
  históricos disponibles, se preservan los precios y beneficios de la oferta.
  Al editar el número de invitados, la referencia se recalcula con esos
  parámetros y el importe acordado se registra por separado.
- **QA-14 (RN-09).** Se añadieron tres pruebas de reconstrucción. El contrato
  usa los parámetros vigentes cuando faltan datos históricos de alquiler,
  cuando se elige otro paquete o cuando se selecciona por primera vez un paquete
  de un catálogo ofrecido. En los tres casos, la cotización conserva su
  instantánea. La prueba ampliada de servicio completo también comprueba que
  el nombre visible del tipo de evento se lee del catálogo vigente.

Los seis casos están en
[`comercial.test_servicios_paquetes`](../../../backend/comercial/test_servicios_paquetes.py).
Las fechas de pre-cotizaciones válidas se calculan desde la fecha local de
Django. El [caso de fecha pasada](../../../backend/comercial/test_pre_cotizacion_publica.py)
comprueba el rechazo con HTTP 400. Las clases que envían pre-cotizaciones o
preferencias por la API registran `cache.clear` al finalizar cada caso. Los límites de solicitudes
siguen activos durante cada prueba.

## Resultados históricos de E04

| Ejecución | Ejecutadas | Aprobadas | Fallidas | Con error |
| --- | ---: | ---: | ---: | ---: |
| Módulos comercial, financiero y negocio en el commit base | 145 | 131 | 9 | 5 |
| Regresión comercial tras las correcciones | 19 | 19 | 0 | 0 |
| Módulos comercial, financiero y negocio tras las correcciones | 149 | 149 | 0 | 0 |
| Backend completo tras las correcciones | 171 | 171 | 0 | 0 |

En la línea base, fechas fijas vencidas hicieron que la API pública rechazara
solicitudes que debían ser válidas. Tras corregirlas, los contadores compartidos
del ámbito `public_precotizacion` provocaron respuestas HTTP 429 al ejecutar
varios casos juntos. El aislamiento de la caché resolvió esa interferencia.

La suite aplica las migraciones desde cero con datos sintéticos en SQLite en
memoria. PostgreSQL, la concurrencia y la entrega de mensajes por WhatsApp
quedan fuera del alcance de E04. Los comandos de reproducción y el flujo de CI
están en la [estrategia de migraciones y pruebas](../../08-migraciones-y-pruebas.md).
