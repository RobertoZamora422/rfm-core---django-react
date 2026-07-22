import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DashboardHero } from '../components/ui/DashboardHero'
import { DashboardSectionHeader } from '../components/ui/DashboardSectionHeader'
import { DashboardSkeleton } from '../components/ui/DashboardSkeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { MetricCard } from '../components/ui/MetricCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { inicioService } from '../services/resourceService'
import { getApiErrorMessage } from '../utils/apiErrors'
import { formatCurrency } from '../utils/formatters'
import { getEstadoPagoLabel } from './contratos/contractConstants'

const quickActions = [
  {
    label: 'Nueva cotización',
    description: 'Registrar una oportunidad comercial.',
    path: '/cotizaciones/nueva',
    icon: ClipboardList,
  },
  {
    label: 'Nuevo contrato',
    description: 'Confirmar un evento del negocio.',
    path: '/contratos/nuevo',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Seguimiento comercial',
    description: 'Revisar cotizaciones y sus estados.',
    path: '/cotizaciones',
    icon: FileText,
  },
  {
    label: 'Registrar costos',
    description: 'Completar costos directos de eventos.',
    path: '/costos-directos',
    icon: Receipt,
  },
  {
    label: 'Analizar rentabilidad',
    description: 'Abrir el Dashboard financiero.',
    path: '/dashboard-financiero',
    icon: BarChart3,
  },
  {
    label: 'Pre-cotización pública',
    description: 'Abrir la experiencia para clientes.',
    path: '/pre-cotizacion',
    icon: Sparkles,
  },
]

