import { useCallback, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileBarChart,
  Minus,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  WalletCards,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DashboardHero } from '../../components/ui/DashboardHero'
import { DashboardSectionHeader } from '../../components/ui/DashboardSectionHeader'
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Input } from '../../components/ui/Input'
import { MetricCard } from '../../components/ui/MetricCard'
import { Select } from '../../components/ui/Select'
import { dashboardFinancieroService } from '../../services/resourceService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters'

const currentDate = new Date()
const currentMonth = String(currentDate.getMonth() + 1)
const currentYear = String(currentDate.getFullYear())

const monthOptions = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

const initialFilters = {
  mes: currentMonth,
  anio: currentYear,
}

const paymentLabels = {
  pendiente: 'Pendiente',
  abonado: 'Abonado',
  pagado: 'Pagado',
}

const paymentClassNames = {
  pendiente: 'status-badge--warning',
  abonado: 'status-badge--notice',
  pagado: 'status-badge--success',
}

const chartColors = {
  ingresos_mes: '#236447',
  costos_directos_mes: '#bd8731',
  gastos_fijos_mes: '#7b8580',
  utilidad_neta: '#3e765e',
  utilidad_bruta: '#557390',
  anterior: '#aab1ad',
  actual: '#236447',
}

const kpiVisuals = {
  ingresos_mes: { icon: CircleDollarSign, tone: 'forest' },
  costos_directos_mes: { icon: Receipt, tone: 'gold' },
  utilidad_bruta: { icon: ChartNoAxesCombined, tone: 'blue' },
  gastos_fijos_mes: { icon: WalletCards, tone: 'slate' },
  utilidad_neta: { icon: Sparkles, tone: 'forest' },
  ticket_promedio: { icon: BadgeDollarSign, tone: 'sage' },
}

function buildQueryParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== null && value !== undefined && value !== '',
    ),
  )
}

function getMonthLabel(value) {
  return monthOptions.find((month) => month.value === String(value))?.label ?? value
}

function getPeriodLabel(periodo) {
  if (!periodo) return 'Periodo no disponible'
  return periodo.label ?? `${getMonthLabel(periodo.mes)} ${periodo.anio}`
}

function shiftPeriod(filters, delta) {
  const totalMonths = Number(filters.anio) * 12 + Number(filters.mes) - 1 + delta
  const nextYear = Math.floor(totalMonths / 12)
  const nextMonth = (totalMonths % 12) + 1
  return { mes: String(nextMonth), anio: String(nextYear) }
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function hasAnyValue(rows, keys) {
  return rows?.some((row) => keys.some((key) => toNumber(row[key]) !== 0))
}

function compactCurrency(value) {
  return new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: 0,
    notation: Math.abs(Number(value)) >= 10000 ? 'compact' : 'standard',
    style: 'currency',
    currency: 'USD',
  }).format(Number(value) || 0)
}

function formatChartValue(value, format = 'currency') {
  if (format === 'percent') return formatPercent(value)
  return formatCurrency(value)
}

function formatDeltaText(comparison, previousPeriod, format = 'currency') {
  if (!comparison?.tiene_comparacion) return ''
  const delta = toNumber(comparison.delta)
  if (delta === 0) return `Sin diferencia frente a ${getPeriodLabel(previousPeriod)}`
  const label = delta > 0 ? 'más' : 'menos'
  return `${formatChartValue(Math.abs(delta), format)} ${label} que ${getPeriodLabel(previousPeriod)}`
}

function formatVariationText(comparison) {
  if (!comparison?.tiene_comparacion) return 'Sin datos suficientes para comparar'
  if (comparison.direccion === 'sin_variacion') return 'Sin variación frente al mes anterior'
  if (comparison.porcentaje === null || comparison.porcentaje === undefined) {
    return 'Variación porcentual no calculable'
  }

  return `${formatPercent(Math.abs(toNumber(comparison.porcentaje)))} frente al mes anterior`
}

function getTrendClass(kpi) {
  const direction = kpi.comparison?.direccion
  if (!kpi.comparison?.tiene_comparacion || direction === 'sin_variacion') {
    return 'metric-trend--neutral'
  }
  if (['costos_directos_mes', 'gastos_fijos_mes'].includes(kpi.key)) {
    return 'metric-trend--context'
  }
  return direction === 'sube' ? 'metric-trend--positive' : 'metric-trend--negative'
}

