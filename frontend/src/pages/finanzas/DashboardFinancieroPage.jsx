import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  FilterX,
  Minus,
  RefreshCw,
  Search,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
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
  ingresos_mes: '#256d4f',
  costos_directos_mes: '#b98222',
  utilidad_bruta: '#315f8f',
  gastos_fijos_mes: '#6b7771',
  utilidad_neta: '#2f7a58',
  ticket_promedio: '#7a4b93',
  anterior: '#9aa89f',
  actual: '#256d4f',
}

function buildQueryParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )
}

function getMonthLabel(value) {
  return monthOptions.find((month) => month.value === String(value))?.label ?? value
}

function getPeriodLabel(periodo) {
  if (!periodo) return '-'
  return periodo.label ?? `${getMonthLabel(periodo.mes)} ${periodo.anio}`
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
  const label = delta > 0 ? 'mas' : 'menos'
  return `${formatChartValue(Math.abs(delta), format)} ${label} que ${getPeriodLabel(previousPeriod)}`
}

function formatVariationText(comparison) {
  if (!comparison?.tiene_comparacion) return 'Sin datos suficientes para comparar'
  if (comparison.direccion === 'sin_variacion') return 'Sin variacion vs mes anterior'
  if (!comparison.porcentaje) return 'Variacion porcentual no calculable'

  const direction = comparison.direccion === 'sube' ? '↑' : '↓'
  return `${direction} ${formatPercent(Math.abs(toNumber(comparison.porcentaje)))} vs mes anterior`
}

function getTrendClass(kpi) {
  const direction = kpi.comparison?.direccion
  if (!kpi.comparison?.tiene_comparacion || direction === 'sin_variacion') return 'kpi-trend--neutral'
  if (['costos_directos_mes', 'gastos_fijos_mes'].includes(kpi.key)) return 'kpi-trend--context'
  return direction === 'sube' ? 'kpi-trend--positive' : 'kpi-trend--negative'
}

function TrendIcon({ comparison }) {
  if (!comparison?.tiene_comparacion || comparison.direccion === 'sin_variacion') {
    return <Minus aria-hidden="true" size={18} />
  }
  if (comparison.direccion === 'sube') {
    return <ArrowUpRight aria-hidden="true" size={18} />
  }
  return <ArrowDownRight aria-hidden="true" size={18} />
}

function PaymentBadge({ value }) {
  return (
    <span className={`status-badge ${paymentClassNames[value] || 'status-badge--neutral'}`}>
      {paymentLabels[value] || value}
    </span>
  )
}

function FinancialKpiCard({ kpi, previousPeriod }) {
  const trendClass = getTrendClass(kpi)
  const value = kpi.format === 'percent' ? formatPercent(kpi.value) : formatCurrency(kpi.value)

  return (
    <article className={`financial-kpi-card ${kpi.featured ? 'financial-kpi-card--featured' : ''}`}>
      <div className="financial-kpi-card__header">
        <span>{kpi.label}</span>
        <TrendIcon comparison={kpi.comparison} />
      </div>
      <strong>{value}</strong>
      <p>{kpi.detail}</p>
      <div className={`kpi-trend ${trendClass}`}>
        <span>{formatVariationText(kpi.comparison)}</span>
        {formatDeltaText(kpi.comparison, previousPeriod, kpi.format) ? (
          <small>{formatDeltaText(kpi.comparison, previousPeriod, kpi.format)}</small>
        ) : null}
      </div>
    </article>
  )
}

function CommercialCard({ emptyText, item, metric, title }) {
  return (
    <article className="commercial-card">
      <span>{title}</span>
      {item ? (
        <>
          <strong>{item.nombre}</strong>
          <p>{metric === 'contracts' ? `${item.contratos} contrato(s)` : `Margen ponderado: ${formatPercent(item.margen_ponderado)}`}</p>
          {metric === 'profit' ? <small>Utilidad bruta: {formatCurrency(item.utilidad_bruta)}</small> : null}
        </>
      ) : (
        <>
          <strong>Sin datos suficientes</strong>
          <p>{emptyText}</p>
        </>
      )}
    </article>
  )
}

