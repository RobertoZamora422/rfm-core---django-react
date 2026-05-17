import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { contratosService } from '../../services/resourceService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { getEstadoContratoLabel, getEstadoPagoLabel } from './contractConstants'

function DetailItem({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || '-'}</dd>
    </div>
  )
}

export function DetalleContratoPage() {
  const { id } = useParams()
  const [contrato, setContrato] = useState(null)
  const [pageError, setPageError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadContrato = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const data = await contratosService.retrieve(id)
      setContrato(data)
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadContrato, 0)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadContrato])

  if (isLoading) {
    return (
      <div className="page-stack">
        <PageHeader title="Detalle de contrato" />
        <Card>
          <LoadingState label="Cargando contrato" />
        </Card>
      </div>
    )
  }

  if (!contrato) {
    return (
      <div className="page-stack">
        <PageHeader title="Detalle de contrato" />
        <ErrorMessage>{pageError || 'No se pudo cargar el contrato solicitado.'}</ErrorMessage>
        <Link className="button button--secondary" to="/contratos">
          <ArrowLeft aria-hidden="true" size={18} />
          <span>Volver</span>
        </Link>
      </div>
    )
  }

  const isCanceled = contrato.estado_contrato === 'cancelado'

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <Link className="button button--secondary" to="/contratos">
              <ArrowLeft aria-hidden="true" size={18} />
              <span>Volver</span>
            </Link>
            <Button icon={RefreshCw} onClick={loadContrato} variant="secondary">
              Actualizar
            </Button>
          </>
        }
        description="Resumen operativo, comercial y financiero del contrato."
        title={`Contrato #${contrato.id}`}
      />

      <ErrorMessage>{pageError}</ErrorMessage>
      {isCanceled ? (
        <div className="warning-message">
          Este contrato está cancelado y no se incluye en los indicadores financieros principales.
        </div>
      ) : null}

      <div className="contract-detail-grid">
        <Card>
          <div className="detail-section">
            <div className="detail-section__header">
              <h2>Resumen del contrato</h2>
              <div className="status-group">
                <StatusBadge status={contrato.estado_contrato}>
                  {getEstadoContratoLabel(contrato.estado_contrato)}
                </StatusBadge>
                <StatusBadge status={contrato.estado_pago}>
                  {getEstadoPagoLabel(contrato.estado_pago)}
                </StatusBadge>
              </div>
            </div>
            <dl className="detail-list">
              <DetailItem label="Fecha del evento" value={formatDate(contrato.fecha_evento)} />
              <DetailItem label="Valor final" value={formatCurrency(contrato.valor_final)} />
              <DetailItem label="Monto abonado" value={formatCurrency(contrato.monto_abonado)} />
              <DetailItem label="Saldo pendiente" value={formatCurrency(contrato.saldo_pendiente)} />
              <DetailItem label="Creado" value={formatDate(contrato.creado_en)} />
              <DetailItem label="Actualizado" value={formatDate(contrato.actualizado_en)} />
            </dl>
          </div>
        </Card>

        <Card>
          <div className="detail-section">
            <div className="detail-section__header">
              <h2>Datos del cliente</h2>
            </div>
            <dl className="detail-list">
              <DetailItem label="Cliente" value={contrato.cliente_nombre} />
              <DetailItem label="Telefono" value={contrato.cliente_telefono} />
              <DetailItem label="ID cliente" value={contrato.cliente} />
            </dl>
          </div>
        </Card>

        <Card>
          <div className="detail-section">
            <div className="detail-section__header">
              <h2>Datos del evento</h2>
            </div>
            <dl className="detail-list">
              <DetailItem label="Tipo de evento" value={contrato.tipo_evento_nombre} />
              <DetailItem label="Numero de invitados" value={contrato.numero_invitados} />
              <DetailItem label="Paquete" value={contrato.paquete_nombre || 'Sin paquete'} />
            </dl>
          </div>
        </Card>

        <Card>
          <div className="detail-section">
            <div className="detail-section__header">
              <h2>Datos financieros</h2>
            </div>
            <dl className="detail-list">
              <DetailItem label="Valor final" value={formatCurrency(contrato.valor_final)} />
              <DetailItem label="Monto abonado" value={formatCurrency(contrato.monto_abonado)} />
              <DetailItem label="Saldo pendiente" value={formatCurrency(contrato.saldo_pendiente)} />
              <DetailItem
                label="Estado pago"
                value={
                  <StatusBadge status={contrato.estado_pago}>
                    {getEstadoPagoLabel(contrato.estado_pago)}
                  </StatusBadge>
                }
              />
            </dl>
          </div>
        </Card>
      </div>

      <Card>
        <div className="detail-section">
          <div className="detail-section__header">
            <h2>Cotización origen</h2>
          </div>
          {contrato.cotizacion ? (
            <Link className="button button--secondary detail-link" to={`/cotizaciones/${contrato.cotizacion}`}>
              <ClipboardList aria-hidden="true" size={18} />
              <span>Ver cotizacion #{contrato.cotizacion}</span>
            </Link>
          ) : (
            <p className="muted-text">Este contrato no tiene cotizacion origen asociada.</p>
          )}
        </div>
      </Card>

      <Card>
        <div className="detail-section">
          <div className="detail-section__header">
            <h2>Observaciones</h2>
          </div>
          <p className="plain-text">{contrato.observaciones || 'Sin observaciones registradas.'}</p>
        </div>
      </Card>
    </div>
  )
}
