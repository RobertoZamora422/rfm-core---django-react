# Documento Maestro - RFM Core

## Nombre del sistema

**RFM Core** - Sistema de pre-cotizacion, gestion comercial y analisis de rentabilidad para un salon de eventos.

Nombre contextual del negocio: **RFM Core - Sistema administrativo para Rancho Flor Maria**.

## Vision del producto

RFM Core es un sistema web con una entrada publica de pre-cotizacion y un panel administrativo protegido. Su objetivo es transformar solicitudes iniciales de clientes interesados en informacion trazable para seguimiento comercial, conversion a contratos y analisis de rentabilidad.

El sistema no reemplaza la atencion humana ni cierra ventas automaticamente. La pre-cotizacion entrega una referencia inicial y WhatsApp continua la conversacion con un asesor.

## Flujo principal

```text
Pre-cotizacion publica -> Gestion comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Separacion publico / administrativo

Parte publica:

- Accesible sin login.
- Orientada al cliente o interesado.
- Permite una pre-cotizacion rapida.
- Tiene tres opciones: alquiler del local, servicio completo y aun no estoy seguro.
- Tiene cuatro pantallas: formulario, resultado alquiler, resultado servicio completo y comparacion.
- No expone CRUD administrativo ni datos financieros internos.

Parte administrativa:

- Protegida por login.
- Orientada al administrador o asesor.
- Permite gestionar clientes, tipos de evento, paquetes, configuracion, cotizaciones, contratos, costos, gastos, dashboard y reportes.
- Usa `Authorization: Token <token>` para API administrativa.
- Mantiene el backend como fuente de verdad para calculos, validaciones y conversion de cotizaciones a contratos.

## Alcance incluido

- Autenticacion administrativa.
- Clientes.
- Tipos de evento.
- Paquetes activos/inactivos.
- Configuracion del negocio.
- Pre-cotizaciones publicas.
- Cotizaciones por estado.
- Conversion de cotizaciones confirmadas a contratos.
- Contratos reales.
- Estado de contrato.
- Estado de pago.
- Costos directos por contrato/evento.
- Gastos fijos mensuales.
- Inicio administrativo operativo.
- Dashboard financiero backend-first.
- Reportes basicos.
- API REST.
- Frontend React/Vite.
- Preparacion de deploy en Render.

## Fuera de alcance para esta version

No se implementan reservas online automaticas, bloqueo automatico de fechas, compra directa desde la web, pasarela de pagos, facturacion electronica, firma electronica, contabilidad completa, nomina, inventario avanzado, aplicacion movil nativa, chatbot completo ni automatizacion completa con WhatsApp Business API.

## Actores

- Administrador: gestiona datos base, contratos, costos, gastos, reportes y configuracion.
- Asesor comercial: gestiona cotizaciones, seguimiento comercial y conversion a contratos.
- Cliente o interesado: completa la pre-cotizacion publica y continua por WhatsApp.
- Docente o evaluador: revisa alcance, arquitectura, funcionamiento y documentacion.

## Requerimientos funcionales principales

- Permitir login administrativo.
- Gestionar clientes, tipos de evento, paquetes y configuracion del negocio.
- Registrar pre-cotizaciones publicas en estado `nueva`.
- Calcular referencias comerciales desde backend para alquiler, servicio completo y comparacion.
- Cambiar estados de cotizacion.
- Convertir cotizaciones confirmadas en contratos.
- Gestionar contratos y separar estado comercial de estado de pago.
- Registrar abonos y calcular saldo pendiente.
- Registrar costos directos y gastos fijos mensuales.
- Calcular utilidad bruta, margen bruto, utilidad neta y margen neto.
- Mostrar inicio administrativo con informacion operativa.
- Mostrar dashboard financiero con metricas calculadas en backend.
- Exponer reportes basicos.

## Inicio administrativo

Inicio administrativo es una pantalla operativa diaria del panel protegido. Su objetivo es ayudar al administrador o asesor a decidir que atender primero, no analizar historicos ni explicar rentabilidad.

Datos que muestra actualmente:

- Cotizaciones nuevas pendientes de primer contacto.
- Cotizaciones registradas en el mes actual.
- Contratos confirmados con evento en el mes actual.
- Eventos proximos basados solo en contratos confirmados y no cancelados.
- Pendientes importantes generados por reglas backend: cotizaciones nuevas, cotizaciones activas sin contrato, eventos proximos con saldo y eventos realizados sin costos directos activos.
- Accesos rapidos a pre-cotizacion publica, cotizaciones, contratos y costos directos.

Inicio se alimenta de `GET /api/inicio-resumen/`, implementado como agregado backend-first. React presenta el payload y no carga listas completas para recalcular KPIs operativos.

## Separacion entre Inicio, Dashboard financiero y Reportes

- Inicio administrativo: seguimiento operativo del dia y proximas acciones.
- Dashboard financiero: analisis mensual de ingresos, costos, utilidad, margen, estado de pagos y comparaciones.
- Reportes: consultas historicas o exportables por periodo y categoria.

## Reglas de negocio criticas

- Una pre-cotizacion publica no es reserva ni precio final.
- Una cotizacion representa una oportunidad comercial; no es ingreso real.
- Solo un contrato confirmado representa ingreso real.
- Un contrato cancelado se excluye de metricas financieras principales.
- `estado_contrato` y `estado_pago` son conceptos distintos.
- `saldo_pendiente = valor_final - monto_abonado`.
- `monto_abonado` no puede ser mayor que `valor_final`.
- La utilidad bruta por contrato es `valor_final - total_costos_directos`.
- La utilidad neta mensual es `ingresos_mes - costos_directos_mes - gastos_fijos_mes`.
- React no debe duplicar reglas financieras o comerciales criticas.