function TrendIcon({ comparison }) {
  if (!comparison?.tiene_comparacion || comparison.direccion === 'sin_variacion') {
    return <Minus aria-hidden="true" size={16} />
  }
  if (comparison.direccion === 'sube') {
    return <ArrowUpRight aria-hidden="true" size={16} />
  }
  return <ArrowDownRight aria-hidden="true" size={16} />
}

function PaymentBadge({ value }) {
  return (
    <span className={`status-badge ${paymentClassNames[value] || 'status-badge--neutral'}`}>
      {paymentLabels[value] || value}
    </span>
  )
}

function FinancialKpiCard({ kpi, previousPeriod }) {
  const visual = kpiVisuals[kpi.key] ?? {}
  const value = kpi.format === 'percent' ? formatPercent(kpi.value) : formatCurrency(kpi.value)
  const deltaText = formatDeltaText(kpi.comparison, previousPeriod, kpi.format)

  return (
    <MetricCard
      className={kpi.featured ? 'metric-card--featured' : ''}
      detail={kpi.detail}
      footer={
        <div className={`metric-trend ${getTrendClass(kpi)}`}>
          <span>
            <TrendIcon comparison={kpi.comparison} />
            {formatVariationText(kpi.comparison)}
          </span>
          {deltaText ? <small>{deltaText}</small> : null}
        </div>
      }
      icon={visual.icon}
      label={kpi.label}
      tone={visual.tone}
      value={value}
    />
  )
}

function DashboardTooltip({ active, label, payload }) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {formatChartValue(item.value, item.payload?.format)}
        </span>
      ))}
    </div>
  )
}

function ChartCard({ accessibleSummary, children, emptyDescription, hasData, subtitle, title }) {
  const titleId = useId()

  return (
    <Card aria-labelledby={titleId} className="chart-card">
      <DashboardSectionHeader subtitle={subtitle} title={title} titleId={titleId} />
      {hasData ? (
        <>
          {accessibleSummary ? <p className="sr-only">{accessibleSummary}</p> : null}
          <div aria-hidden="true" className="chart-shell">
            {children}
          </div>
        </>
      ) : (
        <EmptyState description={emptyDescription} title="Sin datos suficientes" />
      )}
    </Card>
  )
}

