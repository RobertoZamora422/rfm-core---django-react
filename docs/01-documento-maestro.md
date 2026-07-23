# Documento Maestro del Sistema

## Propósito

RFM Core acompaña el ciclo de Rancho Flor María desde una consulta inicial hasta el contrato y su análisis de rentabilidad. Separa oportunidades comerciales de ventas reales y ofrece información comprensible para la operación diaria.

## Actores

- Persona interesada: completa la pre-cotización pública y continúa la atención por WhatsApp.
- Operador administrativo: gestiona personas, cotizaciones, contratos y catálogos.
- Responsable financiero: registra costos y gastos, revisa cobranza, rentabilidad y reportes.

## Conceptos principales

### Persona

Registro canónico de identidad. Se detectan coincidencias por teléfono normalizado y se preservan origen y nombres alternativos.

### Interesado y Cliente

Son clasificaciones derivadas, no entidades:

- Interesado: persona sin contratos históricos.
- Cliente: persona que tuvo al menos un contrato, aun si luego fue cancelado.

### Cotización

Oportunidad comercial con estados Nueva, Contactada, Confirmada, Convertida o Descartada. No es ingreso. Su conversión válida crea un contrato una sola vez.

### Contrato

Venta real asociada a una persona. Distingue el estado del contrato del estado de pago y sostiene los cálculos de saldo, costos y rentabilidad.

## Flujo principal

1. La persona completa el formulario público o es registrada desde administración.
2. El backend normaliza el teléfono y reutiliza el registro canónico si existe.
3. Se crea una cotización o un contrato con la relación `persona`.
4. Al existir el primer contrato, la clasificación derivada pasa a Cliente.
5. Costos y gastos alimentan el dashboard y los reportes.

## Módulos

- Público: Pre-cotización.
- Comercial: Personas, Cotizaciones, Contratos, Tipos de evento y Paquetes.
- Administración: Configuración del negocio.
- Finanzas: Costos directos, Gastos, Dashboard financiero y Reportes.

## Reglas de identidad

- El teléfono normalizado es el criterio operativo actual de unicidad.
- Los nombres coincidentes solo generan sugerencias.
- Un teléfono exacto impide crear un duplicado.
- El origen representa la captación inicial y no se sobrescribe.
- Un nombre diferente recibido después se conserva como alias.
- La creación rápida y el documento se guardan dentro de una transacción.

## Experiencia administrativa

El sidebar muestra `Personas`. La pantalla se titula `Clientes & Interesados`, conserva la descripción operativa y separa Todos, Clientes e Interesados. Permite buscar, crear, editar, abrir el detalle y preseleccionar la persona en nuevos documentos.

## Datos iniciales

Una instalación limpia no inserta datos operativos. Los usuarios, la configuración y los catálogos reales se crean explícitamente. No se ejecutan fixtures ni semillas demo al migrar o desplegar.
