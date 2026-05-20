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
  { key: 'whatsapp_negocio', header: 'WhatsApp' },
  { key: 'whatsapp_numero_url', header: 'WhatsApp wa.me' },
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
  const [localErrors, setLocalErrors] = useState({})
  const [form, setForm] = useState({
    nombre_negocio: initialValues?.nombre_negocio ?? '',
    tarifa_base_alquiler: initialValues?.tarifa_base_alquiler ?? '0.00',
    invitados_incluidos_alquiler: initialValues?.invitados_incluidos_alquiler ?? 1,
    costo_invitado_adicional: initialValues?.costo_invitado_adicional ?? '0.00',
    whatsapp_negocio: initialValues?.whatsapp_negocio ?? '',
    activo: initialValues?.activo ?? true,
  })
  const fieldErrors = { ...errors, ...localErrors }

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target
    setLocalErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (form.whatsapp_negocio && !/^09\d{8}$/.test(form.whatsapp_negocio)) {
      setLocalErrors({
        whatsapp_negocio: 'Ingresa un numero ecuatoriano de 10 digitos que empiece con 09.',
      })
      return
    }

    onSubmit(form)
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit}>
      <Input
        error={fieldErrors.nombre_negocio}
        id="configuracion-nombre"
        label="Nombre del negocio"
        name="nombre_negocio"
        onChange={handleChange}
        required
        value={form.nombre_negocio}
      />
      <Input
        error={fieldErrors.tarifa_base_alquiler}
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
        error={fieldErrors.invitados_incluidos_alquiler}
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
        error={fieldErrors.costo_invitado_adicional}
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
        error={fieldErrors.whatsapp_negocio}
        helpText="Ingresa el numero en formato ecuatoriano, por ejemplo 0991234567. El sistema lo convertira automaticamente para generar el enlace de WhatsApp."
        id="configuracion-whatsapp"
        label="WhatsApp del negocio"
        maxLength={10}
        name="whatsapp_negocio"
        onChange={handleChange}
        placeholder="0991234567"
        type="tel"
        value={form.whatsapp_negocio}
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
      {fieldErrors.activo ? <span className="field__error">{fieldErrors.activo}</span> : null}
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