function EvolutionChart({ rows }) {
  const data = (rows ?? []).map((row) => ({
    label: row.label,
    ingresos_mes: toNumber(row.ingresos_mes),
    costos_directos_mes: toNumber(row.costos_directos_mes),
    gastos_fijos_mes: toNumber(row.gastos_fijos_mes),
    utilidad_neta: toNumber(row.utilidad_neta),
  }))
  const accessibleSummary = data
    .map(
      (row) =>
        `${row.label}: ingresos ${formatCurrency(row.ingresos_mes)}, costos directos ${formatCurrency(row.costos_directos_mes)}, gastos fijos ${formatCurrency(row.gastos_fijos_mes)} y utilidad neta ${formatCurrency(row.utilidad_neta)}.`,
    )
    .join(' ')

  return (
    <ChartCard
      accessibleSummary={accessibleSummary}
      emptyDescription="Aún no hay contratos confirmados ni registros financieros suficientes para mostrar la evolución."
      hasData={hasAnyValue(data, [
        'ingresos_mes',
        'costos_directos_mes',
        'gastos_fijos_mes',
        'utilidad_neta',
      ])}
      subtitle="Seis meses de ingresos, costos, gastos y utilidad neta."
      title="Evolución del negocio"
    >
      <ResponsiveContainer height={310} width="100%">
        <LineChart data={data} margin={{ left: 6, right: 10, top: 8 }}>
          <CartesianGrid stroke="#e8e4db" vertical={false} />
          <XAxis dataKey="label" tickLine={false} />
          <YAxis tickFormatter={compactCurrency} tickLine={false} width={72} />
          <Tooltip content={<DashboardTooltip />} />
          <Legend />
          <Line dataKey="ingresos_mes" dot={false} name="Ingresos" stroke={chartColors.ingresos_mes} strokeWidth={3} type="monotone" />
          <Line dataKey="costos_directos_mes" dot={false} name="Costos directos" stroke={chartColors.costos_directos_mes} strokeWidth={2} type="monotone" />
          <Line dataKey="gastos_fijos_mes" dot={false} name="Gastos fijos" stroke={chartColors.gastos_fijos_mes} strokeWidth={2} type="monotone" />
          <Line dataKey="utilidad_neta" dot={false} name="Utilidad neta" stroke={chartColors.utilidad_neta} strokeWidth={3} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function CurrentVsPreviousChart({ comparison }) {
  const data = (comparison?.categorias ?? []).map((item) => ({
    label: item.label,
    actual: toNumber(item.actual),
    anterior: toNumber(item.anterior),
  }))
  const accessibleSummary = data
    .map(
      (row) =>
        `${row.label}: periodo actual ${formatCurrency(row.actual)} y anterior ${formatCurrency(row.anterior)}.`,
    )
    .join(' ')

  return (
    <ChartCard
      accessibleSummary={accessibleSummary}
      emptyDescription={comparison?.mensaje_vacio ?? 'No hay suficiente información para comparar con el mes anterior.'}
      hasData={Boolean(comparison?.tiene_comparacion) || hasAnyValue(data, ['actual', 'anterior'])}
      subtitle={`${getPeriodLabel(comparison?.periodo_actual)} frente a ${getPeriodLabel(comparison?.periodo_anterior)}.`}
      title="Periodo actual vs anterior"
    >
      <ResponsiveContainer height={310} width="100%">
        <BarChart data={data} margin={{ left: 6, right: 10, top: 8 }}>
          <CartesianGrid stroke="#e8e4db" vertical={false} />
          <XAxis dataKey="label" tickLine={false} />
          <YAxis tickFormatter={compactCurrency} tickLine={false} width={72} />
          <Tooltip content={<DashboardTooltip />} />
          <Legend />
          <Bar dataKey="actual" fill={chartColors.actual} name="Periodo actual" radius={[6, 6, 0, 0]} />
          <Bar dataKey="anterior" fill={chartColors.anterior} name="Periodo anterior" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function ProfitabilityChart({ emptyDescription, rows, title }) {
  const data = (rows ?? []).slice(0, 8).map((row) => ({
    label: row.nombre,
    ingresos: toNumber(row.ingresos),
    utilidad: toNumber(row.utilidad_bruta),
    margen: toNumber(row.margen_ponderado),
    format: 'currency',
  }))
  const accessibleSummary = data
    .map(
      (row) =>
        `${row.label}: ingresos ${formatCurrency(row.ingresos)}, utilidad ${formatCurrency(row.utilidad)} y margen ${formatPercent(row.margen)}.`,
    )
    .join(' ')

  return (
    <ChartCard
      accessibleSummary={accessibleSummary}
      emptyDescription={emptyDescription}
      hasData={Boolean(data.length)}
      subtitle="Ordenado por utilidad; compara ingresos y utilidad bruta."
      title={title}
    >
      <ResponsiveContainer height={330} width="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 22, right: 10, top: 8 }}>
          <CartesianGrid horizontal={false} stroke="#e8e4db" />
          <XAxis tickFormatter={compactCurrency} tickLine={false} type="number" />
          <YAxis dataKey="label" tickLine={false} type="category" width={112} />
          <Tooltip content={<DashboardTooltip />} />
          <Legend />
          <Bar dataKey="ingresos" fill={chartColors.ingresos_mes} name="Ingresos" radius={[0, 6, 6, 0]} />
          <Bar dataKey="utilidad" fill={chartColors.utilidad_bruta} name="Utilidad" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function InterpretationPanel({ interpretation }) {
  if (!interpretation) return null

  return (
    <Card className={`financial-insight financial-insight--${interpretation.nivel}`}>
      <span className="financial-insight__icon" aria-hidden="true">
        <Sparkles size={21} />
      </span>
      <div>
        <span className="financial-insight__eyebrow">Lectura clara del periodo</span>
        <strong>{interpretation.titulo}</strong>
        <p>{interpretation.detalle}</p>
      </div>
      {interpretation.puntos?.length ? (
        <ul className="financial-insight__points">
          {interpretation.puntos.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  )
}

function PaymentStatusPanel({ estadoPagos }) {
  const estados = estadoPagos?.estados ?? []
  const cancelados = estadoPagos?.cancelados
  const confirmedContracts = Number(estadoPagos?.total_contratos ?? 0)

  return (
    <Card className="payment-panel">
      <DashboardSectionHeader
        action={
          <Link className="detail-link" to="/contratos?estado_pago=pendiente">
            Gestionar cobros <ArrowRight aria-hidden="true" size={16} />
          </Link>
        }
        eyebrow="Cobranza"
        subtitle="Los cancelados se muestran solo como control y no suman al saldo principal."
        title="Estado de pagos"
      />

      <div className="payment-summary-card">
        <span>Saldo pendiente por cobrar</span>
        <strong>{formatCurrency(estadoPagos?.saldo_pendiente)}</strong>
        <small>
          {confirmedContracts}{' '}
          {confirmedContracts === 1 ? 'contrato confirmado' : 'contratos confirmados'} en el periodo
        </small>
      </div>

      <div className="payment-states" aria-label="Contratos por estado de pago">
        {estados.map((estado) => (
          <article className="payment-state" key={estado.key}>
            <PaymentBadge value={estado.key} />
            <strong>{estado.cantidad}</strong>
            <span>{formatCurrency(estado.saldo_pendiente)} por cobrar</span>
          </article>
        ))}
        <article className="payment-state payment-state--cancelled">
          <span className="status-badge status-badge--neutral-dark">Cancelados</span>
          <strong>{cancelados?.cantidad ?? 0}</strong>
          <span>Excluidos de las métricas</span>
        </article>
      </div>
    </Card>
  )
}

function PendingFinancials({ pendientes }) {
  const rows = pendientes?.contratos ?? []
  const columns = [
    {
      key: 'contrato_id',
      header: 'Contrato',
      render: (row) => (
        <Link className="text-link" to={`/contratos/${row.contrato_id}`}>
          #{row.contrato_id}
        </Link>
      ),
    },
    {
      key: 'cliente_nombre',
      header: 'Cliente / evento',
      render: (row) => (
        <div className="stacked-cell">
          <strong>{row.cliente_nombre}</strong>
          <span>{row.tipo_evento_nombre}</span>
        </div>
      ),
    },
    { key: 'fecha_evento', header: 'Fecha', render: (row) => formatDate(row.fecha_evento) },
    { key: 'valor_final', header: 'Valor', render: (row) => formatCurrency(row.valor_final) },
    {
      key: 'saldo_pendiente',
      header: 'Saldo pendiente',
      render: (row) => formatCurrency(row.saldo_pendiente),
    },
    { key: 'estado_pago', header: 'Pago', render: (row) => <PaymentBadge value={row.estado_pago} /> },
  ]

  return (
    <Card className="pending-financials">
      <DashboardSectionHeader
        action={
          <div className="pending-total">
            <span>Total pendiente</span>
            <strong>{formatCurrency(pendientes?.monto_total_pendiente)}</strong>
          </div>
        }
        eyebrow="Seguimiento"
        subtitle="Contratos confirmados del periodo que todavía tienen valores por cobrar."
        title="Pendientes financieros"
      />
      <DataTable
        caption="Contratos confirmados con saldo pendiente"
        columns={columns}
        emptyMessage={pendientes?.mensaje_vacio ?? 'No hay contratos con saldo pendiente en este periodo.'}
        mobileTitle={(row) => `Contrato #${row.contrato_id}`}
        rows={rows}
      />
    </Card>
  )
}

function EventProfitabilityTable({ events, periodLabel }) {
  const columns = [
    {
      key: 'contrato_id',
      header: 'Contrato',
      render: (row) => (
        <Link className="text-link" to={`/contratos/${row.contrato_id}`}>
          #{row.contrato_id}
        </Link>
      ),
    },
    {
      key: 'cliente_nombre',
      header: 'Cliente / evento',
      render: (row) => (
        <div className="stacked-cell">
          <strong>{row.cliente_nombre}</strong>
          <span>{row.tipo_evento_nombre}</span>
        </div>
      ),
    },
    { key: 'paquete_nombre', header: 'Paquete' },
    { key: 'fecha_evento', header: 'Fecha', render: (row) => formatDate(row.fecha_evento) },
    { key: 'valor_final', header: 'Ingresos', render: (row) => formatCurrency(row.valor_final) },
    { key: 'costos_directos', header: 'Costos', render: (row) => formatCurrency(row.costos_directos) },
    { key: 'utilidad_bruta', header: 'Utilidad', render: (row) => formatCurrency(row.utilidad_bruta) },
    { key: 'margen_bruto', header: 'Margen', render: (row) => formatPercent(row.margen_bruto) },
    { key: 'estado_pago', header: 'Pago', render: (row) => <PaymentBadge value={row.estado_pago} /> },
  ]

  return (
    <Card>
      <DashboardSectionHeader
        action={
          <Link className="detail-link" to="/reportes">
            Ver reportes <ArrowRight aria-hidden="true" size={16} />
          </Link>
        }
        eyebrow="Detalle verificable"
        subtitle={`Contratos confirmados de ${periodLabel}, ordenados por utilidad. Los cancelados están excluidos.`}
        title="Rentabilidad por evento"
      />
      <DataTable
        caption={`Rentabilidad por evento de ${periodLabel}`}
        columns={columns}
        emptyMessage="Aún no hay contratos confirmados para este mes."
        mobileTitle={(row) => `Contrato #${row.contrato_id}`}
        rows={events}
      />
    </Card>
  )
}

export function DashboardFinancieroPage() {
  const [summary, setSummary] = useState(null)
  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [pageError, setPageError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const data = await dashboardFinancieroService.resumen(buildQueryParams(appliedFilters))
      setSummary(data)
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [appliedFilters])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadDashboard, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadDashboard])

  const previousPeriod = summary?.comparacion_mes_anterior?.periodo
  const kpis = summary?.kpis ?? []
  const events = summary?.rentabilidad_eventos ?? []
  const periodLabel = getPeriodLabel(summary?.periodo)
  const hasPendingFilters =
    filters.mes !== appliedFilters.mes || filters.anio !== appliedFilters.anio

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const handleApplyFilters = (event) => {
    event.preventDefault()
    setAppliedFilters(filters)
  }

  const applyPeriod = (nextFilters) => {
    setFilters(nextFilters)
    setAppliedFilters(nextFilters)
  }

  const handlePeriodStep = (delta) => {
    applyPeriod(shiftPeriod(appliedFilters, delta))
  }

  const handleCurrentPeriod = () => {
    applyPeriod(initialFilters)
  }

  return (
    <div className="page-stack page-stack--dashboard">
      <DashboardHero
        actions={
          <>
            <Link className="button button--secondary" to="/reportes">
              <FileBarChart aria-hidden="true" size={18} />
              <span>Ver reportes</span>
            </Link>
            <Button
              icon={RefreshCw}
              isLoading={isLoading && Boolean(summary)}
              loadingLabel="Actualizando…"
              onClick={loadDashboard}
              variant="ghost"
            >
              Actualizar
            </Button>
          </>
        }
        description="Analiza ingresos confirmados, costos, utilidad, cobranza y rentabilidad sin mezclar cotizaciones ni contratos cancelados."
        eyebrow={`Finanzas · ${periodLabel}`}
        icon={BarChart3}
        title="Rentabilidad del negocio"
      >
        <div className={`financial-health financial-health--${summary?.interpretacion?.nivel ?? 'neutral'}`}>
          <span>Lectura del periodo</span>
          <strong>{summary?.interpretacion?.titulo ?? 'Preparando el análisis…'}</strong>
          <p>
            {summary?.interpretacion?.detalle ??
              'Los indicadores se interpretarán cuando termine la carga de datos.'}
          </p>
        </div>
      </DashboardHero>

      <Card className="period-toolbar">
        <div className="period-toolbar__intro">
          <span>Periodo de análisis</span>
          <strong>{getMonthLabel(filters.mes)} {filters.anio}</strong>
          <small>{hasPendingFilters ? 'Hay cambios pendientes de aplicar.' : 'Datos del periodo aplicado.'}</small>
        </div>
        <div className="period-toolbar__navigation" aria-label="Cambiar periodo rápidamente">
          <Button aria-label="Ver mes anterior" icon={ChevronLeft} onClick={() => handlePeriodStep(-1)} variant="ghost">
            Anterior
          </Button>
          <Button icon={CalendarDays} onClick={handleCurrentPeriod} variant="secondary">
            Mes actual
          </Button>
          <Button aria-label="Ver mes siguiente" icon={ChevronRight} onClick={() => handlePeriodStep(1)} variant="ghost">
            Siguiente
          </Button>
        </div>
        <form className="period-toolbar__form" onSubmit={handleApplyFilters}>
          <Select id="dashboard-mes" label="Mes" name="mes" onChange={handleFilterChange} value={filters.mes}>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </Select>
          <Input id="dashboard-anio" label="Año" min="2000" name="anio" onChange={handleFilterChange} required type="number" value={filters.anio} />
          <Button disabled={!hasPendingFilters || isLoading} icon={Search} type="submit">
            Aplicar periodo
          </Button>
        </form>
      </Card>

      <ErrorMessage>{pageError}</ErrorMessage>

      {isLoading && !summary ? (
        <Card className="dashboard-loading-card">
          <DashboardSkeleton label="Cargando análisis financiero" variant="financial" />
        </Card>
      ) : null}

      {!isLoading && !summary && !pageError ? (
        <Card>
          <EmptyState
            action={
              <Button icon={RefreshCw} onClick={loadDashboard} variant="secondary">
                Intentar nuevamente
              </Button>
            }
            description="No hay información financiera disponible para el periodo."
            title="Sin análisis financiero"
          />
        </Card>
      ) : null}

      {summary ? (
        <div className={`dashboard-content ${isLoading ? 'dashboard-content--refreshing' : ''}`} aria-busy={isLoading}>
          <section className="dashboard-section">
            <DashboardSectionHeader
              eyebrow="Resultado del periodo"
              subtitle="Todos los valores provienen del backend y usan únicamente contratos confirmados."
              title="Indicadores financieros"
            />
            <div className="metric-grid metric-grid--financial">
              {kpis.map((kpi) => (
                <FinancialKpiCard key={kpi.key} kpi={kpi} previousPeriod={previousPeriod} />
              ))}
            </div>
          </section>

          <InterpretationPanel interpretation={summary.interpretacion} />

          <section className="dashboard-section">
            <DashboardSectionHeader
              eyebrow="Tendencia"
              subtitle="Observa el comportamiento en el tiempo y la variación respecto al periodo anterior."
              title="Evolución y comparación"
            />
            <div className="analytics-grid">
              <EvolutionChart rows={summary.evolucion_mensual} />
              <CurrentVsPreviousChart comparison={summary.comparativo_mes_anterior} />
            </div>
          </section>

          <section className="dashboard-section">
            <DashboardSectionHeader
              eyebrow="Composición de la rentabilidad"
              subtitle="Identifica qué servicios y tipos de evento aportan más ingresos y utilidad."
              title="¿Qué está generando resultados?"
            />
            <div className="analytics-grid">
              <ProfitabilityChart
                emptyDescription="Sin paquetes con contratos confirmados en este periodo."
                rows={summary.rentabilidad_por_paquete}
                title="Rentabilidad por paquete"
              />
              <ProfitabilityChart
                emptyDescription="Sin tipos de evento con contratos confirmados en este periodo."
                rows={summary.analisis_por_tipo_evento}
                title="Rentabilidad por tipo de evento"
              />
            </div>
          </section>

          <EventProfitabilityTable events={events} periodLabel={periodLabel} />

          <section className="dashboard-section">
            <DashboardSectionHeader
              eyebrow="Liquidez"
              subtitle="Separa el rendimiento del evento del seguimiento de valores por cobrar."
              title="Cobranza y pendientes"
            />
            <div className="collection-grid">
              <PaymentStatusPanel estadoPagos={summary.estado_pagos} />
              <PendingFinancials pendientes={summary.pendientes_financieros} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
