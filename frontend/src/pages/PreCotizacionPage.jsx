import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { Input } from '../components/ui/Input'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Textarea } from '../components/ui/Textarea'
import { crearPreCotizacion } from '../services/preCotizacionService'
import {
  clientesService,
  paquetesService,
  tiposEventoService,
} from '../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../utils/apiErrors'
import { formatCurrency } from '../utils/formatters'

const initialForm = {
  cliente: '',
  nombre_cliente: '',
  telefono_cliente: '',
  correo_cliente: '',
  observaciones_cliente: '',
  tipo_evento: '',
  paquete: '',
  fecha_tentativa: '',
  numero_invitados: '',
  tipo_servicio: 'alquiler',
  observaciones: '',
}

const TIPO_SERVICIO_LABELS = {
  alquiler: 'Alquiler',
  servicio_completo: 'Servicio completo',
}

function buildPayload(form, clienteMode) {
  const payload = {
    tipo_evento: Number(form.tipo_evento),
    fecha_tentativa: form.fecha_tentativa,
    numero_invitados: Number(form.numero_invitados),
    tipo_servicio: form.tipo_servicio,
    observaciones: form.observaciones,
  }

  if (form.paquete) {
    payload.paquete = Number(form.paquete)
  }

  if (clienteMode === 'existente') {
    payload.cliente = Number(form.cliente)
    return payload
  }

  return {
    ...payload,
    nombre_cliente: form.nombre_cliente,
    telefono_cliente: form.telefono_cliente,
    correo_cliente: form.correo_cliente,
    observaciones_cliente: form.observaciones_cliente,
  }
}

