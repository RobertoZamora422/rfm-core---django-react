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
import { PreCotizacionSummary } from '../components/preCotizacion/PreCotizacionSummary'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/LoadingState'
import { Select } from '../components/ui/Select'
import {
  crearPreCotizacion,
  listarTiposEventoPublicos,
} from '../services/preCotizacionService'
import { getApiFieldErrors } from '../utils/apiErrors'

const initialForm = {
  nombre: '',
  telefono: '',
  tipo_evento: '',
  fecha_tentativa: '',
  numero_invitados: '',
  tipo_servicio: 'alquiler',
}

const serviceOptions = [
  {
    value: 'alquiler',
    label: 'Alquiler',
    detail: 'Estima el uso del espacio con la tarifa de alquiler configurada.',
    icon: Building2,
  },
  {
    value: 'servicio_completo',
    label: 'Servicio completo',
    detail: 'Calcula los paquetes activos según el número de invitados.',
    icon: Sparkles,
  },
  {
    value: 'no_seguro',
    label: 'Comparar opciones',
    detail: 'Muestra ambas modalidades y sus valores disponibles.',
    icon: Scale,
  },
]

function buildPayload(form) {
  return {
    nombre: form.nombre.trim(),
    telefono: form.telefono.trim(),
    tipo_evento: Number(form.tipo_evento),
    fecha_tentativa: form.fecha_tentativa,
    numero_invitados: Number(form.numero_invitados),
    tipo_servicio: form.tipo_servicio,
  }
}

function validateForm(form) {
  const validationErrors = {}

  if (!form.tipo_evento) {
    validationErrors.tipo_evento = 'Selecciona el tipo de evento.'
  }

  if (!form.fecha_tentativa) {
    validationErrors.fecha_tentativa = 'Selecciona una fecha tentativa.'
  }

  if (!form.numero_invitados || Number(form.numero_invitados) < 1) {
    validationErrors.numero_invitados = 'Ingresa una cantidad de invitados mayor a cero.'
  }

  if (!form.nombre.trim()) {
    validationErrors.nombre = 'Ingresa tu nombre completo.'
  }

  if (!form.telefono.trim()) {
    validationErrors.telefono = 'Ingresa un teléfono de contacto.'
  }

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

  if (data?.paquete) {
    return 'No hay opciones activas para esta modalidad en este momento.'
  }

  if (status >= 500) {
    return 'El servicio no está disponible temporalmente. Inténtalo nuevamente en unos minutos.'
  }

  if (status === 400) {
    return 'Revisa los datos indicados en el formulario e inténtalo nuevamente.'
  }

  return 'No fue posible calcular la pre-cotización. Inténtalo nuevamente.'
}

function RequiredLabel({ children }) {
  return (
    <>
      {children} <span className="field__required" aria-hidden="true">*</span>
    </>
  )
}

function FormSectionHeading({ description, id, number, title }) {
  return (
    <div className="public-form-section__heading">
      <h3 id={id}>
        <span>{number}.</span> {title}
      </h3>
      {description ? <p>{description}</p> : null}
    </div>
  )
}

function OrnamentalDivider() {
  return (
    <span className="public-ornament" aria-hidden="true">
      <span />
      <i />
      <span />
    </span>
  )
}

