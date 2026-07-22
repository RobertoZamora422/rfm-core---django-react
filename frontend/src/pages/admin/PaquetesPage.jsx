import { useState } from 'react'
import { ResourcePage } from '../../components/admin/ResourcePage'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Textarea } from '../../components/ui/Textarea'
import { paquetesService } from '../../services/resourceService'
import { formatCurrency } from '../../utils/formatters'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'

const TIPO_SERVICIO_LABELS = {
  alquiler: 'Alquiler',
  servicio_completo: 'Servicio completo',
}

const columns = [
  {
    key: 'nombre',
    header: 'Paquete',
    render: (item) => (
      <div className="stacked-cell">
        <strong>{item.nombre}</strong>
        <span className="line-clamp">{item.descripcion || 'Sin descripción'}</span>
      </div>
    ),
  },
  {
    key: 'tipo_servicio',
    header: 'Tipo de servicio',
    render: (item) => TIPO_SERVICIO_LABELS[item.tipo_servicio] ?? item.tipo_servicio,
  },
  {
    key: 'precio_por_persona',
    header: 'Precio por persona',
    render: (item) => formatCurrency(item.precio_por_persona),
    align: 'right',
  },
  {
    key: 'activo',
    header: 'Estado',
    render: (item) => (
      <StatusBadge status={item.activo ? 'activo' : 'inactivo'}>
        {item.activo ? 'Activo' : 'Inactivo'}
      </StatusBadge>
    ),
  },
]

function PaqueteForm({ errors, initialValues, isSubmitting, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    nombre: initialValues?.nombre ?? '',
    tipo_servicio: initialValues?.tipo_servicio ?? 'alquiler',
    precio_por_persona: initialValues?.precio_por_persona ?? '0.00',
    descripcion: initialValues?.descripcion ?? '',
  })
  useFocusFirstError(errors)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit}>
      <Input
        error={errors.nombre}
        id="paquete-nombre"
        label="Nombre"
        name="nombre"
        onChange={handleChange}
        required
        autoFocus
        value={form.nombre}
      />
      <Select
        error={errors.tipo_servicio}
        id="paquete-tipo-servicio"
        label="Tipo de servicio"
        name="tipo_servicio"
        onChange={handleChange}
        value={form.tipo_servicio}
      >
        <option value="alquiler">Alquiler</option>
        <option value="servicio_completo">Servicio completo</option>
      </Select>
      <Input
        error={errors.precio_por_persona}
        id="paquete-precio"
        helpText="Valor en dólares por cada invitado. En alquiler puede ser 0,00."
        inputMode="decimal"
        label="Precio por persona (USD)"
        min="0"
        name="precio_por_persona"
        onChange={handleChange}
        required
        step="0.01"
        type="number"
        value={form.precio_por_persona}
      />
      <Textarea
        error={errors.descripcion}
        id="paquete-descripcion"
        label="Descripción"
        name="descripcion"
        onChange={handleChange}
        value={form.descripcion}
      />
      <div className="notice-message">
        La disponibilidad para nuevas cotizaciones se cambia desde la acción Activar o Desactivar del listado.
      </div>
      <div className="form-actions">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button isLoading={isSubmitting} type="submit">
          Guardar
        </Button>
      </div>
    </form>
  )
}

export function PaquetesPage() {
  return (
    <ResourcePage
      columns={columns}
      createLabel="Crear paquete"
      description="Gestiona la oferta disponible para nuevas cotizaciones sin alterar el historial."
      emptyMessage="Crea el primer paquete para comenzar a organizar la oferta comercial."
      filterDefinitions={[
        {
          key: 'buscar',
          label: 'Buscar por nombre',
          placeholder: 'Ej. Paquete boda',
          type: 'search',
        },
        {
          key: 'activo',
          label: 'Disponibilidad',
          type: 'select',
          options: [
            { value: '', label: 'Todos' },
            { value: 'true', label: 'Activos' },
            { value: 'false', label: 'Inactivos' },
          ],
        },
        {
          key: 'tipo_servicio',
          label: 'Tipo de servicio',
          type: 'select',
          options: [
            { value: '', label: 'Todos los servicios' },
            { value: 'alquiler', label: 'Alquiler' },
            { value: 'servicio_completo', label: 'Servicio completo' },
          ],
        },
      ]}
      FormComponent={PaqueteForm}
      itemLabel="Paquete"
      mobileTitle={(item) => item.nombre}
      service={paquetesService}
      title="Paquetes"
      statusConfig={{
        field: 'activo',
        activateLabel: 'Activar',
        deactivateLabel: 'Desactivar',
        activateTitle: 'Activar paquete',
        deactivateTitle: 'Desactivar paquete',
        activateDescription: 'El paquete volverá a estar disponible para nuevas cotizaciones y contratos.',
        deactivateDescription: 'El paquete dejará de aparecer en nuevos registros. Las cotizaciones y contratos históricos conservarán su información.',
        activatedText: 'activado y disponible para nuevos registros',
        deactivatedText: 'desactivado sin afectar el historial',
      }}
    />
  )
}
