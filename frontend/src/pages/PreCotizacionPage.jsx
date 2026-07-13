import { useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Building2,
  Calculator,
  CalendarDays,
  HelpCircle,
  Info,
  Sparkles,
  UserRound,
} from 'lucide-react'
import isotipoRancho from '../assets/isotipo-rancho.svg'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/LoadingState'
import { Select } from '../components/ui/Select'
import {
  crearPreCotizacion,
  listarTiposEventoPublicos,
  savePreCotizacionResult,
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

const resultPaths = {
  alquiler: '/pre-cotizacion/alquiler',
  servicio_completo: '/pre-cotizacion/servicio-completo',
  no_seguro: '/pre-cotizacion/comparacion',
}

const serviceOptions = [
  {
    value: 'alquiler',
    label: 'Alquiler del local',
    detail: 'Referencia para usar el espacio y coordinar servicios por separado.',
    icon: Building2,
  },
  {
    value: 'servicio_completo',
    label: 'Servicio completo',
    detail: 'Referencia por paquetes activos con valor calculado por invitado.',
    icon: Sparkles,
  },
  {
    value: 'no_seguro',
    label: 'Aún no estoy seguro',
    detail: 'Compara ambas modalidades antes de continuar con un asesor.',
    icon: HelpCircle,
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

function FormSectionHeading({ description, icon: Icon, id, title }) {
  return (
    <div className="public-form-section__heading">
      <span className="public-form-section__icon" aria-hidden="true">
        <Icon size={19} />
      </span>
      <div>
        <h3 id={id}>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
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

function PreCotizacionSummary({ configError, isConfigLoading }) {
  return (
    <aside className="public-summary-column" aria-label="Resumen de pre-cotización">
      <Card className="public-summary-card">
        <div className="public-summary-card__heading">
          <span className="public-summary-card__eyebrow">Tu estimación</span>
          <h2>Resumen de pre-cotización</h2>
        </div>

        <div className="public-summary-empty" aria-live="polite">
          <span className="public-summary-empty__mark" aria-hidden="true">
            <img alt="" src={isotipoRancho} />
          </span>
          {isConfigLoading ? (
            <LoadingState label="Cargando configuración del negocio" />
          ) : configError ? (
            <p>No fue posible obtener la configuración del negocio en este momento.</p>
          ) : (
            <p>Completa los datos del evento para visualizar aquí el valor estimado.</p>
          )}
        </div>

        <div className="public-info-box">
          <Info aria-hidden="true" size={18} />
          <p>
            Este valor será una estimación inicial. La disponibilidad de la fecha debe ser
            confirmada por Rancho Flor María.
          </p>
        </div>
      </Card>
    </aside>
  )
}

export function PreCotizacionPage() {
  const [tiposEvento, setTiposEvento] = useState([])
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const navigate = useNavigate()
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
    setErrors((current) => {
      if (!current[name]) return current
      const nextErrors = { ...current }
      delete nextErrors[name]
      return nextErrors
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setErrors({})
    setPageError('')
    setIsSubmitting(true)

    try {
      const response = await crearPreCotizacion(buildPayload(form))
      savePreCotizacionResult(response)
      navigate(resultPaths[response.cotizacion.tipo_servicio] ?? '/pre-cotizacion', {
        state: { result: response },
      })
    } catch (error) {
      setErrors(getApiFieldErrors(error))
      setPageError(getPublicErrorMessage(error))
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
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
        <h1 id="public-prequote-title">PRE-COTIZA Y PLANIFICA TU EVENTO</h1>
        <p>Completa los datos de tu evento y obtén un valor estimado de forma rápida.</p>
        <OrnamentalDivider />
      </div>

      <div className="public-prequote-grid">
        <Card className="public-form-card">
          <div className="public-card-heading">
            <span className="public-card-heading__icon" aria-hidden="true">
              <CalendarDays size={22} />
            </span>
            <div>
              <h2>Datos de tu evento</h2>
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
            <form aria-busy={isSubmitting} className="public-form" onSubmit={handleSubmit}>
              <ErrorMessage>{pageError}</ErrorMessage>

              <section className="public-form-section" aria-labelledby="contact-section-title">
                <FormSectionHeading
                  description="Datos para identificar tu solicitud y poder orientarte."
                  icon={UserRound}
                  id="contact-section-title"
                  title="Datos de contacto"
                />
                <div className="public-form-grid">
                  <Input
                    autoComplete="name"
                    error={errors.nombre || errors.nombre_cliente}
                    id="public-nombre"
                    label="Nombre"
                    name="nombre"
                    onChange={handleChange}
                    placeholder="Ingresa tu nombre"
                    required
                    value={form.nombre}
                  />
                  <Input
                    autoComplete="tel"
                    error={errors.telefono || errors.telefono_cliente}
                    id="public-telefono"
                    label="Teléfono / WhatsApp"
                    name="telefono"
                    onChange={handleChange}
                    placeholder="Ingresa tu número de contacto"
                    required
                    type="tel"
                    value={form.telefono}
                  />
                </div>
              </section>

              <section className="public-form-section" aria-labelledby="event-section-title">
                <FormSectionHeading
                  description="Cuéntanos los datos principales del evento que estás planificando."
                  icon={CalendarDays}
                  id="event-section-title"
                  title="Información del evento"
                />
                <div className="public-form-grid">
                  <Select
                    disabled={!tiposEvento.length}
                    error={errors.tipo_evento}
                    id="public-tipo-evento"
                    label="Tipo de evento"
                    name="tipo_evento"
                    onChange={handleChange}
                    required
                    value={form.tipo_evento}
                  >
                    <option value="">Selecciona un tipo de evento</option>
                    {tiposEvento.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </Select>
                  <Input
                    error={errors.fecha_tentativa}
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
                    id="public-invitados"
                    label="Número aproximado de invitados"
                    min="1"
                    name="numero_invitados"
                    onChange={handleChange}
                    placeholder="Ej. 120"
                    required
                    type="number"
                    value={form.numero_invitados}
                  />
                </div>
              </section>

              <fieldset className="service-choice">
                <legend>Modalidad de interés</legend>
                <p className="service-choice__help" id="service-choice-help">
                  Selecciona una opción para calcularla o comparar las alternativas disponibles.
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
                        <option.icon size={20} />
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
              </div>
            </form>
          )}
        </Card>

        <PreCotizacionSummary configError={configError} isConfigLoading={isConfigLoading} />
      </div>
    </section>
  )
}