export function PreCotizacionPage() {
  const [tiposEvento, setTiposEvento] = useState([])
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [result, setResult] = useState(null)
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const formHeadingRef = useRef(null)
  const summaryHeadingRef = useRef(null)
  const { configuracion, configError, isConfigLoading } = useOutletContext()
  const hasBusinessConfig = Boolean(configuracion && Object.keys(configuracion).length)

  useEffect(() => {
    let isActive = true

    async function loadCatalogs() {
      setIsLoadingCatalogs(true)
      setPageError('')

      try {
        const tiposData = await listarTiposEventoPublicos()
        if (!isActive) return
        const catalog = Array.isArray(tiposData) ? tiposData : tiposData.results ?? []
        setTiposEvento(catalog)
        if (!catalog.length) {
          setPageError('No hay tipos de evento disponibles para realizar la pre-cotización.')
        }
      } catch (error) {
        if (!isActive) return
        setPageError(getPublicErrorMessage(error, 'catalog'))
      } finally {
        if (isActive) {
          setIsLoadingCatalogs(false)
        }
      }
    }

    const timeoutId = window.setTimeout(loadCatalogs, 0)

    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
    setResult(null)

    const relatedErrorKeys = {
      nombre: ['nombre', 'nombre_cliente'],
      telefono: ['telefono', 'telefono_cliente'],
    }
    const keysToClear = relatedErrorKeys[name] ?? [name]

    setErrors((current) => {
      if (!keysToClear.some((key) => current[key])) return current
      const nextErrors = { ...current }
      keysToClear.forEach((key) => delete nextErrors[key])
      return nextErrors
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
      setPageError('Revisa los campos indicados antes de calcular la pre-cotización.')
      window.requestAnimationFrame(() => {
        formElement.elements.namedItem(firstInvalidField)?.focus()
      })
      return
    }

    isSubmittingRef.current = true
    setErrors({})
    setPageError('')
    setResult(null)
    setIsSubmitting(true)

    try {
      const response = await crearPreCotizacion(buildPayload(form))
      setResult(response)
      window.requestAnimationFrame(() => {
        summaryHeadingRef.current?.focus()
      })
    } catch (error) {
      setErrors(getApiFieldErrors(error))
      setPageError(getPublicErrorMessage(error))
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm({ ...initialForm })
    setErrors({})
    setPageError('')
    setResult(null)
    window.requestAnimationFrame(() => {
      formHeadingRef.current?.focus()
    })
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
        <h1 id="public-prequote-title">PRE-COTIZA Y PLANIFICA TU EVENTO</h1>
        <p>Completa los datos de tu evento y obtén un valor estimado de forma rápida.</p>
        <OrnamentalDivider />
      </div>

      <div className="public-prequote-grid">
        <Card className="public-form-card">
          <div className="public-card-heading">
            <span className="public-card-heading__icon" aria-hidden="true">
              <ClipboardList size={21} />
            </span>
            <div>
              <h2 ref={formHeadingRef} tabIndex="-1">
                Datos de tu evento
              </h2>
              <p>Ingresa la información necesaria para calcular una estimación.</p>
            </div>
          </div>

          {isLoadingCatalogs ? (
            <div className="public-loading-panel" aria-busy="true">
              <LoadingState label="Cargando opciones disponibles" />
              <span className="public-loading-panel__line" />
              <span className="public-loading-panel__line public-loading-panel__line--short" />
            </div>
          ) : (
            <form
              aria-busy={isSubmitting}
              className="public-form"
              noValidate
              onSubmit={handleSubmit}
            >
              <ErrorMessage>{pageError}</ErrorMessage>

              <section className="public-form-section" aria-labelledby="event-section-title">
                <FormSectionHeading
                  id="event-section-title"
                  number="1"
                  title="Información del evento"
                />
                <div className="public-form-grid">
                  <Select
                    disabled={!tiposEvento.length}
                    error={errors.tipo_evento}
                    icon={PartyPopper}
                    id="public-tipo-evento"
                    label={<RequiredLabel>Tipo de evento</RequiredLabel>}
                    name="tipo_evento"
                    onChange={handleChange}
                    required
                    value={form.tipo_evento}
                  >
                    <option value="">Selecciona el tipo de evento</option>
                    {tiposEvento.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </Select>
                  <Input
                    error={errors.fecha_tentativa}
                    icon={CalendarDays}
                    id="public-fecha"
                    label={<RequiredLabel>Fecha tentativa</RequiredLabel>}
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
                    label={<RequiredLabel>Número de invitados</RequiredLabel>}
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
                  <span>2.</span> Modalidad o servicio{' '}
                  <span className="field__required" aria-hidden="true">*</span>
                </legend>
                <p className="service-choice__help" id="service-choice-help">
                  Selecciona la opción que mejor se adapte a tu evento.
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
                      <span className="service-option__check" aria-hidden="true">
                        ✓
                      </span>
                    </label>
                  ))}
                </div>
                {errors.tipo_servicio ? (
                  <span className="field__error" role="alert">
                    {errors.tipo_servicio}
                  </span>
                ) : null}
              </fieldset>

              <section className="public-form-section" aria-labelledby="contact-section-title">
                <FormSectionHeading id="contact-section-title" number="3" title="Datos de contacto" />
                <div className="public-form-grid">
                  <Input
                    autoComplete="name"
                    error={errors.nombre || errors.nombre_cliente}
                    icon={UserRound}
                    id="public-nombre"
                    label={<RequiredLabel>Nombre completo</RequiredLabel>}
                    name="nombre"
                    onChange={handleChange}
                    placeholder="Ingresa tu nombre completo"
                    required
                    value={form.nombre}
                  />
                  <Input
                    autoComplete="tel"
                    error={errors.telefono || errors.telefono_cliente}
                    helpText="Ingresa el número donde deseas recibir información."
                    icon={Phone}
                    id="public-telefono"
                    label={<RequiredLabel>Teléfono / WhatsApp</RequiredLabel>}
                    name="telefono"
                    onChange={handleChange}
                    placeholder="Ingresa tu número de contacto"
                    required
                    type="tel"
                    value={form.telefono}
                  />
                </div>
              </section>

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
                  loadingLabel="Calculando…"
                  type="submit"
                >
                  Calcular pre-cotización
                </Button>
                <p className="public-form-privacy">
                  <ShieldCheck aria-hidden="true" size={14} />
                  <span>Usaremos estos datos únicamente para identificar y atender esta solicitud.</span>
                </p>
              </div>
            </form>
          )}
        </Card>

        <PreCotizacionSummary
          configuracion={configuracion}
          configError={configError}
          headingRef={summaryHeadingRef}
          isConfigLoading={isConfigLoading}
          isSubmitting={isSubmitting}
          onReset={handleReset}
          result={result}
        />
      </div>
    </section>
  )
}