const kpiConfig = {
  cotizaciones_nuevas: { icon: ClipboardList, tone: 'rose' },
  cotizaciones_mes: { icon: FileText, tone: 'gold' },
  eventos_mes: { icon: BriefcaseBusiness, tone: 'sage' },
  eventos_proximos: { icon: CalendarDays, tone: 'forest' },
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

function parseLocalDate(value) {
  if (!value) return null
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
}

function formatLongDate(value) {
  const date = parseLocalDate(value)
  if (!date) return ''

  return capitalize(
    new Intl.DateTimeFormat('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date),
  )
}

function formatEventDate(value) {
  const date = parseLocalDate(value)
  if (!date) return { day: '—', month: '' }

  return {
    day: new Intl.DateTimeFormat('es-EC', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('es-EC', { month: 'short' })
      .format(date)
      .replace('.', '')
      .toUpperCase(),
  }
}

function QuickAction({ action }) {
  const Icon = action.icon

  return (
    <Link className="quick-action" to={action.path}>
      <span className="quick-action__icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <span className="quick-action__content">
        <strong>{action.label}</strong>
        <span>{action.description}</span>
      </span>
      <ArrowRight aria-hidden="true" size={18} />
    </Link>
  )
}

function UpcomingEventItem({ event }) {
  const eventDate = formatEventDate(event.fecha_evento)

  return (
    <Link className="home-event" to={`/contratos/${event.contrato_id}`}>
      <time className="home-event__date" dateTime={event.fecha_evento}>
        <strong>{eventDate.day}</strong>
        <span>{eventDate.month}</span>
      </time>
      <span className="home-event__content">
        <span className="home-event__title-row">
          <strong>{event.tipo_evento_nombre}</strong>
          <StatusBadge status={event.estado_pago}>
            {getEstadoPagoLabel(event.estado_pago)}
          </StatusBadge>
        </span>
        <span className="home-event__client">{event.cliente_nombre}</span>
        <span className="home-event__meta">
          <span>{event.paquete_nombre || 'Sin paquete asignado'}</span>
          <span>Saldo: {formatCurrency(event.saldo_pendiente)}</span>
        </span>
      </span>
      <ChevronRight aria-hidden="true" size={19} />
    </Link>
  )
}

function PendingItem({ item }) {
  return (
    <Link className="home-pending" to={item.enlace || '/inicio'}>
      <span className={`home-pending__icon home-pending__icon--${item.prioridad}`} aria-hidden="true">
        <CircleAlert size={19} />
      </span>
      <span className="home-pending__content">
        <span className="home-pending__title-row">
          <strong>{item.titulo}</strong>
          <span className={`priority-badge priority-badge--${item.prioridad}`}>
            {priorityLabels[item.prioridad] || item.prioridad}
          </span>
        </span>
        <span>{item.descripcion}</span>
        <small>{item.cantidad} por revisar</small>
      </span>
      <ChevronRight aria-hidden="true" size={19} />
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
    return () => window.clearTimeout(timeoutId)
  }, [loadSummary])

  const kpis = summary?.kpis ?? []
  const events = summary?.eventos_proximos ?? []
  const pending = summary?.pendientes_importantes ?? []
  const pulse = summary?.resumen_operativo ?? {}
  const totalUpcomingEvents =
    kpis.find((kpi) => kpi.key === 'eventos_proximos')?.value ?? events.length
  const hasMoreUpcomingEvents = Number(totalUpcomingEvents) > events.length
  const upcomingContractsPath = summary?.fecha_referencia
    ? `/contratos?estado_contrato=confirmado&desde=${summary.fecha_referencia}`
    : '/contratos'
  const headerDate = formatLongDate(summary?.fecha_referencia ?? new Date())
  const eventsToday = Number(pulse.eventos_hoy ?? 0)
  const eventsNextWeek = Number(pulse.eventos_proximos_7_dias ?? 0)
  const attentionAreas = Number(pulse.frentes_con_atencion ?? pending.length)

  return (
    <div className="page-stack page-stack--dashboard">
      <DashboardHero
        actions={
          <>
            <Link className="button button--primary" to="/cotizaciones/nueva">
              <Plus aria-hidden="true" size={18} />
              <span>Nueva cotización</span>
            </Link>
            <Link className="button button--secondary" to="/contratos/nuevo">
              <BriefcaseBusiness aria-hidden="true" size={18} />
              <span>Nuevo contrato</span>
            </Link>
            <Button
              icon={RefreshCw}
              isLoading={isLoading && Boolean(summary)}
              loadingLabel="Actualizando…"
              onClick={loadSummary}
              variant="ghost"
            >
              Actualizar
            </Button>
          </>
        }
        description={`${headerDate}. Revisa la agenda, atiende pendientes y continúa con las acciones más frecuentes.`}
        eyebrow="Rancho Flor María · Operación"
        icon={Sparkles}
        title="Lo importante de hoy"
      >
        <div className="operational-pulse" aria-live="polite">
          <span className="operational-pulse__label">
            <CalendarCheck2 aria-hidden="true" size={17} />
            Agenda inmediata
          </span>
          <strong>
            {isLoading && !summary
              ? 'Preparando tu resumen…'
              : eventsToday === 1
                ? '1 evento confirmado hoy'
                : `${eventsToday} eventos confirmados hoy`}
          </strong>
          <p>
            {eventsNextWeek === 1
              ? '1 evento programado en los próximos 7 días.'
              : `${eventsNextWeek} eventos programados en los próximos 7 días.`}
          </p>
          <span className={`operational-pulse__attention ${attentionAreas ? 'is-active' : ''}`}>
            {attentionAreas ? <CircleAlert aria-hidden="true" size={16} /> : <BadgeCheck aria-hidden="true" size={16} />}
            {attentionAreas === 1
              ? '1 frente requiere atención'
              : attentionAreas
                ? `${attentionAreas} frentes requieren atención`
                : 'Sin frentes críticos pendientes'}
          </span>
        </div>
      </DashboardHero>

      <ErrorMessage>{pageError}</ErrorMessage>

      {isLoading && !summary ? (
        <Card className="dashboard-loading-card">
          <DashboardSkeleton label="Cargando resumen operativo" variant="home" />
        </Card>
      ) : null}

      {!isLoading && !summary && !pageError ? (
        <Card>
          <EmptyState
            action={
              <Button icon={RefreshCw} onClick={loadSummary} variant="secondary">
                Intentar nuevamente
              </Button>
            }
            description="No hay información operativa disponible para mostrar."
            title="Sin resumen administrativo"
          />
        </Card>
      ) : null}

      {summary ? (
        <div className={`dashboard-content ${isLoading ? 'dashboard-content--refreshing' : ''}`} aria-busy={isLoading}>
          <section aria-labelledby="resumen-operativo-title" className="dashboard-section">
            <DashboardSectionHeader
              eyebrow="Pulso comercial"
              subtitle="Indicadores operativos; no incluyen cálculos de rentabilidad."
              title="Resumen operativo"
              titleId="resumen-operativo-title"
            />
            <div className="metric-grid metric-grid--home">
              {kpis.map((kpi) => {
                const config = kpiConfig[kpi.key] ?? {}
                return (
                  <MetricCard
                    detail={kpi.detail}
                    icon={config.icon}
                    key={kpi.key}
                    label={kpi.label}
                    tone={config.tone}
                    value={kpi.value}
                  />
                )
              })}
            </div>
          </section>

          <section aria-labelledby="acciones-rapidas-title" className="dashboard-section">
            <DashboardSectionHeader
              eyebrow="Atajos"
              subtitle="Acciones frecuentes para continuar sin recorrer el menú."
              title="¿Qué necesitas hacer?"
              titleId="acciones-rapidas-title"
            />
            <div className="quick-actions">
              {quickActions.map((action) => (
                <QuickAction action={action} key={action.path} />
              ))}
            </div>
          </section>

          <div className="home-workspace-grid">
            <Card className="home-panel">
              <DashboardSectionHeader
                action={
                  events.length ? (
                    <Link className="detail-link" to={upcomingContractsPath}>
                      Ver agenda completa <ArrowRight aria-hidden="true" size={16} />
                    </Link>
                  ) : null
                }
                eyebrow="Agenda"
                subtitle="Contratos confirmados ordenados por la fecha más cercana."
                title="Próximos eventos"
              />
              {events.length ? (
                <>
                  <div className="home-event-list">
                    {events.map((event) => (
                      <UpcomingEventItem event={event} key={event.id} />
                    ))}
                  </div>
                  {hasMoreUpcomingEvents ? (
                    <Link className="detail-link detail-link--footer" to={upcomingContractsPath}>
                      Ver los {totalUpcomingEvents} eventos próximos
                    </Link>
                  ) : null}
                </>
              ) : (
                <EmptyState
                  action={
                    <Link className="button button--secondary" to="/contratos/nuevo">
                      Registrar contrato
                    </Link>
                  }
                  description="No hay contratos confirmados con fecha futura."
                  icon={CalendarDays}
                  title="La agenda está libre"
                />
              )}
            </Card>

            <Card className="home-panel home-panel--priority">
              <DashboardSectionHeader
                eyebrow="Prioridades"
                subtitle="Frentes ordenados por la atención que requieren."
                title="Pendientes relevantes"
              />
              {pending.length ? (
                <div className="home-pending-list">
                  {pending.map((item) => (
                    <PendingItem item={item} key={item.tipo} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="No se detectaron pendientes importantes con los datos actuales."
                  icon={BadgeCheck}
                  title="Todo al día"
                />
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
