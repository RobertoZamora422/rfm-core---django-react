import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Edit3, Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { contratosService, costosDirectosService } from '../../services/resourceService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatCurrency, formatDate, formatPercent, formatPhone } from '../../utils/formatters'
import { getEstadoContratoLabel, getEstadoPagoLabel } from './contractConstants'

function DetailItem({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || '-'}</dd>
    </div>
  )
}

function toArray(data) {
  return Array.isArray(data) ? data : data?.results ?? []
}

export function DetalleContratoPage() {
  const { id } = useParams()
  const location = useLocation()
  const returnPath = location.state?.from || '/contratos'
  const [contrato, setContrato] = useState(null)
  const [costosDirectos, setCostosDirectos] = useState([])
  const [pageError, setPageError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadContrato = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const [contratoData, costosData] = await Promise.all([
        contratosService.retrieve(id),
        costosDirectosService.list({ contrato: id }),
      ])
      setContrato(contratoData)
      setCostosDirectos(toArray(costosData))
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

  useAutoRefresh(loadContrato, { refreshOnMutation: false })

  if (isLoading) {
    return (
      <div className="page-stack page-stack--commercial">
        <PageHeader title="Detalle de contrato" />
        <Card>
          <LoadingState label="Cargando contrato" />
        </Card>
      </div>
    )
  }

  if (!contrato) {
    return (
      <div className="page-stack page-stack--commercial">
        <PageHeader title="Detalle de contrato" />
        <ErrorMessage>{pageError || 'No se pudo cargar el contrato solicitado.'}</ErrorMessage>
        <Link className="button button--secondary detail-link" to={returnPath}>
          <ArrowLeft aria-hidden="true" size={18} />
          <span>Volver</span>
        </Link>
      </div>
    )
  }

  const isCanceled = contrato.estado_contrato === 'cancelado'
  const costosColumns = [
    { key: 'concepto', header: 'Concepto' },
    {
      key: 'valor',
      header: 'Valor',
      render: (item) => formatCurrency(item.valor),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item) => formatDate(item.fecha),
    },
    {
      key: 'observaciones',
      header: 'Observaciones',
      render: (item) => item.observaciones || '-',
    },
  ]

  return (
    <div className="page-stack page-stack--commercial">
      <PageHeader
        actions={
          <>
            <Link className="button button--secondary" to={returnPath}>
              <ArrowLeft aria-hidden="true" size={18} />
              <span>Volver</span>
            </Link>
            <Link className="button button--primary" state={{ from: returnPath }} to={`/contratos/${contrato.id}/editar`}>
              <Edit3 aria-hidden="true" size={18} />
              <span>Editar contrato</span>
            </Link>
          </>
        }
        description="Información operativa, comercial y financiera de esta venta."
        eyebrow="Comercial · Contratos"
        title={`Contrato #${contrato.id}`}
      />

      <ErrorMessage>{pageError}</ErrorMessage>
      {isCanceled ? (
        <div className="warning-message">
          Este contrato está cancelado. Se conserva como historial, pero no se incluye en los indicadores financieros principales.
        </div>
      ) : null}

      <div className="contract-detail-grid">
        <Card className="contract-overview-card">
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
            <div className="financial-highlights">
              <div><span>Valor final</span><strong>{formatCurrency(contrato.valor_final)}</strong></div>
              <div><span>Monto abonado</span><strong>{formatCurrency(contrato.monto_abonado)}</strong></div>
              <div className="financial-highlights__balance"><span>Saldo pendiente</span><strong>{formatCurrency(contrato.saldo_pendiente)}</strong></div>
            </div>
            <dl className="detail-list detail-list--compact">
              <DetailItem label="Fecha del evento" value={formatDate(contrato.fecha_evento)} />
              <DetailItem label="Creado" value={formatDate(contrato.creado_en)} />
              <DetailItem label="Actualizado" value={formatDate(contrato.actualizado_en)} />
            </dl>
          </div>
        </Card>

        <Card>
          <div className="detail-section">
            <div className="detail-section__header">
              <h2>Datos de la persona</h2>
            </div>
            <dl className="detail-list">
              <DetailItem label="Cliente" value={<Link className="detail-inline-link" to={`/personas/${contrato.persona}`}>{contrato.persona_nombre}</Link>} />
              <DetailItem label="Teléfono" value={<a className="inline-contact" href={`tel:${contrato.persona_telefono}`}>{formatPhone(contrato.persona_telefono)}</a>} />
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
              <DetailItem label="Número de invitados" value={contrato.numero_invitados} />
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
              <DetailItem
                label="Total costos directos"
                value={formatCurrency(contrato.total_costos_directos)}
              />
              <DetailItem label="Utilidad bruta" value={formatCurrency(contrato.utilidad_bruta)} />
              <DetailItem label="Margen bruto" value={formatPercent(contrato.margen_bruto)} />
            </dl>
          </div>
        </Card>
      </div>

      <Card>
        <div className="detail-section">
          <div className="detail-section__header">
            <h2>Costos directos</h2>
            {isCanceled ? (
              <p className="muted-text">No se registran nuevos costos en contratos cancelados.</p>
            ) : (
              <Link
                className="button button--primary"
                to={`/costos-directos?contrato=${contrato.id}&nuevo=1`}
              >
                <Plus aria-hidden="true" size={18} />
                <span>Registrar costo directo</span>
              </Link>
            )}
          </div>
          <DataTable
            columns={costosColumns}
            emptyMessage="Este contrato aun no tiene costos directos registrados."
            mobileTitle={(item) => item.concepto}
            rows={costosDirectos}
          />
        </div>
      </Card>

      <Card>
        <div className="detail-section">
          <div className="detail-section__header">
            <h2>Cotizacion origen</h2>
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
