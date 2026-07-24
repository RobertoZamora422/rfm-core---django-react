import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Compass,
  PartyPopper,
  Phone,
  ShieldCheck,
  TreePine,
  UserRound,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { PreCotizacionResult } from '../components/preCotizacion/PreCotizacionResult'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/LoadingState'
import { Select } from '../components/ui/Select'
import { useFocusFirstError } from '../hooks/useFocusFirstError'
import {
  crearPreCotizacion,
  guardarPreferenciaPreCotizacion,
  listarTiposEventoPublicos,
} from '../services/preCotizacionService'
import { getApiErrorMessage, getApiFieldErrors } from '../utils/apiErrors'
import { toDateInputValue } from '../utils/formatters'
import {
  ECUADOR_MOBILE_ERROR,
  isValidPersonName,
  normalizeEcuadorMobile,
  normalizePersonName,
  PERSON_NAME_ERROR,
} from '../utils/personValidation'

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
    icon: TreePine,
  },
  {
    value: 'servicio_completo',
    label: 'Servicio completo',
    icon: UtensilsCrossed,
  },
  {
    value: 'no_estoy_seguro',
    label: 'No estoy seguro',
    icon: Compass,
  },
]

function buildPayload(form, solicitudToken) {
  return {
    nombre_persona: normalizePersonName(form.nombre),
    telefono_persona: normalizeEcuadorMobile(form.telefono) ?? form.telefono.trim(),
    tipo_evento: Number(form.tipo_evento),
    fecha_tentativa: form.fecha_tentativa,
    numero_invitados: Number(form.numero_invitados),
    tipo_servicio: form.tipo_servicio,
    paquete: form.paquete ? Number(form.paquete) : null,
    ...(solicitudToken ? { solicitud_token: solicitudToken } : {}),
  }
}

