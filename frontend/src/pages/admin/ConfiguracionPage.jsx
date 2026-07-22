import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Calculator, MessageCircle, Save } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'
import { configuracionNegocioService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'

function buildInitialForm(initialValues) {
  return {
    nombre_negocio: initialValues?.nombre_negocio ?? '',
    tarifa_base_alquiler: initialValues?.tarifa_base_alquiler ?? '',
    invitados_incluidos_alquiler: initialValues?.invitados_incluidos_alquiler ?? '',
    costo_invitado_adicional: initialValues?.costo_invitado_adicional ?? '',
    whatsapp_negocio: initialValues?.whatsapp_negocio ?? '',
  }
}

function ConfiguracionForm({ errors, initialValues, isSubmitting, onSubmit }) {
  const [localErrors, setLocalErrors] = useState({})
  const [clearedServerErrors, setClearedServerErrors] = useState([])
  const [form, setForm] = useState(() => buildInitialForm(initialValues))
  const fieldErrors = useMemo(() => {
    const visibleErrors = Object.fromEntries(
      Object.entries(errors).filter(([name]) => !clearedServerErrors.includes(name)),
    )
    return { ...visibleErrors, ...localErrors }
  }, [clearedServerErrors, errors, localErrors])
  useFocusFirstError(fieldErrors)

  const handleChange = (event) => {
    const { name, value } = event.target
    setLocalErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
    setClearedServerErrors((current) => current.includes(name) ? current : [...current, name])
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (form.whatsapp_negocio && !/^09\d{8}$/.test(form.whatsapp_negocio)) {
      nextErrors.whatsapp_negocio = 'Ingresa 10 dígitos y empieza con 09, por ejemplo 0991234567.'
    }

    setLocalErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSubmit(form)
  }

  return (
    <form className="configuration-form" onSubmit={handleSubmit}>
      <fieldset className="configuration-section">
        <legend>
          <span className="configuration-section__icon" aria-hidden="true"><Building2 size={19} /></span>
          <span>
            <strong>Identidad del negocio</strong>
            <small>Nombre visible en la experiencia pública.</small>
          </span>
        </legend>
        <Input
          error={fieldErrors.nombre_negocio}
          id="configuracion-nombre"
          label="Nombre del negocio"
          maxLength={150}
          name="nombre_negocio"
          onChange={handleChange}
          required
          value={form.nombre_negocio}
        />
      </fieldset>

      <fieldset className="configuration-section">
        <legend>
          <span className="configuration-section__icon" aria-hidden="true"><Calculator size={19} /></span>
          <span>
            <strong>Precios y cálculo de alquiler</strong>
            <small>Parámetros usados por el backend en nuevas pre-cotizaciones.</small>
          </span>
        </legend>
        <div className="form-grid form-grid--three">
          <Input
            error={fieldErrors.tarifa_base_alquiler}
            helpText="Valor inicial del alquiler antes de invitados adicionales."
            id="configuracion-tarifa"
            inputMode="decimal"
            label="Tarifa base (USD)"
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
            helpText="Cantidad cubierta por la tarifa base."
            id="configuracion-invitados-incluidos"
            inputMode="numeric"
            label="Invitados incluidos"
            min="1"
            name="invitados_incluidos_alquiler"
            onChange={handleChange}
            required
            step="1"
            type="number"
            value={form.invitados_incluidos_alquiler}
          />
          <Input
            error={fieldErrors.costo_invitado_adicional}
            helpText="Se aplica por cada invitado que supere la cantidad incluida."
            id="configuracion-costo-adicional"
            inputMode="decimal"
            label="Invitado adicional (USD)"
            min="0"
            name="costo_invitado_adicional"
            onChange={handleChange}
            required
            step="0.01"
            type="number"
            value={form.costo_invitado_adicional}
          />
        </div>
      </fieldset>

      <fieldset className="configuration-section">
        <legend>
          <span className="configuration-section__icon" aria-hidden="true"><MessageCircle size={19} /></span>
          <span>
            <strong>Contacto comercial</strong>
            <small>Canal que se muestra al finalizar una pre-cotización.</small>
          </span>
        </legend>
        <Input
          autoComplete="tel"
          error={fieldErrors.whatsapp_negocio}
          helpText="Formato 09XXXXXXXX. Se usa para generar el enlace público de WhatsApp."
          id="configuracion-whatsapp"
          inputMode="tel"
          label="WhatsApp del negocio"
          maxLength={10}
          name="whatsapp_negocio"
          onChange={handleChange}
          placeholder="0991234567"
          type="tel"
          value={form.whatsapp_negocio}
        />
      </fieldset>

      <div className="configuration-form__footer">
        <p>
          Los cambios se aplican a nuevas pre-cotizaciones. El historial ya registrado se conserva.
        </p>
        <Button icon={Save} isLoading={isSubmitting} loadingLabel="Guardando configuración" type="submit">
          Guardar configuración
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
  const requestIdRef = useRef(0)

  const activeConfig = useMemo(
    () => configuraciones.find((configuracion) => configuracion.activo) ?? null,
    [configuraciones],
  )
  const editableConfig = activeConfig ?? configuraciones[0] ?? null
  const canCreate = configuraciones.length === 0

  const loadConfiguracion = useCallback(async ({ silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (!silent) setIsLoading(true)
    if (!silent) setPageError('')

    try {
      const data = await configuracionNegocioService.list()
      if (requestId === requestIdRef.current) {
        setConfiguraciones(toArray(data))
        setPageError('')
      }
    } catch (error) {
      if (requestId === requestIdRef.current) setPageError(getApiErrorMessage(error))
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadConfiguracion, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadConfiguracion])

  useAutoRefresh(loadConfiguracion, { refreshOnMutation: false })

  const handleSubmit = async (payload) => {
    if (isSaving) return
    setIsSaving(true)
    setFieldErrors({})
    setPageError('')
    setActionMessage('')

    try {
      if (canCreate) {
        await configuracionNegocioService.create(payload)
        setActionMessage('La configuración vigente se creó correctamente.')
      } else {
        await configuracionNegocioService.update(editableConfig.id, payload)
        setActionMessage('La configuración vigente se guardó correctamente.')
      }
      await loadConfiguracion({ silent: true })
    } catch (error) {
      const errors = getApiFieldErrors(error)
      setFieldErrors(errors)
      if (!Object.keys(errors).length) setPageError(getApiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page-stack page-stack--workspace">
      <PageHeader
        description="Administra los datos vigentes que utiliza el negocio y la pre-cotización pública."
        eyebrow="Sistema"
        title="Configuración"
      />

      <ErrorMessage
        action={pageError ? <Button onClick={() => loadConfiguracion()} variant="secondary">Reintentar</Button> : null}
      >
        {pageError}
      </ErrorMessage>
      {actionMessage ? <div className="success-message" role="status">{actionMessage}</div> : null}
      {!canCreate && !activeConfig ? (
        <div className="warning-message" role="status">
          No existe una configuración activa. Revisa los valores y guárdalos para restaurar la operación de nuevas pre-cotizaciones.
        </div>
      ) : null}

      <Card className="configuration-card">
        <div className="configuration-card__heading">
          <div>
            <span>Operación normal</span>
            <h2>{canCreate ? 'Crear configuración vigente' : 'Configuración vigente'}</h2>
          </div>
          {activeConfig ? <StatusBadge status="activo">Activa</StatusBadge> : null}
        </div>
        {isLoading ? (
          <LoadingState label="Cargando configuración" />
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
