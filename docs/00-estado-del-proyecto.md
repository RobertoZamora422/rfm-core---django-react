# Estado del proyecto - RFM CORE

## Estado general

El proyecto se encuentra en etapa de consolidacion tecnica previa a deploy. La documentacion inicial, el backend core, los servicios de negocio, el layout administrativo, los modulos de administracion, la gestion comercial de cotizaciones, contratos, costos directos/gastos fijos, el inicio administrativo backend-first, el dashboard financiero backend-first, los reportes basicos, la revision responsive/UX y la validacion integral se encuentran completados.

La version actual corrige la separacion conceptual de la pre-cotizacion: el flujo de cliente/interesado es publico, no requiere login, no muestra chrome administrativo y registra una cotizacion inicial gestionable luego desde el panel protegido.

Tambien completa el uso administrativo previo a datos reales: cotizaciones administrativas manuales, contratos manuales, edicion de contratos, detalle de rentabilidad, costos directos desde contrato, conversion de cotizacion con invitados/paquete finales, sesion persistente entre pestanas y configuracion del negocio tratada como edicion de la configuracion vigente.

El sistema contempla como flujo principal:

```text
Pre-cotizacion publica -> Gestion comercial -> Contrato -> Costos/Gastos -> Rentabilidad
```

## Fases completadas

- Fase 0 - Documentacion base: Completada.
- Fase 1 - Inicializacion tecnica: Completada.
- Fase 2 - Configuracion base del backend: Completada.
- Fase 3 - Modelado del dominio: Completada.
- Fase 4 - Administracion del sistema y datos semilla: Completada.
- Fase 5 - API REST del core: Completada.
- Fase 6 - Servicios de negocio y endpoints de acciones: Completada.
- Fase 7 - Frontend base y layout administrativo: Completada.
- Fase 8 - Modulos base de administracion en frontend: Completada.
- Fase 9 - Pre-cotizacion: Completada.
- Fase 10 - Gestion comercial de cotizaciones: Completada.
- Fase 11 - Contratos y pagos: Completada.
- Fase 12 - Costos directos y gastos fijos: Completada.
- Fase 13 - Inicio administrativo backend-first: Completada.
- Fase 14 - Dashboard financiero backend-first: Completada.
- Fase 15 - Reportes: Completada.
- Fase 16 - Responsive, limpieza visual y experiencia de usuario: Completada.
- Fase 17 - Pruebas y validacion integral: Completada.

## Fase actual

La fase actual corresponde a consolidacion de pre-cotizacion publica, autenticacion por token, preparacion de variables reales para Render y documentacion final previa a deploy.

El flujo publico queda compuesto por cuatro pantallas:

- `/pre-cotizacion`
- `/pre-cotizacion/alquiler`
- `/pre-cotizacion/servicio-completo`
- `/pre-cotizacion/comparacion`

El panel administrativo permanece protegido desde `/login` y concentra clientes, cotizaciones, contratos, costos, gastos, dashboard y reportes. Cotizaciones incluye `/cotizaciones/nueva`, `/cotizaciones/:id` y `/cotizaciones/:id/editar`. Contratos incluye `/contratos/nuevo`, `/contratos/:id` y `/contratos/:id/editar`.

## Proximos pasos

La siguiente etapa corresponde a intentar el deploy manual en Render, aplicando migraciones, `collectstatic`, variables de entorno reales y configuracion de servicios en la plataforma.
