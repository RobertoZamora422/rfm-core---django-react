import { useState } from 'react'
import { ResourcePage } from '../../components/admin/ResourcePage'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Textarea } from '../../components/ui/Textarea'
import { tiposEventoService } from '../../services/resourceService'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'

const columns = [
  {
    key: 'nombre',
    header: 'Tipo de evento',
    render: (item) => (
      <div className="stacked-cell">
        <strong>{item.nombre}</strong>
        <span className="line-clamp">{item.descripcion || 'Sin descripción'}</span>
      </div>
    ),
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

function TipoEventoForm({ errors, initialValues, isSubmitting, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    nombre: initialValues?.nombre ?? '',
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
        id="tipo-evento-nombre"
        label="Nombre"
        name="nombre"
        onChange={handleChange}
        required
        autoFocus
        value={form.nombre}
      />
      <Textarea
        error={errors.descripcion}
        id="tipo-evento-descripcion"
        label="Descripción"
        name="descripcion"
        onChange={handleChange}
        value={form.descripcion}
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

export function TiposEventoPage() {
  return (
    <ResourcePage
      columns={columns}
      createLabel="Crear tipo de evento"
      description="Mantén una lista clara de los eventos que el negocio ofrece actualmente."
      emptyMessage="Crea el primer tipo de evento para usarlo en cotizaciones y contratos."
      filterDefinitions={[
        {
          key: 'buscar',
          label: 'Buscar',
          placeholder: 'Nombre o descripción',
          type: 'search',
        },
        {
          key: 'activo',
          label: 'Estado',
          type: 'select',
          options: [
            { value: '', label: 'Todos' },
            { value: 'true', label: 'Activos' },
            { value: 'false', label: 'Inactivos' },
          ],
        },
      ]}
      FormComponent={TipoEventoForm}
      itemLabel="Tipo de evento"
      mobileTitle={(item) => item.nombre}
      service={tiposEventoService}
      title="Tipos de evento"
      statusConfig={{
        field: 'activo',
        activateLabel: 'Activar',
        deactivateLabel: 'Desactivar',
        activateTitle: 'Activar tipo de evento',
        deactivateTitle: 'Desactivar tipo de evento',
        activateDescription: 'Este tipo de evento volverá a estar disponible en nuevos registros.',
        deactivateDescription: 'Dejará de ofrecerse en nuevas cotizaciones y contratos, pero permanecerá en el historial existente.',
        activatedText: 'activado para nuevos registros',
        deactivatedText: 'desactivado sin afectar el historial',
      }}
    />
  )
}
