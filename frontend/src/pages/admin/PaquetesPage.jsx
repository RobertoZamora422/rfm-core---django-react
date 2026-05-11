import { useState } from 'react'
import { ResourcePage } from '../../components/admin/ResourcePage'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Textarea } from '../../components/ui/Textarea'
import { paquetesService } from '../../services/resourceService'
import { formatCurrency } from '../../utils/formatters'

const TIPO_SERVICIO_LABELS = {
  alquiler: 'Alquiler',
  servicio_completo: 'Servicio completo',
}

const columns = [
  { key: 'nombre', header: 'Nombre' },
  {
    key: 'tipo_servicio',
    header: 'Tipo de servicio',
    render: (item) => TIPO_SERVICIO_LABELS[item.tipo_servicio] ?? item.tipo_servicio,
  },
  {
    key: 'precio_por_persona',
    header: 'Precio por persona',
    render: (item) => formatCurrency(item.precio_por_persona),
  },
  {
    key: 'activo',
    header: 'Estado',
    render: (item) => (
      <StatusBadge status={item.activo ? 'confirmado' : 'descartada'}>
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
    activo: initialValues?.activo ?? true,
  })

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
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
        label="Precio por persona"
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
        label="Descripcion"
        name="descripcion"
        onChange={handleChange}
        value={form.descripcion}
      />
      <label className="checkbox-field" htmlFor="paquete-activo">
        <input
          checked={form.activo}
          id="paquete-activo"
          name="activo"
          onChange={handleChange}
          type="checkbox"
        />
        <span>Paquete activo</span>
      </label>
      {errors.activo ? <span className="field__error">{errors.activo}</span> : null}
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
      description="Catalogo de paquetes disponibles para cotizaciones y contratos."
      emptyMessage="No existen paquetes registrados."
      FormComponent={PaqueteForm}
      mobileTitle={(item) => item.nombre}
      service={paquetesService}
      title="Paquetes"
    />
  )
}