function validateForm(form, minEventDate) {
  const validationErrors = {}
  if (!isValidPersonName(form.nombre)) validationErrors.nombre = PERSON_NAME_ERROR
  if (!normalizeEcuadorMobile(form.telefono)) validationErrors.telefono = ECUADOR_MOBILE_ERROR
  if (!form.tipo_evento) validationErrors.tipo_evento = 'Selecciona el tipo de evento.'
  if (!form.fecha_tentativa || form.fecha_tentativa < minEventDate) {
    validationErrors.fecha_tentativa = 'Seleccione una fecha válida.'
  }
  if (!/^[1-9]\d*$/.test(form.numero_invitados)) {
    validationErrors.numero_invitados = 'Ingrese una cantidad válida de invitados.'
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
  const [catalogError, setCatalogError] = useState('')
  const [pageError, setPageError] = useState('')
  const [preferenceError, setPreferenceError] = useState('')
  const [result, setResult] = useState(null)
  const [solicitudToken, setSolicitudToken] = useState('')
  const [isResultStale, setIsResultStale] = useState(false)
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingPreference, setIsSavingPreference] = useState(false)
  const isSubmittingRef = useRef(false)
  const isSavingPreferenceRef = useRef(false)
  const catalogRequestIdRef = useRef(0)
  const resultHeadingRef = useRef(null)
  const resultSectionRef = useRef(null)
  const {
    configuracion,
    configError,
    isConfigLoading,
    reloadConfiguracion,
  } = useOutletContext()
  const hasBusinessConfig = Boolean(configuracion && Object.keys(configuracion).length)
  const minEventDate = configuracion?.fecha_minima_cotizacion ?? toDateInputValue()
  useFocusFirstError(errors)

  const loadCatalogs = useCallback(async () => {
    const requestId = catalogRequestIdRef.current + 1
    catalogRequestIdRef.current = requestId
    setIsLoadingCatalogs(true)
    setCatalogError('')
    try {
      const data = await listarTiposEventoPublicos()
      if (requestId !== catalogRequestIdRef.current) return
      const catalog = Array.isArray(data) ? data : data.results ?? []
      setTiposEvento(catalog)
      if (!catalog.length) {
        setCatalogError('No hay tipos de evento disponibles para planificar tu celebración.')
      }
    } catch (error) {
      if (requestId === catalogRequestIdRef.current) {
        setCatalogError(getPublicErrorMessage(error, 'catalog'))
      }
    } finally {
      if (requestId === catalogRequestIdRef.current) setIsLoadingCatalogs(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadCatalogs, 0)
    return () => {
      catalogRequestIdRef.current += 1
      window.clearTimeout(timeoutId)
    }
  }, [loadCatalogs])

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
    setPageError('')
    clearFieldError(name)
  }

  const handleNameBlur = () => {
    const normalized = normalizePersonName(form.nombre)
    if (normalized !== form.nombre) {
      setForm((current) => ({ ...current, nombre: normalized }))
    }
  }

  const handlePhoneBlur = () => {
    const normalized = normalizeEcuadorMobile(form.telefono)
    if (normalized && normalized !== form.telefono) {
      setForm((current) => ({ ...current, telefono: normalized }))
    }
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

    const clientErrors = validateForm(form, minEventDate)
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
        nombre: response.cotizacion.persona_nombre,
        telefono: response.cotizacion.persona_telefono,
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
    if (!solicitudToken || isSavingPreferenceRef.current) return
    isSavingPreferenceRef.current = true
    const previousPackageId = form.paquete
    setForm((current) => ({ ...current, paquete: packageId ? String(packageId) : '' }))
    setPreferenceError('')
    setIsSavingPreference(true)
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
    } finally {
      isSavingPreferenceRef.current = false
      setIsSavingPreference(false)
    }
  }

  const isSubmitDisabled =
    isLoadingCatalogs ||
    isConfigLoading ||
    configError ||
    !hasBusinessConfig ||
    !tiposEvento.length ||
    isSubmitting

  return (
    <section className="public-precotizacion-page" aria-labelledby="public-prequote-title">
      <div className="public-intro">
        <span className="public-intro__eyebrow">Rancho Flor María</span>
        <h1 id="public-prequote-title">PLANIFICA TU EVENTO</h1>
        <p>
          Conoce las modalidades disponibles, explora nuestros paquetes y recibe un valor
          estimado de referencia.
        </p>
        <OrnamentalDivider />
      </div>

      <Card className="public-form-card">
        <div className="public-card-heading">
          <span className="public-card-heading__icon" aria-hidden="true">
            <ClipboardList size={21} />
          </span>
          <div>
            <h2>Da forma a tu celebración</h2>
          </div>
        </div>

        {isLoadingCatalogs ? (
          <div className="public-loading-panel" aria-busy="true">
            <LoadingState label="Cargando formulario" />
            <span className="public-loading-panel__line" />
            <span className="public-loading-panel__line public-loading-panel__line--short" />
          </div>
        ) : catalogError ? (
          <ErrorMessage
            action={<Button onClick={loadCatalogs} variant="secondary">Reintentar</Button>}
          >
            {catalogError}
          </ErrorMessage>
        ) : (
          <form aria-busy={isSubmitting} className="public-form" noValidate onSubmit={handleSubmit}>
            <ErrorMessage>{pageError}</ErrorMessage>

            <section className="public-form-section" aria-labelledby="event-section-title">
              <FormSectionHeading id="event-section-title" number="1" title="Información del evento" />
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
                  min={minEventDate}
                  name="fecha_tentativa"
                  onInput={handleChange}
                  required
                  type="date"
                  value={form.fecha_tentativa}
                />
                <Input
                  error={errors.numero_invitados}
                  icon={UsersRound}
                  id="public-invitados"
                  label="Número de invitados"
                  inputMode="numeric"
                  min="1"
                  name="numero_invitados"
                  onChange={handleChange}
                  placeholder="Ej. 100"
                  required
                  step="1"
                  type="number"
                  value={form.numero_invitados}
                />
              </div>
            </section>

            <fieldset className="service-choice">
              <legend>
                <span>2.</span> Modalidad de interés{' '}
                <span className="field__required" aria-hidden="true">*</span>
              </legend>
              <div className="service-options">
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
                      aria-label={option.label}
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
                    </span>
                    <span className="service-option__check" aria-hidden="true">✓</span>
                  </label>
                ))}
              </div>
              {errors.tipo_servicio ? (
                <span className="field__error" role="alert">{errors.tipo_servicio}</span>
              ) : null}
            </fieldset>

            <section className="public-form-section" aria-labelledby="contact-section-title">
              <FormSectionHeading
                id="contact-section-title"
                number="3"
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
                  onBlur={handleNameBlur}
                  onChange={handleChange}
                  placeholder="Ej. Ana María"
                  required
                  value={form.nombre}
                />
                <Input
                  autoComplete="tel"
                  error={errors.telefono || errors.telefono_persona}
                  icon={Phone}
                  id="public-telefono"
                  inputMode="tel"
                  label="Celular / WhatsApp"
                  name="telefono"
                  onBlur={handlePhoneBlur}
                  onChange={handleChange}
                  placeholder="Ej. 0991234567"
                  required
                  type="tel"
                  value={form.telefono}
                />
              </div>
            </section>

            {!isConfigLoading && (!hasBusinessConfig || configError) ? (
              <ErrorMessage
                action={(
                  <Button onClick={reloadConfiguracion} variant="secondary">
                    Reintentar
                  </Button>
                )}
              >
                La configuración del negocio no está disponible. Inténtalo nuevamente más tarde.
              </ErrorMessage>
            ) : null}

            <div className="public-actions">
              <Button
                className="public-calculate-button"
                disabled={isSubmitDisabled}
                icon={ArrowRight}
                isLoading={isSubmitting}
                loadingLabel="Preparando opciones…"
                type="submit"
              >
                {isResultStale ? 'Actualizar mis opciones' : 'Ver mis opciones y estimación'}
              </Button>
              <p className="public-form-privacy">
                <ShieldCheck aria-hidden="true" size={14} />
                <span>Tu información está segura.</span>
              </p>
            </div>
          </form>
        )}
      </Card>

      <div ref={resultSectionRef}>
        <PreCotizacionResult
          headingRef={resultHeadingRef}
          isStale={isResultStale}
          isSavingPreference={isSavingPreference}
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
