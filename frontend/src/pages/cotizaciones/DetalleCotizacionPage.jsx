import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Edit3, FilePlus2, RefreshCw, Save } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Textarea } from '../../components/ui/Textarea'
import { cotizacionesService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { ConversionModal } from './ConversionModal'
import {
  ESTADOS_CAMBIO,
  TIPO_SERVICIO_LABELS,
  canChangeQuoteStatus,
  canConvertQuote,
  getEstadoLabel,
} from './quoteConstants'

function DetailItem({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || '-'}</dd>
    </div>
  )
}

export function DetalleCotizacionPage() {
  const { id } = useParams()
  const [cotizacion, setCotizacion] = useState(null)
  const [estado, setEstado] = useState('')
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [conversionErrors, setConversionErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingState, setIsSavingState] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isConversionOpen, setIsConversionOpen] = useState(false)

  const loadCotizacion = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const data = await cotizacionesService.retrieve(id)
      setCotizacion(data)
      setEstado(data.estado)
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadCotizacion, 0)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadCotizacion])

  const handleSaveState = async (event) => {
    event.preventDefault()
    if (!cotizacion || estado === cotizacion.estado) return

    setIsSavingState(true)
    setPageError('')
    setActionMessage('')

    try {
      const updated = await cotizacionesService.cambiarEstado(cotizacion.id, estado)
      setCotizacion(updated)
      setEstado(updated.estado)
      setActionMessage(`Estado actualizado a ${getEstadoLabel(updated.estado)}.`)
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsSavingState(false)
    }
  }

  const handleConvert = async (payload) => {
    if (!cotizacion) return

    setIsConverting(true)
    setConversionErrors({})
    setPageError('')
    setActionMessage('')

    try {
      const response = await cotizacionesService.convertirContrato(cotizacion.id, payload)
      setCotizacion(response.cotizacion)
      setEstado(response.cotizacion.estado)
      setIsConversionOpen(false)
      setActionMessage(`Contrato #${response.contrato.id} creado desde esta cotizacion.`)
    } catch (error) {
      setConversionErrors(getApiFieldErrors(error))
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsConverting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <PageHeader title="Detalle de cotizacion" />
        <Card>
          <LoadingState label="Cargando cotizacion" />
        </Card>
      </div>
    )
  }

  if (!cotizacion) {
    return (
      <div className="page-stack">
        <PageHeader title="Detalle de cotizacion" />
        <ErrorMessage>{pageError || 'No se pudo cargar la cotizacion solicitada.'}</ErrorMessage>
        <Link className="button button--secondary" to="/cotizaciones">
          <ArrowLeft aria-hidden="true" size={18} />
          <span>Volver</span>
        </Link>
      </div>
    )
  }

  const estadoBloqueado = !canChangeQuoteStatus(cotizacion)

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <Link className="button button--secondary" to="/cotizaciones">
              <ArrowLeft aria-hidden="true" size={18} />
              <span>Volver</span>
            </Link>
            <Button icon={RefreshCw} onClick={loadCotizacion} variant="secondary">
              Actualizar
            </Button>
            <Link className="button button--secondary" to={`/cotizaciones/${cotizacion.id}/editar`}>
              <Edit3 aria-hidden="true" size={18} />
              <span>Editar</span>
            </Link>
            {canConvertQuote(cotizacion) ? (
              <Button icon={FilePlus2} onClick={() => setIsConversionOpen(true)}>
                Convertir
              </Button>
            ) : null}
          </>
        }
        description="Informacion completa y acciones comerciales sobre la oportunidad."
        title={`Cotizacion #${cotizacion.id}`}
      />

      <ErrorMessage>{pageError}</ErrorMessage>
      {actionMessage ? <div className="success-message">{actionMessage}</div> : null}

      <div className="quote-detail-grid">
        <Card>
          <div className="detail-section">
            <div className="detail-section__header">
              <h2>Resumen comercial</h2>
              <StatusBadge status={cotizacion.estado}>{getEstadoLabel(cotizacion.estado)}</StatusBadge>
            </div>
            <dl className="detail-list">
              <DetailItem label="Cliente" value={cotizacion.cliente_nombre} />
              <DetailItem label="Telefono" value={cotizacion.cliente_telefono} />
              <DetailItem label="Tipo de evento" value={cotizacion.tipo_evento_nombre} />
              <DetailItem label="Fecha tentativa" value={formatDate(cotizacion.fecha_tentativa)} />
              <DetailItem label="Numero de invitados" value={cotizacion.numero_invitados} />
              <DetailItem
                label="Tipo de servicio"
                value={TIPO_SERVICIO_LABELS[cotizacion.tipo_servicio] ?? cotizacion.tipo_servicio}
              />
              <DetailItem label="Paquete" value={cotizacion.paquete_nombre} />
              <DetailItem label="Total estimado" value={formatCurrency(cotizacion.total_estimado)} />
              <DetailItem label="Origen" value={cotizacion.es_demo ? 'Demo' : 'Real'} />
            </dl>
          </div>
        </Card>

        <Card>
          <form className="detail-section" onSubmit={handleSaveState}>
            <div className="detail-section__header">
              <h2>Estado comercial</h2>
            </div>
            <Select
              disabled={estadoBloqueado}
              id="detalle-cotizacion-estado"
              label="Estado"
              name="estado"
              onChange={(event) => setEstado(event.target.value)}
              value={estado}
            >
              {estadoBloqueado ? (
                <option value="convertida">Convertida</option>
              ) : (
                ESTADOS_CAMBIO.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))
              )}
            </Select>
            <div className="form-actions">
              <Button
                disabled={estadoBloqueado || estado === cotizacion.estado}
                icon={Save}
                isLoading={isSavingState}
                type="submit"
              >
                Guardar estado
              </Button>
            </div>
            {cotizacion.contrato_id ? (
              <Link className="button button--secondary" to={`/contratos/${cotizacion.contrato_id}`}>
                <FilePlus2 aria-hidden="true" size={18} />
                <span>Ver contrato #{cotizacion.contrato_id}</span>
              </Link>
            ) : null}
          </form>
        </Card>
      </div>

      <Card>
        <div className="detail-section">
          <div className="detail-section__header">
            <h2>Observaciones</h2>
          </div>
          <Textarea
            disabled
            id="detalle-cotizacion-observaciones"
            label="Observaciones registradas"
            readOnly
            value={cotizacion.observaciones}
          />
        </div>
      </Card>

      {isConversionOpen ? (
        <ConversionModal
          cotizacion={cotizacion}
          errors={conversionErrors}
          isSubmitting={isConverting}
          onClose={() => setIsConversionOpen(false)}
          onSubmit={handleConvert}
        />
      ) : null}
    </div>
  )
}
