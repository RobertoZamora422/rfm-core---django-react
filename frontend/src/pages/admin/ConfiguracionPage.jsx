import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { configuracionNegocioService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'

function ConfiguracionForm({ errors, initialValues, isSubmitting, onSubmit }) {
  const [localErrors, setLocalErrors] = useState({})
  const [form, setForm] = useState({
    nombre_negocio: initialValues?.nombre_negocio ?? '',
    tarifa_base_alquiler: initialValues?.tarifa_base_alquiler ?? '0.00',
    invitados_incluidos_alquiler: initialValues?.invitados_incluidos_alquiler ?? 1,
    costo_invitado_adicional: initialValues?.costo_invitado_adicional ?? '0.00',
    whatsapp_negocio: initialValues?.whatsapp_negocio ?? '',
  })
  const fieldErrors = { ...errors, ...localErrors }

  const handleChange = (event) => {
    const { name, value } = event.target
    setLocalErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
    setForm((current) => ({
      ...current,
      [name]: value,
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
      <div className="form-grid">
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
      </div>
      <div className="notice-message">
        Estos valores se usan para calcular nuevas pre-cotizaciones. Revisalos antes de guardar
        cambios.
      </div>
      <div className="form-actions">
        <Button isLoading={isSubmitting} type="submit">
          Guardar configuracion
        </Button>
      </div>
    </form>
  )
}

function toArray(data) {
  return Array.isArray(data) ? data : data?.results ?? []
}

export function ConfiguracionPage() {
  const [configuraciones, setConfiguraciones] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const activeConfig = useMemo(
    () => configuraciones.find((configuracion) => configuracion.activo) ?? null,
    [configuraciones],
  )
  const editableConfig = activeConfig ?? configuraciones[0] ?? null
  const canCreate = configuraciones.length === 0

  const loadConfiguracion = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const data = await configuracionNegocioService.list()
      setConfiguraciones(toArray(data))
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadConfiguracion, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadConfiguracion])

  const handleSubmit = async (payload) => {
    setIsSaving(true)
    setFieldErrors({})
    setPageError('')
    setActionMessage('')

    try {
      if (canCreate) {
        const created = await configuracionNegocioService.create(payload)
        setConfiguraciones([created])
        setActionMessage('Configuracion creada.')
      } else {
        const updated = await configuracionNegocioService.update(editableConfig.id, payload)
        setConfiguraciones((current) =>
          current.map((configuracion) =>
            configuracion.id === updated.id ? updated : configuracion,
          ),
        )
        setActionMessage('Configuracion actualizada.')
      }
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error))
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Button icon={RefreshCw} onClick={loadConfiguracion} variant="secondary">
            Actualizar
          </Button>
        }
        description="Edita los parametros activos que usa el backend para los calculos comerciales."
        title="Configuracion"
      />

      <ErrorMessage>{pageError}</ErrorMessage>
      {actionMessage ? <div className="success-message">{actionMessage}</div> : null}
      {!canCreate && !activeConfig ? (
        <div className="warning-message">
          No existe una configuracion vigente. Guarda este formulario para restaurar los parametros
          usados por la pre-cotizacion publica.
        </div>
      ) : null}

      <Card>
        {isLoading ? (
          <LoadingState label="Cargando configuracion" />
        ) : (
          <ConfiguracionForm
            errors={fieldErrors}
            initialValues={editableConfig}
            isSubmitting={isSaving}
            key={editableConfig?.id ?? 'nueva'}
            onSubmit={handleSubmit}
          />
        )}
      </Card>
    </div>
  )
}
