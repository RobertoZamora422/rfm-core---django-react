import { useState } from 'react'
import { ResourcePage } from '../../components/admin/ResourcePage'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Textarea } from '../../components/ui/Textarea'
import { tiposEventoService } from '../../services/resourceService'

const columns = [
  { key: 'nombre', header: 'Nombre' },
  { key: 'descripcion', header: 'Descripcion', render: (item) => item.descripcion || '-' },
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

function TipoEventoForm({ errors, initialValues, isSubmitting, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    nombre: initialValues?.nombre ?? '',
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
        id="tipo-evento-nombre"
        label="Nombre"
        name="nombre"
        onChange={handleChange}
        required
        value={form.nombre}
      />
      <Textarea
        error={errors.descripcion}
        id="tipo-evento-descripcion"
        label="Descripcion"
        name="descripcion"
        onChange={handleChange}
        value={form.descripcion}
      />
      <label className="checkbox-field" htmlFor="tipo-evento-activo">
        <input
          checked={form.activo}
          id="tipo-evento-activo"
          name="activo"
          onChange={handleChange}
          type="checkbox"
        />
        <span>Tipo de evento activo</span>
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

export function TiposEventoPage() {
  return (
    <ResourcePage
      columns={columns}
      createLabel="Crear tipo de evento"
      description="Catalogo de eventos disponibles para cotizaciones y contratos."
      emptyMessage="No existen tipos de evento registrados."
      FormComponent={TipoEventoForm}
      mobileTitle={(item) => item.nombre}
      service={tiposEventoService}
      title="Tipos de evento"
    />
  )
}
