import { useState } from 'react'
import { ResourcePage } from '../../components/admin/ResourcePage'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { clientesService } from '../../services/resourceService'

const columns = [
  { key: 'nombre', header: 'Nombre' },
  { key: 'telefono', header: 'Telefono' },
  { key: 'correo', header: 'Correo', render: (item) => item.correo || '-' },
  {
    key: 'es_demo',
    header: 'Origen',
    render: (item) => <span className="pill">{item.es_demo ? 'Demo' : 'Real'}</span>,
  },
]

function ClienteForm({ errors, initialValues, isSubmitting, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    nombre: initialValues?.nombre ?? '',
    telefono: initialValues?.telefono ?? '',
    correo: initialValues?.correo ?? '',
    observaciones: initialValues?.observaciones ?? '',
  })

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
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
        id="cliente-nombre"
        label="Nombre"
        name="nombre"
        onChange={handleChange}
        required
        value={form.nombre}
      />
      <Input
        error={errors.telefono}
        id="cliente-telefono"
        label="Telefono"
        name="telefono"
        onChange={handleChange}
        required
        value={form.telefono}
      />
      <Input
        error={errors.correo}
        id="cliente-correo"
        label="Correo"
        name="correo"
        onChange={handleChange}
        type="email"
        value={form.correo}
      />
      <Textarea
        error={errors.observaciones}
        id="cliente-observaciones"
        label="Observaciones"
        name="observaciones"
        onChange={handleChange}
        value={form.observaciones}
      />
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

export function ClientesPage() {
  return (
    <ResourcePage
      columns={columns}
      createLabel="Crear cliente"
      description="Administracion de clientes e interesados registrados en el sistema."
      emptyMessage="No existen clientes registrados."
      FormComponent={ClienteForm}
      mobileTitle={(item) => item.nombre}
      service={clientesService}
      title="Clientes"
    />
  )
}