function SectionHeading({ subtitle, title }) {
  return (
    <div className="dashboard-section-heading">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  )
}

function ChartCard({ children, emptyDescription, hasData, subtitle, title }) {
  return (
    <Card className="chart-card">
      <div className="detail-section">
        <div className="detail-section__header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p className="muted-text">{subtitle}</p> : null}
          </div>
        </div>
        {hasData ? <div className="chart-shell">{children}</div> : <EmptyState description={emptyDescription} title="Sin datos suficientes" />}
      </div>
    </Card>
  )
}

function DashboardTooltip({ active, label, payload }) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey}>
          {item.name}: {formatChartValue(item.value, item.payload?.format)}
        </span>
      ))}
    </div>
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

  return (
    <ChartCard
      emptyDescription="Aun no hay contratos confirmados ni registros financieros suficientes para mostrar la evolucion mensual."
      hasData={hasAnyValue(data, ['ingresos_mes', 'costos_directos_mes', 'gastos_fijos_mes', 'utilidad_neta'])}
      subtitle="Ingresos, costos directos, gastos fijos y utilidad neta de los ultimos periodos."
      title="Evolucion mensual del negocio"
    >
      <ResponsiveContainer height={300} width="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#edf1ee" vertical={false} />
          <XAxis dataKey="label" tickLine={false} />
          <YAxis tickFormatter={compactCurrency} tickLine={false} width={72} />
          <Tooltip content={<DashboardTooltip />} />
          <Legend />
          <Bar dataKey="ingresos_mes" fill={chartColors.ingresos_mes} name="Ingresos" radius={[6, 6, 0, 0]} />
          <Bar dataKey="costos_directos_mes" fill={chartColors.costos_directos_mes} name="Costos directos" radius={[6, 6, 0, 0]} />
          <Bar dataKey="gastos_fijos_mes" fill={chartColors.gastos_fijos_mes} name="Gastos fijos" radius={[6, 6, 0, 0]} />
          <Bar dataKey="utilidad_neta" fill={chartColors.utilidad_neta} name="Utilidad neta" radius={[6, 6, 0, 0]} />
        </BarChart>
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

  return (
    <ChartCard
      emptyDescription={comparison?.mensaje_vacio ?? 'No hay suficiente informacion para comparar con el mes anterior.'}
      hasData={Boolean(comparison?.tiene_comparacion) || hasAnyValue(data, ['actual', 'anterior'])}
      subtitle={`${getPeriodLabel(comparison?.periodo_actual)} frente a ${getPeriodLabel(comparison?.periodo_anterior)}.`}
      title="Mes actual vs mes anterior"
    >
      <ResponsiveContainer height={300} width="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#edf1ee" vertical={false} />
          <XAxis dataKey="label" tickLine={false} />
          <YAxis tickFormatter={compactCurrency} tickLine={false} width={72} />
          <Tooltip content={<DashboardTooltip />} />
          <Legend />
          <Bar dataKey="actual" fill={chartColors.actual} name="Mes actual" radius={[6, 6, 0, 0]} />
          <Bar dataKey="anterior" fill={chartColors.anterior} name="Mes anterior" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function PackageProfitabilityChart({ rows }) {
  const data = (rows ?? []).slice(0, 8).map((row) => ({
    label: row.nombre,
    contratos: row.contratos,
    ingresos: toNumber(row.ingresos),
    utilidad: toNumber(row.utilidad_bruta),
    margen: toNumber(row.margen_ponderado),
    format: 'currency',
  }))

  return (
    <ChartCard
      emptyDescription="Sin paquetes con contratos confirmados en este periodo."
      hasData={Boolean(data.length)}
      subtitle="Ordenado por utilidad e ingresos confirmados."
      title="Rentabilidad por paquete"
    >
      <ResponsiveContainer height={320} width="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 18 }}>
          <CartesianGrid stroke="#edf1ee" horizontal={false} />
          <XAxis tickFormatter={compactCurrency} tickLine={false} type="number" />
          <YAxis dataKey="label" tickLine={false} type="category" width={116} />
          <Tooltip content={<DashboardTooltip />} />
          <Legend />
          <Bar dataKey="ingresos" fill={chartColors.ingresos_mes} name="Ingresos" radius={[0, 6, 6, 0]} />
          <Bar dataKey="utilidad" fill={chartColors.utilidad_bruta} name="Utilidad" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function EventTypeChart({ rows }) {
  const data = (rows ?? []).slice(0, 8).map((row) => ({
    label: row.nombre,
    contratos: row.contratos,
    ingresos: toNumber(row.ingresos),
    utilidad: toNumber(row.utilidad_bruta),
    margen: toNumber(row.margen_ponderado),
  }))

  return (
    <ChartCard
      emptyDescription="Sin tipos de evento con contratos confirmados en este periodo."
      hasData={Boolean(data.length)}
      subtitle="Diferencia frecuencia, ingresos, utilidad y margen por tipo de evento."
      title="Analisis por tipo de evento"
    >
      <ResponsiveContainer height={320} width="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#edf1ee" vertical={false} />
          <XAxis dataKey="label" tickLine={false} />
          <YAxis tickFormatter={compactCurrency} tickLine={false} width={72} />
          <Tooltip content={<DashboardTooltip />} />
          <Legend />
          <Bar dataKey="ingresos" fill={chartColors.ingresos_mes} name="Ingresos" radius={[6, 6, 0, 0]} />
          <Bar dataKey="utilidad" fill={chartColors.utilidad_neta} name="Utilidad" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function TopEventsChart({ rows }) {
  const data = (rows ?? []).slice(0, 6).map((row) => ({
    label: `#${row.contrato_id} ${row.cliente_nombre}`,
    utilidad: toNumber(row.utilidad_bruta),
    format: 'currency',
  }))

  return (
    <ChartCard
      emptyDescription="Aun no hay contratos confirmados para identificar eventos rentables."
      hasData={Boolean(data.length)}
      subtitle="Eventos con mayor utilidad bruta del mes."
      title="Top evento mas rentable del mes"
    >
      <ResponsiveContainer height={280} width="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 26 }}>
          <CartesianGrid stroke="#edf1ee" horizontal={false} />
          <XAxis tickFormatter={compactCurrency} tickLine={false} type="number" />
          <YAxis dataKey="label" tickLine={false} type="category" width={138} />
          <Tooltip content={<DashboardTooltip />} />
          <Bar dataKey="utilidad" fill={chartColors.utilidad_neta} name="Utilidad" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function PaymentStatusPanel({ estadoPagos }) {
  const estados = estadoPagos?.estados ?? []
  const cancelados = estadoPagos?.cancelados
  const data = [
    ...estados.map((estado) => ({
      label: estado.label,
      cantidad: estado.cantidad,
    })),
    {
      label: 'Cancelados',
      cantidad: cancelados?.cantidad ?? 0,
    },
  ]

  return (
    <Card className="chart-card">
      <div className="detail-section">
        <div className="detail-section__header">
          <div>
            <h2>Estado de pagos / cobranza</h2>
            <p className="muted-text">Saldo pendiente actual sobre contratos confirmados. Cancelados solo como control.</p>
          </div>
        </div>

        <div className="payment-dashboard-grid">
          <div className="payment-total-card">
            <span>Monto pendiente por cobrar</span>
            <strong>{formatCurrency(estadoPagos?.saldo_pendiente)}</strong>
            <small>{estadoPagos?.total_contratos ?? 0} contrato(s) confirmado(s)</small>
          </div>
          {estados.map((estado) => (
            <article className="payment-state-card" key={estado.key}>
              <PaymentBadge value={estado.key} />
              <strong>{estado.cantidad}</strong>
              <span>{formatCurrency(estado.saldo_pendiente)} pendiente</span>
            </article>
          ))}
          <article className="payment-state-card payment-state-card--cancelled">
            <span className="status-badge status-badge--neutral-dark">Cancelados</span>
            <strong>{cancelados?.cantidad ?? 0}</strong>
            <span>No suman al saldo principal</span>
          </article>
        </div>

        {data.some((item) => item.cantidad > 0) ? (
          <div className="chart-shell chart-shell--short">
            <ResponsiveContainer height={220} width="100%">
              <BarChart data={data}>
                <CartesianGrid stroke="#edf1ee" vertical={false} />
                <XAxis dataKey="label" tickLine={false} />
                <YAxis allowDecimals={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="cantidad" fill={chartColors.actual} name="Contratos" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState description="No hay contratos confirmados ni cancelados en este periodo." title="Sin estado de pagos" />
        )}
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
    {
      key: 'fecha_evento',
      header: 'Fecha',
      render: (row) => formatDate(row.fecha_evento),
    },
    {
      key: 'valor_final',
      header: 'Valor',
      render: (row) => formatCurrency(row.valor_final),
    },
    {
      key: 'saldo_pendiente',
      header: 'Saldo pendiente',
      render: (row) => formatCurrency(row.saldo_pendiente),
    },
    {
      key: 'estado_pago',
      header: 'Pago',
      render: (row) => <PaymentBadge value={row.estado_pago} />,
    },
  ]

  return (
    <Card>
      <div className="detail-section">
        <div className="detail-section__header">
          <div>
            <h2>Pendientes financieros</h2>
            <p className="muted-text">Contratos confirmados con saldo pendiente actual.</p>
          </div>
          <div className="pending-total">
            <span>Total pendiente</span>
            <strong>{formatCurrency(pendientes?.monto_total_pendiente)}</strong>
          </div>
        </div>
        <DataTable
          columns={columns}
          emptyMessage={pendientes?.mensaje_vacio ?? 'No hay contratos confirmados con saldo pendiente en este periodo.'}
          mobileTitle={(row) => `Contrato #${row.contrato_id}`}
          rows={rows}
        />
      </div>
    </Card>
  )
}

function InterpretationPanel({ interpretation }) {
  if (!interpretation) return null

  return (
    <Card>
      <div className={`insight-panel insight-panel--${interpretation.nivel}`}>
        <span>Interpretacion del periodo</span>
        <strong>{interpretation.titulo}</strong>
        <p>{interpretation.detalle}</p>
        {interpretation.puntos?.length ? (
          <ul className="interpretation-list">
            {interpretation.puntos.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
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
  const commercial = summary?.desempeno_comercial ?? {}
  const periodLabel = getPeriodLabel(summary?.periodo)

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    const nextFilters = { ...filters, [name]: value }
    setFilters(nextFilters)

    if (nextFilters.mes && nextFilters.anio && Number(nextFilters.anio) >= 2000) {
      setAppliedFilters(nextFilters)
    }
  }

  const handleApplyFilters = (event) => {
    event.preventDefault()
    setAppliedFilters(filters)
  }

  const handleClearFilters = () => {
    setFilters(initialFilters)
    setAppliedFilters(initialFilters)
  }

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
    {
      key: 'fecha_evento',
      header: 'Fecha',
      render: (row) => formatDate(row.fecha_evento),
    },
    {
      key: 'valor_final',
      header: 'Ingresos',
      render: (row) => formatCurrency(row.valor_final),
    },
    {
      key: 'costos_directos',
      header: 'Costos',
      render: (row) => formatCurrency(row.costos_directos),
    },
    {
      key: 'utilidad_bruta',
      header: 'Utilidad',
      render: (row) => formatCurrency(row.utilidad_bruta),
    },
    {
      key: 'margen_bruto',
      header: 'Margen',
      render: (row) => formatPercent(row.margen_bruto),
    },
    {
      key: 'estado_pago',
      header: 'Pago',
      render: (row) => <PaymentBadge value={row.estado_pago} />,
    },
  ]

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Button disabled={isLoading} icon={RefreshCw} onClick={loadDashboard} variant="secondary">
            Actualizar
          </Button>
        }
        description="Analisis mensual del desempeno comercial y financiero."
        title="Dashboard financiero"
      />

      <Card>
        <form className="filters-grid filters-grid--dashboard" onSubmit={handleApplyFilters}>
          <Select id="dashboard-mes" label="Mes" name="mes" onChange={handleFilterChange} value={filters.mes}>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </Select>
          <Input
            id="dashboard-anio"
            label="Anio"
            min="2000"
            name="anio"
            onChange={handleFilterChange}
            type="number"
            value={filters.anio}
          />
          <div className="filters-actions">
            <Button disabled={isLoading} icon={Search} type="submit">
              Filtrar
            </Button>
            <Button disabled={isLoading} icon={FilterX} onClick={handleClearFilters} variant="secondary">
              Limpiar
            </Button>
          </div>
        </form>
      </Card>

      <ErrorMessage>{pageError}</ErrorMessage>

      {isLoading && !summary ? (
        <Card>
          <LoadingState label="Cargando dashboard financiero" />
        </Card>
      ) : null}

      {!isLoading && !summary && !pageError ? (
        <Card>
          <EmptyState
            description="No hay informacion financiera disponible para el periodo."
            title="Sin dashboard financiero"
          />
        </Card>
      ) : null}

      {summary ? (
        <>
          <SectionHeading
            subtitle={`Periodo seleccionado: ${periodLabel}. Los calculos usan contratos confirmados y costos asociados por fecha del evento.`}
            title="KPIs financieros"
          />
          <section className="financial-kpi-grid" aria-label="Indicadores financieros principales">
            {kpis.map((kpi) => (
              <FinancialKpiCard key={kpi.key} kpi={kpi} previousPeriod={previousPeriod} />
            ))}
          </section>

          <SectionHeading
            subtitle="Lectura comercial basada solo en contratos confirmados del periodo."
            title="Desempeno comercial"
          />
          <section className="commercial-grid" aria-label="Desempeno comercial del periodo">
            <CommercialCard
              emptyText="Sin contratos confirmados para calcular volumen por paquete."
              item={commercial.paquete_mas_vendido}
              metric="contracts"
              title="Paquete mas vendido"
            />
            <CommercialCard
              emptyText="Sin contratos confirmados para calcular margen por paquete."
              item={commercial.paquete_mas_rentable}
              metric="profit"
              title="Paquete mas rentable"
            />
            <CommercialCard
              emptyText="Sin contratos confirmados para calcular frecuencia por tipo de evento."
              item={commercial.tipo_evento_mas_frecuente}
              metric="contracts"
              title="Tipo de evento mas frecuente"
            />
            <CommercialCard
              emptyText="Sin contratos confirmados para calcular margen por tipo de evento."
              item={commercial.tipo_evento_mas_rentable}
              metric="profit"
              title="Tipo de evento mas rentable"
            />
          </section>

          <SectionHeading
            subtitle="Compara el desempeno financiero del periodo actual frente a meses anteriores."
            title="Analisis comparativo del negocio"
          />
          <div className="analytics-grid">
            <EvolutionChart rows={summary.evolucion_mensual} />
            <CurrentVsPreviousChart comparison={summary.comparativo_mes_anterior} />
            <PackageProfitabilityChart rows={summary.rentabilidad_por_paquete} />
            <EventTypeChart rows={summary.analisis_por_tipo_evento} />
            <TopEventsChart rows={summary.top_eventos_rentables} />
            <PaymentStatusPanel estadoPagos={summary.estado_pagos} />
          </div>

          <Card>
            <div className="detail-section">
              <div className="detail-section__header">
                <div>
                  <h2>Tabla de rentabilidad por evento</h2>
                  <p className="muted-text">
                    Contratos confirmados de {periodLabel}. Los cancelados no se incluyen en rentabilidad.
                  </p>
                </div>
              </div>
              <DataTable
                columns={columns}
                emptyMessage="Aun no hay contratos confirmados para este mes."
                mobileTitle={(row) => `Contrato #${row.contrato_id}`}
                rows={events}
              />
            </div>
          </Card>

          <PendingFinancials pendientes={summary.pendientes_financieros} />
          <InterpretationPanel interpretation={summary.interpretacion} />
        </>
      ) : null}
    </div>
  )
}
