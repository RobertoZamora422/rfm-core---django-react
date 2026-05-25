import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  PlusCircle,
  RefreshCw,
  ReceiptText,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { inicioService } from '../services/resourceService'
import { getApiErrorMessage } from '../utils/apiErrors'
import { formatCurrency, formatDate } from '../utils/formatters'

const quickActions = [
  {
    label: 'Abrir pre-cotizacion publica',
    path: '/pre-cotizacion',
    icon: PlusCircle,
  },
  {
    label: 'Revisar cotizaciones',
    path: '/cotizaciones',
    icon: ClipboardList,
  },
  {
    label: 'Ver contratos',
    path: '/contratos',
    icon: FileText,
  },
  {
    label: 'Registrar costos',
    path: '/costos-directos',
    icon: ReceiptText,
  },
]

const priorityLabels = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

function KpiCard({ detail, label, value }) {
  return (
    <article className="kpi-card">
      <span className="kpi-card__label">{label}</span>
      <strong className="kpi-card__value">{value}</strong>
      <span className="kpi-card__detail">{detail}</span>
    </article>
  )
}

function UpcomingEventItem({ event }) {
  return (
    <Link className="home-list__item home-list__item--link" to={`/contratos/${event.contrato_id}`}>
      <div className="home-list__icon" aria-hidden="true">
        <CalendarDays size={18} />
      </div>
      <div className="home-list__content">
        <strong>{event.cliente_nombre}</strong>
        <span>
          {event.tipo_evento_nombre} - {formatDate(event.fecha_evento)}
        </span>
        <span>Saldo pendiente: {formatCurrency(event.saldo_pendiente)}</span>
      </div>
      <ChevronRight aria-hidden="true" size={18} />
    </Link>
  )
}

function PendingItem({ item }) {
  return (
    <Link className="home-list__item home-list__item--link" to={item.enlace || '/inicio'}>
      <div className="home-list__content">
        <div className="home-list__title-row">
          <strong>{item.titulo}</strong>
          <span className={`priority-badge priority-badge--${item.prioridad}`}>
            {priorityLabels[item.prioridad] || item.prioridad}
          </span>
        </div>
        <span>{item.descripcion}</span>
        <span>{item.cantidad} pendiente(s)</span>
      </div>
      <ChevronRight aria-hidden="true" size={18} />
    </Link>
  )
}

export function InicioPage() {
  const [summary, setSummary] = useState(null)
  const [pageError, setPageError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadSummary = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const data = await inicioService.resumen()
      setSummary(data)
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadSummary, 0)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadSummary])

  const kpis = summary?.kpis ?? []
  const events = summary?.eventos_proximos ?? []
  const pending = summary?.pendientes_importantes ?? []

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Button disabled={isLoading} icon={RefreshCw} onClick={loadSummary} variant="secondary">
            Actualizar
          </Button>
        }
        description="Centro operativo para seguimiento comercial y administrativo."
        title="Inicio administrativo"
      />

      <section className="quick-actions" aria-label="Acciones principales">
        {quickActions.map((action) => (
          <Link className="quick-action" key={action.path} to={action.path}>
            <action.icon aria-hidden="true" size={20} />
            <span>{action.label}</span>
          </Link>
        ))}
      </section>

      <ErrorMessage>{pageError}</ErrorMessage>

      {isLoading && !summary ? (
        <Card>
          <LoadingState label="Cargando resumen administrativo" />
        </Card>
      ) : null}

      {!isLoading && !summary && !pageError ? (
        <Card>
          <EmptyState
            description="No hay informacion operativa disponible para mostrar."
            title="Sin resumen administrativo"
          />
        </Card>
      ) : null}

      {summary ? (
        <>
          <section className="kpi-grid" aria-label="Indicadores operativos">
            {kpis.map((kpi) => (
              <KpiCard
                detail={kpi.detail}
                key={kpi.key}
                label={kpi.label}
                value={kpi.value}
              />
            ))}
          </section>

          <div className="home-grid">
            <Card>
              <div className="detail-section">
                <div className="detail-section__header">
                  <div>
                    <h2>Eventos proximos</h2>
                    <p className="muted-text">
                      Contratos confirmados a partir de {formatDate(summary.fecha_referencia)}.
                    </p>
                  </div>
                </div>
                {events.length ? (
                  <div className="home-list">
                    {events.map((event) => (
                      <UpcomingEventItem event={event} key={event.id} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="No hay contratos confirmados futuros para mostrar."
                    title="Sin eventos proximos"
                  />
                )}
              </div>
            </Card>

            <Card>
              <div className="detail-section">
                <div className="detail-section__header">
                  <div>
                    <h2>Pendientes importantes</h2>
                    <p className="muted-text">
                      Senales operativas generadas por reglas del backend.
                    </p>
                  </div>
                </div>
                {pending.length ? (
                  <div className="home-list">
                    {pending.map((item) => (
                      <PendingItem item={item} key={item.tipo} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="No hay pendientes importantes con los datos actuales."
                    title="Sin pendientes"
                  />
                )}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
