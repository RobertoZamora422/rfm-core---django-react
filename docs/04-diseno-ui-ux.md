# Diseno UI/UX - RFM Core

## Principios

- Claridad antes que decoracion.
- Separacion visual entre experiencia publica y panel administrativo.
- Backend-first en valores, estados y calculos.
- Estados de carga, error y vacio visibles.
- Responsive real para formularios, tablas y cards.
- Sin datos quemados permanentes en frontend.

## PublicLayout

El flujo publico usa `PublicLayout`.

Caracteristicas:

- No muestra Sidebar ni Topbar administrativo.
- Presenta marca, acceso administrativo y contenido centrado.
- Esta orientado a cliente/interesado.
- No solicita correo ni registro de usuario.
- Prioriza completar datos minimos y continuar por WhatsApp.

Pantallas publicas:

- `/pre-cotizacion`: formulario inicial.
- `/pre-cotizacion/alquiler`: resumen del evento, calculo de alquiler, advertencia y WhatsApp.
- `/pre-cotizacion/servicio-completo`: resumen del evento, paquetes activos, totales por paquete y WhatsApp.
- `/pre-cotizacion/comparacion`: resumen, comparacion de modalidades, advertencia y WhatsApp.

Opciones del formulario publico:

- Alquiler del local.
- Servicio completo.
- Aun no estoy seguro.

## AdminLayout

El panel administrativo usa `AdminLayout`.

Caracteristicas:

- Protegido por `ProtectedRoute`.
- Incluye Sidebar, Topbar y contenido administrativo.
- Gestiona clientes, tipos de evento, paquetes, configuracion, cotizaciones, contratos, costos, gastos, dashboard y reportes.
- No contiene la pre-cotizacion publica como modulo protegido.

## Navegacion

Publica:

```text
/
/pre-cotizacion
/pre-cotizacion/alquiler
/pre-cotizacion/servicio-completo
/pre-cotizacion/comparacion
/login
```

Administrativa:

```text
/inicio
/clientes
/tipos-evento
/paquetes
/configuracion
/cotizaciones
/cotizaciones/:id
/contratos
/contratos/:id
/costos-directos
/gastos-fijos
/dashboard-financiero
/reportes
```

## Reglas UX

- El resultado publico debe indicar que el valor es referencial.
- WhatsApp debe llevar un mensaje prellenado con datos del evento y usar el numero normalizado recibido desde backend.
- El servicio completo muestra solo paquetes activos.
- La comparacion ayuda a entender diferencias, no reemplaza asesoria humana.
- Las rutas administrativas redirigen a `/login` sin token.
- La UI administrativa conserva tablas con fallback movil, filtros y acciones existentes.
- Los calculos visibles deben venir del backend.
- La pantalla administrativa de Configuracion permite editar el WhatsApp del negocio en formato `09XXXXXXXX`; el frontend valida el formato y el backend conserva la validacion final.
