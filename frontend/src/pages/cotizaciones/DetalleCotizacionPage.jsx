import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  FilePlus2,
  PhoneCall,
  RotateCcw,
  Undo2,
  XCircle,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { OfertaAplicada } from '../../components/comercial/OfertaAplicada'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { LoadingState } from '../../components/ui/LoadingState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { cotizacionesService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { formatCurrency, formatDate, formatPhone } from '../../utils/formatters'
import { ConversionModal } from './ConversionModal'
import { TIPO_SERVICIO_LABELS, canConvertQuote, getEstadoLabel } from './quoteConstants'

function DetailItem({ label, value }) {
  return <div><dt>{label}</dt><dd>{value || '-'}</dd></div>
}

const stateDescriptions = {
  nueva: 'Pendiente del primer contacto con la persona interesada.',
  contactada: 'La persona ya fue contactada; registra la confirmación cuando acepte continuar.',
  confirmada: 'La oportunidad está lista para convertirse en contrato.',
  convertida: 'Ya existe una venta asociada. Los datos comerciales críticos están bloqueados.',
  descartada: 'La oportunidad salió del flujo activo y se conserva en el historial.',
}

export function DetalleCotizacionPage() {
  const { id } = useParams()
  const location = useLocation()
  const returnPath = location.state?.from || '/cotizaciones'
  const [cotizacion, setCotizacion] = useState(null)
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [conversionErrors, setConversionErrors] = useState({})
  const [pendingState, setPendingState] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingState, setIsSavingState] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isConversionOpen, setIsConversionOpen] = useState(false)

  const loadCotizacion = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true)
    if (!silent) setPageError('')
    try {
      const data = await cotizacionesService.retrieve(id)
      setCotizacion(data)
      setPageError('')
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadCotizacion, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCotizacion])

  useAutoRefresh(loadCotizacion, { refreshOnMutation: false })

  const changeState = async (estado) => {
    if (!cotizacion) return
    setIsSavingState(true)
    setPageError('')
    setActionMessage('')
    try {
      const updated = await cotizacionesService.cambiarEstado(cotizacion.id, estado)
      setCotizacion(updated)
      setPendingState(null)
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
      setIsConversionOpen(false)
      setActionMessage(`Contrato #${response.contrato.id} creado desde esta cotización.`)
    } catch (error) {
      setConversionErrors(getApiFieldErrors(error))
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsConverting(false)
    }
  }

  if (isLoading) {
    return <div className="page-stack page-stack--commercial"><PageHeader title="Detalle de cotización" /><Card><LoadingState label="Cargando cotización" /></Card></div>
  }

  if (!cotizacion) {
    return (
      <div className="page-stack page-stack--commercial">
        <PageHeader title="Detalle de cotización" />
        <ErrorMessage action={<Button onClick={() => loadCotizacion()} variant="secondary">Reintentar</Button>}>{pageError || 'No se pudo cargar la cotización solicitada.'}</ErrorMessage>
        <Link className="button button--secondary detail-link" to={returnPath}><ArrowLeft aria-hidden="true" size={18} /><span>Volver a cotizaciones</span></Link>
      </div>
    )
  }

  const renderStateActions = () => {
    if (cotizacion.estado === 'nueva') {
      return <><Button icon={PhoneCall} isLoading={isSavingState} onClick={() => changeState('contactada')}>Marcar contactada</Button><Button icon={XCircle} onClick={() => setPendingState('descartada')} variant="ghost">Descartar</Button></>
    }
    if (cotizacion.estado === 'contactada') {
      return <><Button icon={CheckCircle2} isLoading={isSavingState} onClick={() => changeState('confirmada')}>Confirmar</Button><Button icon={Undo2} onClick={() => changeState('nueva')} variant="secondary">Volver a nueva</Button><Button icon={XCircle} onClick={() => setPendingState('descartada')} variant="ghost">Descartar</Button></>
    }
    if (cotizacion.estado === 'confirmada') {
      return <><Button icon={Undo2} onClick={() => changeState('contactada')} variant="secondary">Volver a contactada</Button><Button icon={XCircle} onClick={() => setPendingState('descartada')} variant="ghost">Descartar</Button></>
    }
    if (cotizacion.estado === 'descartada') {
      return <Button icon={RotateCcw} onClick={() => setPendingState('nueva')}>Reactivar como nueva</Button>
    }
    if (cotizacion.contrato_id) {
      return <Link className="button button--secondary" to={`/contratos/${cotizacion.contrato_id}`}><FilePlus2 aria-hidden="true" size={18} /><span>Ver contrato #{cotizacion.contrato_id}</span></Link>
    }
    return null
  }

  return (
    <div className="page-stack page-stack--commercial">
      <PageHeader
        actions={
          <>
            <Link className="button button--secondary" to={returnPath}><ArrowLeft aria-hidden="true" size={18} /><span>Volver</span></Link>
            <Link className="button button--secondary" state={{ from: returnPath }} to={`/cotizaciones/${cotizacion.id}/editar`}><Edit3 aria-hidden="true" size={18} /><span>Editar</span></Link>
            {canConvertQuote(cotizacion) ? <Button icon={FilePlus2} onClick={() => setIsConversionOpen(true)}>Convertir</Button> : null}
          </>
        }
        description="Información comercial y próximos pasos de esta oportunidad."
        eyebrow="Comercial · Cotizaciones"
        title={`Cotización #${cotizacion.id}`}
      />

      <ErrorMessage>{pageError}</ErrorMessage>
      {actionMessage ? <div className="success-message" role="status">{actionMessage}</div> : null}

      <div className="quote-detail-grid">
        <Card>
          <div className="detail-section">
            <div className="detail-section__header"><h2>Resumen comercial</h2><StatusBadge status={cotizacion.estado}>{getEstadoLabel(cotizacion.estado)}</StatusBadge></div>
            <dl className="detail-list">
              <DetailItem label="Persona" value={<Link className="detail-inline-link" to={`/personas/${cotizacion.persona}`}>{cotizacion.persona_nombre}</Link>} />
              <DetailItem label="Teléfono" value={<a className="inline-contact" href={`tel:${cotizacion.persona_telefono}`}>{formatPhone(cotizacion.persona_telefono)}</a>} />
              <DetailItem label="Tipo de evento" value={cotizacion.tipo_evento_nombre} />
              <DetailItem label="Fecha tentativa" value={formatDate(cotizacion.fecha_tentativa)} />
              <DetailItem label="Invitados" value={cotizacion.numero_invitados} />
              <DetailItem label="Servicio" value={TIPO_SERVICIO_LABELS[cotizacion.tipo_servicio] ?? cotizacion.tipo_servicio} />
              <DetailItem label="Paquete" value={cotizacion.paquete_nombre} />
              <DetailItem label="Total estimado" value={formatCurrency(cotizacion.total_estimado)} />
              <DetailItem label="Origen" value={cotizacion.origen_display} />
              <DetailItem label="Creado" value={formatDate(cotizacion.creado_en)} />
              <DetailItem label="Actualizado" value={formatDate(cotizacion.actualizado_en)} />
            </dl>
          </div>
        </Card>

        <Card className="commercial-action-card">
          <div className="detail-section">
            <div className="detail-section__header"><h2>Seguimiento</h2></div>
            <div className="current-state"><StatusBadge status={cotizacion.estado}>{getEstadoLabel(cotizacion.estado)}</StatusBadge><p>{stateDescriptions[cotizacion.estado]}</p></div>
            <div className="detail-actions">{renderStateActions()}</div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="detail-section">
          <div className="detail-section__header"><h2>Oferta cotizada</h2></div>
          <OfertaAplicada record={cotizacion} />
        </div>
      </Card>

      <Card>
        <div className="detail-section">
          <div className="detail-section__header"><h2>Observaciones</h2></div>
          <p className="plain-text">{cotizacion.observaciones || 'Sin observaciones registradas.'}</p>
        </div>
      </Card>

      {isConversionOpen ? <ConversionModal cotizacion={cotizacion} errors={conversionErrors} isSubmitting={isConverting} onClose={() => setIsConversionOpen(false)} onSubmit={handleConvert} /> : null}

      <Modal isOpen={Boolean(pendingState)} onClose={() => setPendingState(null)} title={pendingState === 'descartada' ? 'Descartar cotización' : 'Reactivar cotización'}>
        <div className="confirm-dialog">
          <p>{pendingState === 'descartada' ? 'La oportunidad saldrá del flujo activo, pero conservará toda su información histórica.' : 'La oportunidad volverá al estado Nueva para iniciar nuevamente el seguimiento.'}</p>
          <div className="form-actions"><Button onClick={() => setPendingState(null)} variant="secondary">Volver</Button><Button icon={pendingState === 'descartada' ? XCircle : RotateCcw} isLoading={isSavingState} onClick={() => changeState(pendingState)}>{pendingState === 'descartada' ? 'Descartar cotización' : 'Reactivar'}</Button></div>
        </div>
      </Modal>
    </div>
  )
}
