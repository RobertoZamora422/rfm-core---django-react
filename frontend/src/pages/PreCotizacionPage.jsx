import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Calculator, HelpCircle, Sparkles } from 'lucide-react'
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
import { getApiErrorMessage, getApiFieldErrors } from '../utils/apiErrors'

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
    label: 'Aun no estoy seguro',
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

export function PreCotizacionPage() {
  const [tiposEvento, setTiposEvento] = useState([])
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let isActive = true

    async function loadCatalogs() {
      setIsLoadingCatalogs(true)
      setPageError('')

      try {
        const tiposData = await listarTiposEventoPublicos()
        if (!isActive) return
        setTiposEvento(Array.isArray(tiposData) ? tiposData : tiposData.results ?? [])
      } catch (error) {
        if (!isActive) return
        setPageError(getApiErrorMessage(error))
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
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})
    setPageError('')
    setIsSubmitting(true)

    try {
      const response = await crearPreCotizacion(buildPayload(form))
      savePreCotizacionResult(response)
      navigate(resultPaths[response.cotizacion.tipo_servicio] ?? '/pre-cotizacion')
    } catch (error) {
      setErrors(getApiFieldErrors(error))
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="public-prequote" aria-labelledby="public-prequote-title">
      <div className="public-copy">
        <span className="app-kicker">Pre-cotizacion publica</span>
        <h1 id="public-prequote-title">Cotiza tu evento</h1>
        <p>Completa los datos basicos y un asesor continuara contigo por WhatsApp.</p>
      </div>

      <ErrorMessage>{pageError}</ErrorMessage>

      <Card className="public-card">
        {isLoadingCatalogs ? (
          <LoadingState label="Cargando opciones disponibles" />
        ) : (
          <form className="public-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <Input
                error={errors.nombre || errors.nombre_cliente}
                id="public-nombre"
                label="Nombre"
                name="nombre"
                onChange={handleChange}
                required
                value={form.nombre}
              />
              <Input
                error={errors.telefono || errors.telefono_cliente}
                id="public-telefono"
                label="Telefono / WhatsApp"
                name="telefono"
                onChange={handleChange}
                required
                value={form.telefono}
              />
              <Select
                error={errors.tipo_evento}
                id="public-tipo-evento"
                label="Tipo de evento"
                name="tipo_evento"
                onChange={handleChange}
                required
                value={form.tipo_evento}
              >
                <option value="">Seleccione un tipo de evento</option>
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
                label="Numero aproximado de invitados"
                min="1"
                name="numero_invitados"
                onChange={handleChange}
                required
                type="number"
                value={form.numero_invitados}
              />
            </div>

            <fieldset className="service-choice">
              <legend>Tipo de servicio de interes</legend>
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
                      checked={form.tipo_servicio === option.value}
                      name="tipo_servicio"
                      onChange={handleChange}
                      type="radio"
                      value={option.value}
                    />
                    <span className="service-option__icon">
                      <option.icon aria-hidden="true" size={20} />
                    </span>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.detail}</small>
                    </span>
                  </label>
                ))}
              </div>
              {errors.tipo_servicio ? <span className="field__error">{errors.tipo_servicio}</span> : null}
            </fieldset>

            <div className="public-actions">
              <Button icon={Calculator} isLoading={isSubmitting} type="submit">
                Calcular y ver resultado
              </Button>
            </div>
          </form>
        )}
      </Card>
    </section>
  )
}
