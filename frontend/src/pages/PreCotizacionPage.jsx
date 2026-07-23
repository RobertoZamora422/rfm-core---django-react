import { useEffect, useRef, useState } from 'react'
import {
  Building2,
  Calculator,
  CalendarDays,
  ClipboardList,
  PartyPopper,
  Phone,
  Scale,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { PreCotizacionResult } from '../components/preCotizacion/PreCotizacionResult'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/LoadingState'
import { Select } from '../components/ui/Select'
import {
  crearPreCotizacion,
  guardarPreferenciaPreCotizacion,
  listarTiposEventoPublicos,
} from '../services/preCotizacionService'
import { getApiErrorMessage, getApiFieldErrors } from '../utils/apiErrors'

const initialForm = {
  nombre: '',
  telefono: '',
  tipo_evento: '',
  fecha_tentativa: '',
  numero_invitados: '',
  tipo_servicio: '',
  paquete: '',
}

const invalidatingFields = new Set([
  'nombre',
  'telefono',
  'tipo_evento',
  'fecha_tentativa',
  'numero_invitados',
  'tipo_servicio',
])

const serviceOptions = [
  {
    value: 'alquiler',
    label: 'Solo alquiler',
    detail: 'El espacio para organizar el evento con tus propios proveedores.',
    icon: Building2,
  },
  {
    value: 'servicio_completo',
    label: 'Servicio completo',
    detail: 'Opciones integrales de atención, menú y experiencia.',
    icon: Sparkles,
  },
  {
    value: 'no_estoy_seguro',
    label: 'No estoy seguro',
    detail: 'Compara ambas modalidades después de registrar tu solicitud.',
    icon: Scale,
  },
]

function buildPayload(form, solicitudToken) {
  return {
    nombre_persona: form.nombre.trim(),
    telefono_persona: form.telefono.trim(),
    tipo_evento: Number(form.tipo_evento),
    fecha_tentativa: form.fecha_tentativa,
    numero_invitados: Number(form.numero_invitados),
    tipo_servicio: form.tipo_servicio,
    paquete: form.paquete ? Number(form.paquete) : null,
    ...(solicitudToken ? { solicitud_token: solicitudToken } : {}),
  }
}

function validateForm(form) {
  const validationErrors = {}
  if (!form.nombre.trim()) validationErrors.nombre = 'Ingresa tu nombre completo.'
  if (!form.telefono.trim()) validationErrors.telefono = 'Ingresa un teléfono de contacto.'
  if (!form.tipo_evento) validationErrors.tipo_evento = 'Selecciona el tipo de evento.'
  if (!form.fecha_tentativa) validationErrors.fecha_tentativa = 'Selecciona una fecha tentativa.'
  if (!form.numero_invitados || Number(form.numero_invitados) < 1) {
    validationErrors.numero_invitados = 'Ingresa una cantidad de invitados mayor a cero.'
  }
  if (!form.tipo_servicio) validationErrors.tipo_servicio = 'Selecciona una modalidad.'
  return validationErrors
}

function getPublicErrorMessage(error, context = 'submit') {
  if (!error?.response) {
    return 'No pudimos conectar con el servicio. Verifica tu conexión e inténtalo nuevamente.'
  }
  const { data, status } = error.response
  if (context === 'catalog') {
    return 'No fue posible cargar los tipos de evento. Inténtalo nuevamente en unos minutos.'
  }
  if (data?.configuracion) {
    return 'La configuración del negocio no está disponible. Inténtalo nuevamente más tarde.'
  }
  if (status >= 500) {
    return 'El servicio no está disponible temporalmente. Inténtalo nuevamente en unos minutos.'
  }
  if (status === 400) {
    return 'Revisa los datos indicados en el formulario e inténtalo nuevamente.'
  }
  return 'No fue posible registrar la solicitud. Inténtalo nuevamente.'
}

function FormSectionHeading({ description, id, number, title }) {
  return (
    <div className="public-form-section__heading">
      <h3 id={id}><span>{number}.</span> {title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
  )
}

function OrnamentalDivider() {
  return (
    <span className="public-ornament" aria-hidden="true">
      <span /><i /><span />
    </span>
  )
}

export function PreCotizacionPage() {
  const [tiposEvento, setTiposEvento] = useState([])
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [preferenceError, setPreferenceError] = useState('')
  const [result, setResult] = useState(null)
  const [solicitudToken, setSolicitudToken] = useState('')
  const [isResultStale, setIsResultStale] = useState(false)
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const resultHeadingRef = useRef(null)
  const resultSectionRef = useRef(null)
  const { configuracion, configError, isConfigLoading } = useOutletContext()
  const hasBusinessConfig = Boolean(configuracion && Object.keys(configuracion).length)

  useEffect(() => {
    let isActive = true
    async function loadCatalogs() {
      setIsLoadingCatalogs(true)
      setPageError('')
      try {
        const data = await listarTiposEventoPublicos()
        if (!isActive) return
        const catalog = Array.isArray(data) ? data : data.results ?? []
        setTiposEvento(catalog)
        if (!catalog.length) {
          setPageError('No hay tipos de evento disponibles para registrar la solicitud.')
        }
      } catch (error) {
        if (isActive) setPageError(getPublicErrorMessage(error, 'catalog'))
      } finally {
        if (isActive) setIsLoadingCatalogs(false)
      }
    }
    const timeoutId = window.setTimeout(loadCatalogs, 0)
    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
    }
  }, [])

  const clearFieldError = (name) => {
    const related = {
      nombre: ['nombre', 'nombre_persona'],
      telefono: ['telefono', 'telefono_persona'],
    }
    const keys = related[name] ?? [name]
    setErrors((current) => {
      if (!keys.some((key) => current[key])) return current
      const next = { ...current }
      keys.forEach((key) => delete next[key])
      return next
    })
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'tipo_servicio' ? { paquete: '' } : {}),
    }))
    if (result && invalidatingFields.has(name)) setIsResultStale(true)
    clearFieldError(name)
  }

  const focusAndScrollResult = () => {
    window.requestAnimationFrame(() => {
      resultHeadingRef.current?.focus({ preventScroll: true })
      resultSectionRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmittingRef.current) return

    const clientErrors = validateForm(form)
    const firstInvalidField = Object.keys(clientErrors)[0]
    if (firstInvalidField) {
      const formElement = event.currentTarget
      setErrors(clientErrors)
      setPageError('Completa los campos obligatorios antes de ver tus opciones.')
      window.requestAnimationFrame(() => {
        formElement.elements.namedItem(firstInvalidField)?.focus()
      })
      return
    }

    isSubmittingRef.current = true
    setErrors({})
    setPageError('')
    setPreferenceError('')
    setIsSubmitting(true)
    try {
      const response = await crearPreCotizacion(buildPayload(form, solicitudToken))
      setResult(response)
      setSolicitudToken(response.solicitud_token)
      setForm((current) => ({
        ...current,
        paquete: response.cotizacion.paquete ? String(response.cotizacion.paquete) : '',
      }))
      setIsResultStale(false)
      focusAndScrollResult()
    } catch (error) {
      setErrors(getApiFieldErrors(error))
      setPageError(getPublicErrorMessage(error))
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const savePackagePreference = async (packageId) => {
    if (!solicitudToken) return
    const previousPackageId = form.paquete
    setForm((current) => ({ ...current, paquete: packageId ? String(packageId) : '' }))
    setPreferenceError('')
    try {
      const response = await guardarPreferenciaPreCotizacion({
        solicitud_token: solicitudToken,
        paquete: packageId ? Number(packageId) : null,
      })
      setResult((current) => ({
        ...current,
        cotizacion: response.cotizacion,
        calculo: response.calculo,
        whatsapp: response.whatsapp,
      }))
    } catch (error) {
      setForm((current) => ({ ...current, paquete: previousPackageId }))
      setPreferenceError(getApiErrorMessage(error))
    }
  }

  const isSubmitDisabled =
    isLoadingCatalogs ||
    isConfigLoading ||
    configError ||
    !hasBusinessConfig ||
    !tiposEvento.length

  return (
    <section className="public-precotizacion-page" aria-labelledby="public-prequote-title">
      <div className="public-intro">
        <span className="public-intro__eyebrow">Rancho Flor María</span>
        <h1 id="public-prequote-title">CUÉNTANOS SOBRE TU EVENTO</h1>
        <p>
          Registra tus datos para conocer las modalidades disponibles y continuar la
          conversación con nuestro equipo.
        </p>
        <OrnamentalDivider />
      </div>

      <Card className="public-form-card">
        <div className="public-card-heading">
          <span className="public-card-heading__icon" aria-hidden="true">
            <ClipboardList size={21} />
          </span>
          <div>
            <h2>Datos para tu pre-cotización</h2>
            <p>No estás reservando ni contratando. Esta solicitud inicia una conversación comercial.</p>
          </div>
        </div>

        {isLoadingCatalogs ? (
          <div className="public-loading-panel" aria-busy="true">
            <LoadingState label="Cargando formulario" />
            <span className="public-loading-panel__line" />
            <span className="public-loading-panel__line public-loading-panel__line--short" />
          </div>
        ) : (
          <form aria-busy={isSubmitting} className="public-form" noValidate onSubmit={handleSubmit}>
            <ErrorMessage>{pageError}</ErrorMessage>

            <section className="public-form-section" aria-labelledby="contact-section-title">
              <FormSectionHeading
                description="Usaremos estos datos para identificar la solicitud y poder atenderte."
                id="contact-section-title"
                number="1"
                title="Datos de contacto"
              />
              <div className="public-form-grid">
                <Input
                  autoComplete="name"
                  error={errors.nombre || errors.nombre_persona}
                  icon={UserRound}
                  id="public-nombre"
                  label="Nombre completo"
                  name="nombre"
                  onChange={handleChange}
                  placeholder="Ingresa tu nombre completo"
                  required
                  value={form.nombre}
                />
                <Input
                  autoComplete="tel"
                  error={errors.telefono || errors.telefono_persona}
                  helpText="Este número identifica tu solicitud."
                  icon={Phone}
                  id="public-telefono"
                  label="Teléfono / WhatsApp"
                  name="telefono"
                  onChange={handleChange}
                  placeholder="Ej. 0991234567"
                  required
                  type="tel"
                  value={form.telefono}
                />
              </div>
            </section>

            <section className="public-form-section" aria-labelledby="event-section-title">
              <FormSectionHeading id="event-section-title" number="2" title="Información del evento" />
              <div className="public-form-grid public-form-grid--event">
                <Select
                  disabled={!tiposEvento.length}
                  error={errors.tipo_evento}
                  icon={PartyPopper}
                  id="public-tipo-evento"
                  label="Tipo de evento"
                  name="tipo_evento"
                  onChange={handleChange}
                  required
                  value={form.tipo_evento}
                >
                  <option value="">Selecciona el tipo de evento</option>
                  {tiposEvento.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </Select>
                <Input
                  error={errors.fecha_tentativa}
                  icon={CalendarDays}
                  id="public-fecha"
                  label="Fecha tentativa"
                  name="fecha_tentativa"
                  onChange={handleChange}
                  required
                  type="date"
                  value={form.fecha_tentativa}
                />
                <Input
                  error={errors.numero_invitados}
                  icon={UsersRound}
                  id="public-invitados"
                  label="Número de invitados"
                  min="1"
                  name="numero_invitados"
                  onChange={handleChange}
                  placeholder="Ej. 100"
                  required
                  type="number"
                  value={form.numero_invitados}
                />
              </div>
            </section>

            <fieldset className="service-choice">
              <legend>
                <span>3.</span> Modalidad de interés{' '}
                <span className="field__required" aria-hidden="true">*</span>
              </legend>
              <p className="service-choice__help" id="service-choice-help">
                Seleccionar una modalidad todavía no muestra precios ni implica una contratación.
              </p>
              <div className="service-options" aria-describedby="service-choice-help">
                {serviceOptions.map((option) => (
                  <label
                    className={
                      option.value === form.tipo_servicio
                        ? 'service-option service-option--selected'
                        : 'service-option'
                    }
                    key={option.value}
                  >
                    <input
                      checked={form.tipo_servicio === option.value}
                      name="tipo_servicio"
                      onChange={handleChange}
                      type="radio"
                      value={option.value}
                    />
                    <span className="service-option__icon" aria-hidden="true">
                      <option.icon size={21} />
                    </span>
                    <span className="service-option__copy">
                      <strong>{option.label}</strong>
                      <small>{option.detail}</small>
                    </span>
                    <span className="service-option__check" aria-hidden="true">✓</span>
                  </label>
                ))}
              </div>
              {errors.tipo_servicio ? (
                <span className="field__error" role="alert">{errors.tipo_servicio}</span>
              ) : null}
            </fieldset>

            {!isConfigLoading && (!hasBusinessConfig || configError) ? (
              <ErrorMessage>
                La configuración del negocio no está disponible. Inténtalo nuevamente más tarde.
              </ErrorMessage>
            ) : null}

            <div className="public-actions">
              <Button
                className="public-calculate-button"
                disabled={isSubmitDisabled}
                icon={Calculator}
                isLoading={isSubmitting}
                loadingLabel="Preparando opciones…"
                type="submit"
              >
                {isResultStale ? 'Actualizar mis opciones' : 'Ver mis opciones y estimación'}
              </Button>
              <p className="public-form-privacy">
                <ShieldCheck aria-hidden="true" size={14} />
                <span>La fecha y disponibilidad se confirman posteriormente con el negocio.</span>
              </p>
            </div>
          </form>
        )}
      </Card>

      <div ref={resultSectionRef}>
        <PreCotizacionResult
          headingRef={resultHeadingRef}
          isStale={isResultStale}
          isSubmitting={isSubmitting}
          onClearPackage={() => savePackagePreference(null)}
          onPackageConsult={savePackagePreference}
          preferenceError={preferenceError}
          result={result}
          selectedPackageId={form.paquete}
        />
      </div>
    </section>
  )
}
