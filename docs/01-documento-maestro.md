# Documento Maestro - RFM Core

## Nombre del sistema

**RFM Core** - Sistema de pre-cotización, gestión comercial y análisis de rentabilidad para un salón de eventos.

Nombre contextual del negocio: **RFM Core - Sistema administrativo para Rancho Flor María**.

## Visión del producto

RFM Core es un sistema web administrativo orientado a ordenar el flujo comercial, operativo y financiero de un salón de eventos. Su objetivo es transformar solicitudes iniciales de clientes interesados en información trazable para seguimiento comercial, conversión a contratos y análisis de rentabilidad.

El sistema no reemplaza la atención humana ni cierra ventas automáticamente. Apoya al administrador o asesor comercial con información estructurada, validaciones backend y métricas confiables.

## Problema

Las solicitudes de información y cotización llegan por canales como redes sociales y WhatsApp, frecuentemente con datos incompletos o desordenados. Esto dificulta:

- Registrar clientes interesados.
- Dar seguimiento comercial.
- Saber qué cotizaciones se convierten en ventas.
- Separar oportunidades comerciales de ingresos reales.
- Controlar pagos, costos directos y gastos fijos.
- Calcular utilidad y márgenes con información confiable.

## Objetivo general

Diseñar e implementar un sistema web que gestione la pre-cotización, seguimiento comercial, conversión a contratos y análisis de rentabilidad de un salón de eventos.

## Flujo principal

```text
Pre-cotización -> Gestión comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Alcance incluido

- Autenticación administrativa.
- Clientes.
- Tipos de evento.
- Paquetes.
- Configuración del negocio.
- Pre-cotizaciones.
- Cotizaciones por estado.
- Conversión de cotizaciones confirmadas a contratos.
- Contratos reales.
- Estado de contrato.
- Estado de pago.
- Costos directos por contrato/evento.
- Gastos fijos mensuales.
- Inicio administrativo operativo.
- Dashboard financiero backend-first.
- Reportes básicos.
- Administración del sistema.
- API REST.
- Frontend React.
- README, documentación y despliegue en Render.

## Fuera de alcance para esta versión

No se implementan en esta versión:

- Reservas online automáticas.
- Bloqueo automático de fechas.
- Compra directa desde la web.
- Pasarela de pagos.
- Facturación electrónica.
- Firma electrónica de contratos.
- Gestión contable completa.
- Nómina.
- Inventario avanzado.
- Aplicación móvil nativa.
- Chatbot comercial completo.
- Automatización completa con WhatsApp Business API.
- Inteligencia artificial para recomendar paquetes.
- CRM empresarial avanzado.
- Calendario con disponibilidad automática en tiempo real.

Las funcionalidades útiles fuera de alcance pueden documentarse como mejoras futuras, pero no deben implementarse dentro del core actual.

## Actores

- Administrador: gestiona datos base, contratos, costos, gastos, reportes y configuración.
- Asesor comercial: registra clientes, pre-cotizaciones, cotizaciones y seguimiento comercial.
- Cliente o interesado: aporta información inicial para cotizar, sin acceso administrativo al sistema en esta versión.
- Docente o evaluador: revisa alcance, arquitectura, funcionamiento y documentación.

## Requerimientos funcionales principales

- Permitir login administrativo.
- Gestionar clientes, tipos de evento, paquetes y configuración del negocio.
- Registrar pre-cotizaciones y cotizaciones.
- Calcular referencias comerciales desde backend.
- Cambiar estados de cotización.
- Convertir cotizaciones confirmadas en contratos.
- Gestionar contratos y separar estado comercial de estado de pago.
- Registrar abonos y calcular saldo pendiente.
- Registrar costos directos y gastos fijos mensuales.
- Calcular utilidad bruta, margen bruto, utilidad neta y margen neto.
- Mostrar inicio administrativo con información operativa.
- Mostrar dashboard financiero con métricas calculadas en backend.
- Exponer reportes básicos.

## Reglas de negocio críticas

- Una cotización representa una oportunidad comercial; no es ingreso real.
- Solo un contrato confirmado representa ingreso real.
- Un contrato cancelado se excluye de ingresos, costos financieros principales, utilidad y rankings de rentabilidad.
- `estado_contrato` y `estado_pago` son conceptos distintos.
- `saldo_pendiente = valor_final - monto_abonado`.
- `monto_abonado` no puede ser mayor que `valor_final`.
- El estado de pago recomendado se deriva de `monto_abonado` y `valor_final`.
- La utilidad bruta por contrato es `valor_final - total_costos_directos`.
- El margen bruto evita división por cero.
- La utilidad neta mensual es `ingresos_mes - costos_directos_mes - gastos_fijos_mes`.
- El margen neto mensual evita división por cero.