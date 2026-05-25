import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  FileText,
  Package,
  PlusCircle,
  Receipt,
  RefreshCw,
  WalletCards,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { inicioService } from '../services/resourceService'
import { getApiErrorMessage } from '../utils/apiErrors'
import { formatCurrency, formatDate } from '../utils/formatters'
import { getEstadoPagoLabel } from './contratos/contractConstants'

const quickActionGroups = [
  {
    title: 'Gestión comercial',
    actions: [
      {
        label: 'Pre-cotización pública',
        description: 'Abrir el formulario que usa el cliente.',
        path: '/pre-cotizacion',
        icon: PlusCircle,
      },
      {
        label: 'Gestionar cotizaciones',
        description: 'Ver y registrar cotizaciones.',
        path: '/cotizaciones',
        icon: ClipboardList,
      },
      {
        label: 'Gestionar contratos',
        description: 'Ver y registrar contratos.',
        path: '/contratos',
        icon: BriefcaseBusiness,
      },
      {
        label: 'Gestionar paquetes',
        description: 'Ver y crear paquetes.',
        path: '/paquetes',
        icon: Package,
      },
    ],
  },
  {
    title: 'Finanzas y reportes',
    actions: [
      {
        label: 'Costos directos',
        description: 'Ver y añadir costos asociados a un evento.',
        path: '/costos-directos',
        icon: Receipt,
      },
      {
        label: 'Gastos fijos',
        description: 'Ver y añadir gastos mensuales del negocio.',
        path: '/gastos-fijos',
        icon: WalletCards,
      },
      {
        label: 'Dashboard financiero',
        description: 'Revisar ingresos, costos, utilidad y margen mensual.',
        path: '/dashboard-financiero',
        icon: BarChart3,
      },
      {
        label: 'Reportes',
        description: 'Consultar información comercial y financiera por periodo.',
        path: '/reportes',
        icon: FileBarChart,
      },
    ],
  },
]

const kpiIcons = {
  cotizaciones_nuevas: ClipboardList,
  cotizaciones_mes: FileText,
  eventos_mes: BriefcaseBusiness,
  eventos_proximos: CalendarDays,
}

const priorityLabels = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

function capitalize(value) {
  if (!value) return ''
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function formatLongDate(value) {
  if (!value) return ''

  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value)

  return capitalize(
    new Intl.DateTimeFormat('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date),
  )
}

function KpiCard({ detail, icon: Icon, label, value }) {
  return (
    <article className="kpi-card">
      <div className="kpi-card__top">
        <span className="kpi-card__label">{label}</span>
        {Icon ? (
          <span className="kpi-card__icon" aria-hidden="true">
            <Icon size={18} />
          </span>
        ) : null}
      </div>
      <strong className="kpi-card__value">{value}</strong>
      <span className="kpi-card__detail">{detail}</span>
    </article>
  )
}

function QuickActionGroup({ group }) {
  return (
    <div className="quick-action-group">
      <div className="quick-action-section__header">
        <h3>{group.title}</h3>
      </div>
      <div className="quick-actions">
        {group.actions.map((action) => (
          <Link className="quick-action" key={action.path} to={action.path}>
            <span className="quick-action__icon" aria-hidden="true">
              <action.icon size={20} />
            </span>
            <span className="quick-action__content">
              <strong>{action.label}</strong>
              <span>{action.description}</span>
            </span>
            <ChevronRight aria-hidden="true" size={18} />
          </Link>
        ))}
      </div>
    </div>
  )
}

function UpcomingEventItem({ event }) {
  return (
    <Link className="home-list__item home-list__item--event home-list__item--link" to={`/contratos/${event.contrato_id}`}>
      <div className="home-list__icon" aria-hidden="true">
        <CalendarDays size={18} />
      </div>
      <div className="home-list__content">
        <strong>{event.cliente_nombre}</strong>
        <div className="home-event__meta">
          <span>Tipo: {event.tipo_evento_nombre}</span>
          {event.paquete_nombre ? <span>Paquete: {event.paquete_nombre}</span> : null}
          <span>Fecha: {formatDate(event.fecha_evento)}</span>
          <span className="home-event__payment">
            Estado de pago:{' '}
            <StatusBadge status={event.estado_pago}>
              {getEstadoPagoLabel(event.estado_pago)}
            </StatusBadge>
          </span>
          <span>Saldo pendiente: {formatCurrency(event.saldo_pendiente)}</span>
        </div>
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
  const totalUpcomingEvents =
    kpis.find((kpi) => kpi.key === 'eventos_proximos')?.value ?? events.length
  const hasMoreUpcomingEvents = Number(totalUpcomingEvents) > events.length
  const upcomingContractsPath = summary?.fecha_referencia
    ? `/contratos?estado_contrato=confirmado&desde=${summary.fecha_referencia}`
    : '/contratos'
  const headerDate = formatLongDate(summary?.fecha_referencia ?? new Date())

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Button disabled={isLoading} icon={RefreshCw} onClick={loadSummary} variant="secondary">
            Actualizar
          </Button>
        }
        description="Resumen operativo y accesos rápidos para la gestión diaria."
        eyebrow={headerDate}
        title="Bienvenido"
      />

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
                icon={kpiIcons[kpi.key]}
                key={kpi.key}
                label={kpi.label}
                value={kpi.value}
              />
            ))}
          </section>

          <section className="quick-actions-shell" aria-label="Acciones rápidas">
            <div className="quick-action-groups">
              {quickActionGroups.map((group) => (
                <QuickActionGroup group={group} key={group.title} />
              ))}
            </div>
          </section>

          <div className="home-grid">
            <Card>
              <div className="detail-section">
                <div className="detail-section__header">
                  <div>
                    <h2>Eventos próximos</h2>
                    <p className="muted-text">
                      Contratos confirmados con fecha cercana.
                    </p>
                  </div>
                </div>
                {events.length ? (
                  <>
                    <div className="home-list">
                      {events.map((event) => (
                        <UpcomingEventItem event={event} key={event.id} />
                      ))}
                    </div>
                    {hasMoreUpcomingEvents ? (
                      <Link className="detail-link" to={upcomingContractsPath}>
                        Ver todos los contratos próximos
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <EmptyState
                    description="No hay contratos confirmados futuros para mostrar."
                    title="Sin eventos próximos"
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
                      Elementos que requieren revisión.
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
