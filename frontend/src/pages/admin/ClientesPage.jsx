import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ResourcePage } from '../../components/admin/ResourcePage'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { clientesService } from '../../services/resourceService'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'
import { formatPhone } from '../../utils/formatters'

const columns = [
  {
    key: 'cliente',
    header: 'Cliente',
    render: (item) => (
      <div className="stacked-cell">
        <strong>{item.nombre}</strong>
        <a className="inline-contact" href={`tel:${item.telefono}`}>{formatPhone(item.telefono)}</a>
      </div>
    ),
  },
  { key: 'correo', header: 'Correo', render: (item) => item.correo || 'Sin correo' },
  {
    key: 'cotizaciones_count',
    header: 'Cotizaciones',
    render: (item) => (
      <Link className="count-link" to={`/cotizaciones?buscar=${encodeURIComponent(item.telefono)}`}>
        {item.cotizaciones_count} {item.cotizaciones_count === 1 ? 'cotización' : 'cotizaciones'}
      </Link>
    ),
  },
  {
    key: 'contratos_count',
    header: 'Contratos',
    render: (item) => (
      <Link className="count-link" to={`/contratos?buscar=${encodeURIComponent(item.telefono)}`}>
        {item.contratos_count} {item.contratos_count === 1 ? 'contrato' : 'contratos'}
      </Link>
    ),
  },
]

function ClienteForm({ errors, initialValues, isSubmitting, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    nombre: initialValues?.nombre ?? '',
    telefono: initialValues?.telefono ?? '',
    correo: initialValues?.correo ?? '',
    observaciones: initialValues?.observaciones ?? '',
  })
  useFocusFirstError(errors)

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
        autoComplete="name"
        autoFocus
        value={form.nombre}
      />
      <Input
        error={errors.telefono}
        id="cliente-telefono"
        autoComplete="tel"
        helpText="Se usa para identificar al cliente y evitar registros duplicados."
        label="Teléfono"
        name="telefono"
        onChange={handleChange}
        required
        value={form.telefono}
      />
      <Input
        error={errors.correo}
        id="cliente-correo"
        autoComplete="email"
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
      description="Encuentra personas por nombre o teléfono y revisa rápidamente su relación con el negocio."
      emptyMessage="Crea el primer cliente para asociarlo a cotizaciones y contratos."
      filterDefinitions={[
        {
          key: 'buscar',
          label: 'Buscar cliente',
          placeholder: 'Nombre, teléfono o correo',
          type: 'search',
        },
      ]}
      FormComponent={ClienteForm}
      itemLabel="Cliente"
      mobileTitle={(item) => item.nombre}
      service={clientesService}
      title="Clientes"
    />
  )
}