export function PreCotizacionPage() {
  const [clientes, setClientes] = useState([])
  const [tiposEvento, setTiposEvento] = useState([])
  const [paquetes, setPaquetes] = useState([])
  const [clienteMode, setClienteMode] = useState('nuevo')
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let isActive = true

    async function loadCatalogs() {
      setIsLoadingCatalogs(true)
      setPageError('')

      try {
        const [clientesData, tiposData, paquetesData] = await Promise.all([
          clientesService.list(),
          tiposEventoService.list({ activo: true }),
          paquetesService.list({ activo: true }),
        ])

        if (!isActive) return
        setClientes(Array.isArray(clientesData) ? clientesData : clientesData.results ?? [])
        setTiposEvento(Array.isArray(tiposData) ? tiposData : tiposData.results ?? [])
        setPaquetes(Array.isArray(paquetesData) ? paquetesData : paquetesData.results ?? [])
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

  const paquetesFiltrados = useMemo(
    () => paquetes.filter((paquete) => paquete.tipo_servicio === form.tipo_servicio),
    [form.tipo_servicio, paquetes],
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'tipo_servicio' ? { paquete: '' } : {}),
    }))
  }

  const handleClientModeChange = (event) => {
    const mode = event.target.value
    setClienteMode(mode)
    setErrors({})
    setForm((current) => ({
      ...current,
      cliente: '',
      nombre_cliente: '',
      telefono_cliente: '',
      correo_cliente: '',
      observaciones_cliente: '',
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})
    setPageError('')
    setResult(null)
    setIsSubmitting(true)

    try {
      const response = await crearPreCotizacion(buildPayload(form, clienteMode))
      setResult(response)
      setForm(initialForm)
      setClienteMode('nuevo')
    } catch (error) {
      setErrors(getApiFieldErrors(error))
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const requiresPackage = form.tipo_servicio === 'servicio_completo'

  return (
    <div className="page-stack">
      <PageHeader
        description="Registro de solicitudes iniciales con calculo referencial generado por backend."
        title="Pre-cotizacion"
      />

      <ErrorMessage>{pageError}</ErrorMessage>

      {isLoadingCatalogs ? (
        <Card>
          <LoadingState label="Cargando datos base" />
        </Card>
      ) : (
        <div className="prequote-grid">
          <Card>
            <form className="resource-form" onSubmit={handleSubmit}>
              <fieldset className="form-section">
                <legend>Cliente</legend>
                <div className="segmented-control" role="radiogroup" aria-label="Tipo de cliente">
                  <label>
                    <input
                      checked={clienteMode === 'nuevo'}
                      name="cliente_mode"
                      onChange={handleClientModeChange}
                      type="radio"
                      value="nuevo"
                    />
                    <span>Nuevo cliente</span>
                  </label>
                  <label>
                    <input
                      checked={clienteMode === 'existente'}
                      disabled={!clientes.length}
                      name="cliente_mode"
                      onChange={handleClientModeChange}
                      type="radio"
                      value="existente"
                    />
                    <span>Cliente existente</span>
                  </label>
                </div>

                {clienteMode === 'existente' ? (
                  <Select
                    error={errors.cliente}
                    id="pre-cliente"
                    label="Cliente"
                    name="cliente"
                    onChange={handleChange}
                    required
                    value={form.cliente}
                  >
                    <option value="">Seleccione un cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre} - {cliente.telefono}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="form-grid">
                    <Input
                      error={errors.nombre_cliente}
                      id="pre-nombre-cliente"
                      label="Nombre del cliente"
                      name="nombre_cliente"
                      onChange={handleChange}
                      required
                      value={form.nombre_cliente}
                    />
                    <Input
                      error={errors.telefono_cliente}
                      id="pre-telefono-cliente"
                      label="Telefono"
                      name="telefono_cliente"
                      onChange={handleChange}
                      required
                      value={form.telefono_cliente}
                    />
                    <Input
                      error={errors.correo_cliente}
                      id="pre-correo-cliente"
                      label="Correo"
                      name="correo_cliente"
                      onChange={handleChange}
                      type="email"
                      value={form.correo_cliente}
                    />
                    <Textarea
                      error={errors.observaciones_cliente}
                      id="pre-observaciones-cliente"
                      label="Observaciones del cliente"
                      name="observaciones_cliente"
                      onChange={handleChange}
                      value={form.observaciones_cliente}
                    />
                  </div>
                )}
              </fieldset>

              <fieldset className="form-section">
                <legend>Evento y servicio</legend>
                <div className="form-grid">
                  <Select
                    error={errors.tipo_evento}
                    id="pre-tipo-evento"
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
                    id="pre-fecha"
                    label="Fecha tentativa"
                    name="fecha_tentativa"
                    onChange={handleChange}
                    required
                    type="date"
                    value={form.fecha_tentativa}
                  />
                  <Input
                    error={errors.numero_invitados}
                    id="pre-invitados"
                    label="Numero de invitados"
                    min="1"
                    name="numero_invitados"
                    onChange={handleChange}
                    required
                    type="number"
                    value={form.numero_invitados}
                  />
                  <Select
                    error={errors.tipo_servicio}
                    id="pre-tipo-servicio"
                    label="Tipo de servicio"
                    name="tipo_servicio"
                    onChange={handleChange}
                    value={form.tipo_servicio}
                  >
                    <option value="alquiler">Alquiler</option>
                    <option value="servicio_completo">Servicio completo</option>
                  </Select>
                  <Select
                    error={errors.paquete}
                    id="pre-paquete"
                    label={requiresPackage ? 'Paquete' : 'Paquete asociado'}
                    name="paquete"
                    onChange={handleChange}
                    required={requiresPackage}
                    value={form.paquete}
                  >
                    <option value="">
                      {requiresPackage ? 'Seleccione un paquete' : 'Sin paquete asociado'}
                    </option>
                    {paquetesFiltrados.map((paquete) => (
                      <option key={paquete.id} value={paquete.id}>
                        {paquete.nombre}
                      </option>
                    ))}
                  </Select>
                </div>
                <Textarea
                  error={errors.observaciones}
                  id="pre-observaciones"
                  label="Observaciones de la solicitud"
                  name="observaciones"
                  onChange={handleChange}
                  value={form.observaciones}
                />
              </fieldset>

              <div className="form-actions">
                <Button isLoading={isSubmitting} type="submit">
                  Crear pre-cotizacion
                </Button>
              </div>
            </form>
          </Card>

          <Card className="prequote-summary">
            {result ? (
              <div className="result-panel">
                <CheckCircle2 aria-hidden="true" size={28} />
                <div>
                  <h2>Cotizacion creada</h2>
                  <p>El backend registro la solicitud en estado inicial.</p>
                </div>
                <dl>
                  <div>
                    <dt>Numero</dt>
                    <dd>#{result.cotizacion.id}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>
                      <StatusBadge status={result.cotizacion.estado}>
                        {result.cotizacion.estado}
                      </StatusBadge>
                    </dd>
                  </div>
                  <div>
                    <dt>Total estimado</dt>
                    <dd>{formatCurrency(result.cotizacion.total_estimado)}</dd>
                  </div>
                  <div>
                    <dt>Tipo de servicio</dt>
                    <dd>{TIPO_SERVICIO_LABELS[result.cotizacion.tipo_servicio]}</dd>
                  </div>
                  <div>
                    <dt>Invitados</dt>
                    <dd>{result.cotizacion.numero_invitados}</dd>
                  </div>
                  <div>
                    <dt>Calculo backend</dt>
                    <dd>{formatCurrency(result.calculo.total_estimado)}</dd>
                  </div>
                </dl>
                <Link className="button button--secondary" to="/cotizaciones">
                  <ClipboardList aria-hidden="true" size={18} />
                  <span>Ver cotizaciones</span>
                </Link>
              </div>
            ) : (
              <div className="guidance-panel">
                <h2>Resultado referencial</h2>
                <p>
                  Al enviar el formulario, el sistema creara una cotizacion real y mostrara el
                  total estimado devuelto por el backend.
                </p>
                <ul>
                  <li>La cotizacion no se registra como ingreso real.</li>
                  <li>El estado inicial sera nueva.</li>
                  <li>La configuracion activa del negocio alimenta el calculo.</li>
                </ul>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
