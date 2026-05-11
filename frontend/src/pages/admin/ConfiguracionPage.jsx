import { useState } from 'react'
import { ResourcePage } from '../../components/admin/ResourcePage'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { configuracionNegocioService } from '../../services/resourceService'
import { formatCurrency } from '../../utils/formatters'

const columns = [
  { key: 'nombre_negocio', header: 'Negocio' },
  {
    key: 'tarifa_base_alquiler',
    header: 'Tarifa base',
    render: (item) => formatCurrency(item.tarifa_base_alquiler),
  },
  { key: 'invitados_incluidos_alquiler', header: 'Invitados incluidos' },
  {
    key: 'costo_invitado_adicional',
    header: 'Invitado adicional',
    render: (item) => formatCurrency(item.costo_invitado_adicional),
  },
  { key: 'capacidad_maxima', header: 'Capacidad maxima' },
  {
    key: 'activo',
    header: 'Estado',
    render: (item) => (
      <StatusBadge status={item.activo ? 'confirmado' : 'descartada'}>
        {item.activo ? 'Activa' : 'Inactiva'}
      </StatusBadge>
    ),
  },
]

function ConfiguracionForm({ errors, initialValues, isSubmitting, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    nombre_negocio: initialValues?.nombre_negocio ?? '',
    tarifa_base_alquiler: initialValues?.tarifa_base_alquiler ?? '0.00',
    invitados_incluidos_alquiler: initialValues?.invitados_incluidos_alquiler ?? 1,
    costo_invitado_adicional: initialValues?.costo_invitado_adicional ?? '0.00',
    capacidad_maxima: initialValues?.capacidad_maxima ?? 1,
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
        error={errors.nombre_negocio}
        id="configuracion-nombre"
        label="Nombre del negocio"
        name="nombre_negocio"
        onChange={handleChange}
        required
        value={form.nombre_negocio}
      />
      <Input
        error={errors.tarifa_base_alquiler}
        id="configuracion-tarifa"
        label="Tarifa base alquiler"
        min="0"
        name="tarifa_base_alquiler"
        onChange={handleChange}
        required
        step="0.01"
        type="number"
        value={form.tarifa_base_alquiler}
      />
      <Input
        error={errors.invitados_incluidos_alquiler}
        id="configuracion-invitados-incluidos"
        label="Invitados incluidos alquiler"
        min="1"
        name="invitados_incluidos_alquiler"
        onChange={handleChange}
        required
        type="number"
        value={form.invitados_incluidos_alquiler}
      />
      <Input
        error={errors.costo_invitado_adicional}
        id="configuracion-costo-adicional"
        label="Costo invitado adicional"
        min="0"
        name="costo_invitado_adicional"
        onChange={handleChange}
        required
        step="0.01"
        type="number"
        value={form.costo_invitado_adicional}
      />
      <Input
        error={errors.capacidad_maxima}
        id="configuracion-capacidad"
        label="Capacidad maxima"
        min="1"
        name="capacidad_maxima"
        onChange={handleChange}
        required
        type="number"
        value={form.capacidad_maxima}
      />
      <label className="checkbox-field" htmlFor="configuracion-activa">
        <input
          checked={form.activo}
          id="configuracion-activa"
          name="activo"
          onChange={handleChange}
          type="checkbox"
        />
        <span>Configuracion activa</span>
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

export function ConfiguracionPage() {
  return (
    <ResourcePage
      allowDelete={false}
      columns={columns}
      createLabel="Crear configuracion"
      description="Parametros generales usados para calculos comerciales del negocio."
      emptyMessage="No existe configuracion registrada."
      FormComponent={ConfiguracionForm}
      mobileTitle={(item) => item.nombre_negocio}
      service={configuracionNegocioService}
      title="Configuracion"
    />
  )
}
