import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterX, RefreshCw, Search } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Input } from '../../components/ui/Input'
import { KpiCard } from '../../components/ui/KpiCard'
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
  return `${getMonthLabel(periodo.mes)} ${periodo.anio}`
}

function formatKpiValue(kpi) {
  if (kpi.format === 'currency') return formatCurrency(kpi.value)
  if (kpi.format === 'percent') return formatPercent(kpi.value)
  return kpi.value
}

function formatDelta(value, format = 'currency') {
  const numericValue = Number(value)
  const formatted = format === 'percent' ? formatPercent(value) : formatCurrency(value)
  if (Number.isNaN(numericValue) || numericValue === 0) return formatted
  return numericValue > 0 ? `+${formatted}` : formatted
}

function formatVariation(variation) {
  if (!variation?.porcentaje) return 'Sin base anterior'
  const numericValue = Number(variation.porcentaje)
  if (Number.isNaN(numericValue) || numericValue === 0) return '0.00%'
  return numericValue > 0 ? `+${formatPercent(variation.porcentaje)}` : formatPercent(variation.porcentaje)
}

function PaymentBadge({ value }) {
  return (
    <span className={`status-badge ${paymentClassNames[value] || 'status-badge--neutral'}`}>
      {paymentLabels[value] || value}
    </span>
  )
}

function ComparisonPanel({ comparison }) {
  const items = [
    {
      key: 'ingresos_mes',
      label: 'Ingresos',
      current: comparison?.metricas?.ingresos_mes,
      variation: comparison?.variaciones?.ingresos_mes,
      format: 'currency',
    },
    {
      key: 'utilidad_neta',
      label: 'Utilidad neta',
      current: comparison?.metricas?.utilidad_neta,
      variation: comparison?.variaciones?.utilidad_neta,
      format: 'currency',
    },
    {
      key: 'margen_neto',
      label: 'Margen neto',
      current: comparison?.metricas?.margen_neto,
      variation: comparison?.variaciones?.margen_neto,
      format: 'percent',
    },
  ]

  return (
    <Card>
      <div className="detail-section">
        <div className="detail-section__header">
          <div>
            <h2>Comparacion con mes anterior</h2>
            <p className="muted-text">{getPeriodLabel(comparison?.periodo)}</p>
          </div>
        </div>
        <div className="comparison-list">
          {items.map((item) => (
            <div className="comparison-item" key={item.key}>
              <span>{item.label}</span>
              <strong>{item.format === 'percent' ? formatPercent(item.current) : formatCurrency(item.current)}</strong>
              <small>
                {formatDelta(item.variation?.delta, item.format)} - {formatVariation(item.variation)}
              </small>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function PaymentStatusPanel({ estadoPagos }) {
  const estados = estadoPagos?.estados ?? []

  return (
    <Card>
      <div className="detail-section">
        <div className="detail-section__header">
          <div>
            <h2>Estado de pagos</h2>
            <p className="muted-text">
              {estadoPagos?.total_contratos ?? 0} contrato(s) confirmados en el periodo.
            </p>
          </div>
        </div>
        <div className="payment-summary">
          <div>
            <span>Valor total</span>
            <strong>{formatCurrency(estadoPagos?.valor_total)}</strong>
          </div>
          <div>
            <span>Abonado</span>
            <strong>{formatCurrency(estadoPagos?.monto_abonado)}</strong>
          </div>
          <div>
            <span>Saldo pendiente</span>
            <strong>{formatCurrency(estadoPagos?.saldo_pendiente)}</strong>
          </div>
        </div>
        <div className="payment-status-list">
          {estados.map((estado) => (
            <article className="payment-status-item" key={estado.key}>
              <PaymentBadge value={estado.key} />
              <strong>{estado.cantidad}</strong>
              <span>{formatCurrency(estado.saldo_pendiente)} pendiente</span>
            </article>
          ))}
        </div>
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

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
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

  const kpis = summary?.kpis ?? []
  const events = summary?.rentabilidad_eventos ?? []

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Button disabled={isLoading} icon={RefreshCw} onClick={loadDashboard} variant="secondary">
            Actualizar
          </Button>
        }
        description="Analisis de rentabilidad calculado desde backend."
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
            <Button icon={Search} type="submit">
              Filtrar
            </Button>
            <Button icon={FilterX} onClick={handleClearFilters} variant="secondary">
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
          <section className="kpi-grid" aria-label="Indicadores financieros">
            {kpis.map((kpi) => (
              <KpiCard
                detail={kpi.detail}
                key={kpi.key}
                label={kpi.label}
                value={formatKpiValue(kpi)}
              />
            ))}
          </section>

          <div className="dashboard-grid">
            <ComparisonPanel comparison={summary.comparacion_mes_anterior} />
            <PaymentStatusPanel estadoPagos={summary.estado_pagos} />
          </div>

          <InterpretationPanel interpretation={summary.interpretacion} />

          <Card>
            <div className="detail-section">
              <div className="detail-section__header">
                <div>
                  <h2>Rentabilidad por evento</h2>
                  <p className="muted-text">
                    Contratos confirmados de {getPeriodLabel(summary.periodo)}. Los cancelados no se incluyen.
                  </p>
                </div>
              </div>
              <DataTable
                columns={columns}
                emptyMessage="No hay contratos confirmados para calcular rentabilidad en este periodo."
                mobileTitle={(row) => `Contrato #${row.contrato_id}`}
                rows={events}
              />
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}
