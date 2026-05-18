import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  FileText,
  FilterX,
  Package,
  RefreshCw,
  Search,
} from 'lucide-react'
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
import { reportesService } from '../../services/resourceService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters'

const today = new Date()
const currentMonth = String(today.getMonth() + 1)
const currentYear = String(today.getFullYear())
const todayValue = today.toISOString().slice(0, 10)
const firstDayValue = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)

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

const reportOptions = [
  { key: 'comercial', label: 'Comercial', icon: FileText },
  { key: 'financiero', label: 'Financiero', icon: BarChart3 },
  { key: 'eventos', label: 'Eventos', icon: CalendarDays },
  { key: 'paquetes', label: 'Paquetes', icon: Package },
]

const initialRangeFilters = {
  desde: firstDayValue,
  hasta: todayValue,
}

const initialFinancialFilters = {
  mes: currentMonth,
  anio: currentYear,
}

const quoteStatusLabels = {
  nueva: 'Nueva',
  contactada: 'Contactada',
  confirmada: 'Confirmada',
  convertida: 'Convertida',
  descartada: 'Descartada',
}

const contractStatusLabels = {
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
}

const paymentLabels = {
  pendiente: 'Pendiente',
  abonado: 'Abonado',
  pagado: 'Pagado',
}

const statusClasses = {
  nueva: 'status-badge--info',
  contactada: 'status-badge--notice',
  confirmada: 'status-badge--success',
  convertida: 'status-badge--strong-success',
  descartada: 'status-badge--neutral',
  confirmado: 'status-badge--success',
  cancelado: 'status-badge--neutral-dark',
  pendiente: 'status-badge--warning',
  abonado: 'status-badge--notice',
  pagado: 'status-badge--success',
}

function buildQueryParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )
}

function getStatusLabel(value, labels) {
  return labels[value] || value
}

function StatusBadge({ labels, value }) {
  return (
    <span className={`status-badge ${statusClasses[value] || 'status-badge--neutral'}`}>
      {getStatusLabel(value, labels)}
    </span>
  )
}

function formatKpiValue(kpi) {
  if (kpi.format === 'currency') return formatCurrency(kpi.value)
  if (kpi.format === 'percent') return formatPercent(kpi.value)
  return kpi.value
}

function ReportSelector({ activeReport, onChange }) {
  return (
    <div className="report-selector" role="tablist" aria-label="Tipos de reporte">
      {reportOptions.map((option) => (
        <button
          aria-selected={activeReport === option.key}
          className={`report-selector__item ${activeReport === option.key ? 'report-selector__item--active' : ''}`}
          key={option.key}
          onClick={() => onChange(option.key)}
          role="tab"
          type="button"
        >
          <option.icon aria-hidden="true" size={18} />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

function ReportFilters({
  activeReport,
  filters,
  financialFilters,
  isLoading,
  onClear,
  onFilterChange,
  onFinancialFilterChange,
  onSubmit,
}) {
  const isFinancial = activeReport === 'financiero'

  return (
    <Card>
      <form className="filters-grid filters-grid--reports" onSubmit={onSubmit}>
        {isFinancial ? (
          <>
            <Select
              id="reporte-mes"
              label="Mes"
              name="mes"
              onChange={onFinancialFilterChange}
              value={financialFilters.mes}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Select>
            <Input
              id="reporte-anio"
              label="Anio"
              min="2000"
              name="anio"
              onChange={onFinancialFilterChange}
              type="number"
              value={financialFilters.anio}
            />
          </>
        ) : (
          <>
            <Input
              id="reporte-desde"
              label="Desde"
              name="desde"
              onChange={onFilterChange}
              type="date"
              value={filters.desde}
            />
            <Input
              id="reporte-hasta"
              label="Hasta"
              name="hasta"
              onChange={onFilterChange}
              type="date"
              value={filters.hasta}
            />
          </>
        )}
        <div className="filters-actions">
          <Button disabled={isLoading} icon={Search} type="submit">
            Consultar
          </Button>
          <Button disabled={isLoading} icon={FilterX} onClick={onClear} variant="secondary">
            Limpiar
          </Button>
        </div>
      </form>
    </Card>
  )
}

function SummaryCards({ items }) {
  return (
    <section className="kpi-grid" aria-label="Resumen del reporte">
      {items.map((item) => (
        <KpiCard detail={item.detail} key={item.key} label={item.label} value={item.value} />
      ))}
    </section>
  )
}

function BreakdownList({ items, title }) {
  if (!items?.length) return null

  return (
    <Card>
      <div className="detail-section">
        <div className="detail-section__header">
          <h2>{title}</h2>
        </div>
        <div className="report-breakdown">
          {items.map((item) => (
            <article className="report-breakdown__item" key={item.key || item.tipo_evento_nombre}>
              <strong>{item.label || item.tipo_evento_nombre}</strong>
              <span>{item.cantidad ?? item.total} registro(s)</span>
              {item.confirmados !== undefined ? <small>{item.confirmados} confirmado(s)</small> : null}
            </article>
          ))}
        </div>
      </div>
    </Card>
  )
}

function CommercialReport({ data }) {
  const summary = data.resumen
  const columns = [
    {
      key: 'id',
      header: 'Cotizacion',
      render: (row) => (
        <Link className="text-link" to={`/cotizaciones/${row.id}`}>
          #{row.id}
        </Link>
      ),
    },
    {
      key: 'cliente_nombre',
      header: 'Cliente',
      render: (row) => (
        <div className="stacked-cell">
          <strong>{row.cliente_nombre}</strong>
          <span>{row.cliente_telefono}</span>
        </div>
      ),
    },
    { key: 'tipo_evento_nombre', header: 'Evento' },
    {
      key: 'fecha_tentativa',
      header: 'Fecha',
      render: (row) => formatDate(row.fecha_tentativa),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => <StatusBadge labels={quoteStatusLabels} value={row.estado} />,
    },
    {
      key: 'total_estimado',
      header: 'Estimado',
      render: (row) => formatCurrency(row.total_estimado),
    },
  ]

  return (
    <>
      <SummaryCards
        items={[
          {
            key: 'total_cotizaciones',
            label: 'Cotizaciones',
            value: summary.total_cotizaciones,
            detail: 'Solicitudes del periodo',
          },
          {
            key: 'activas',
            label: 'Activas',
            value: summary.cotizaciones_activas,
            detail: 'Nuevas, contactadas o confirmadas',
          },
          {
            key: 'convertidas',
            label: 'Convertidas',
            value: summary.cotizaciones_convertidas,
            detail: `${formatPercent(summary.conversion_porcentaje)} de conversion`,
          },
          {
            key: 'estimado',
            label: 'Estimado referencial',
            value: formatCurrency(summary.total_estimado_referencial),
            detail: 'No se considera ingreso real',
          },
        ]}
      />
      <BreakdownList items={data.por_estado} title="Cotizaciones por estado" />
      <Card>
        <DataTable
          columns={columns}
          emptyMessage="No hay cotizaciones en el periodo seleccionado."
          mobileTitle={(row) => `Cotizacion #${row.id}`}
          rows={data.cotizaciones}
        />
      </Card>
    </>
  )
}

function FinancialReport({ data }) {
  const events = data.rentabilidad_eventos ?? []
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
    { key: 'cliente_nombre', header: 'Cliente' },
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
      key: 'utilidad_bruta',
      header: 'Utilidad',
      render: (row) => formatCurrency(row.utilidad_bruta),
    },
    {
      key: 'margen_bruto',
      header: 'Margen',
      render: (row) => formatPercent(row.margen_bruto),
    },
  ]

  return (
    <>
      <SummaryCards
        items={data.kpis.map((kpi) => ({
          key: kpi.key,
          label: kpi.label,
          value: formatKpiValue(kpi),
          detail: kpi.detail,
        }))}
      />
      <Card>
        <div className="insight-panel">
          <span>Interpretacion</span>
          <strong>{data.interpretacion.titulo}</strong>
          <p>{data.interpretacion.detalle}</p>
        </div>
      </Card>
      <Card>
        <DataTable
          columns={columns}
          emptyMessage="No hay contratos confirmados para el periodo financiero."
          mobileTitle={(row) => `Contrato #${row.contrato_id}`}
          rows={events}
        />
      </Card>
    </>
  )
}

function EventsReport({ data }) {
  const summary = data.resumen
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
    { key: 'numero_invitados', header: 'Invitados' },
    {
      key: 'estado_contrato',
      header: 'Contrato',
      render: (row) => <StatusBadge labels={contractStatusLabels} value={row.estado_contrato} />,
    },
    {
      key: 'estado_pago',
      header: 'Pago',
      render: (row) => <StatusBadge labels={paymentLabels} value={row.estado_pago} />,
    },
    {
      key: 'saldo_pendiente',
      header: 'Saldo',
      render: (row) => formatCurrency(row.saldo_pendiente),
    },
  ]

  return (
    <>
      <SummaryCards
        items={[
          {
            key: 'total',
            label: 'Eventos',
            value: summary.total_eventos,
            detail: 'Contratos en agenda',
          },
          {
            key: 'confirmados',
            label: 'Confirmados',
            value: summary.eventos_confirmados,
            detail: 'Eventos operativos',
          },
          {
            key: 'invitados',
            label: 'Invitados confirmados',
            value: summary.invitados_confirmados,
            detail: 'Solo contratos confirmados',
          },
          {
            key: 'saldo',
            label: 'Saldo pendiente',
            value: formatCurrency(summary.saldo_pendiente_confirmado),
            detail: 'Sobre valor confirmado',
          },
        ]}
      />
      <BreakdownList items={data.por_tipo_evento} title="Eventos por tipo" />
      <Card>
        <DataTable
          columns={columns}
          emptyMessage="No hay contratos en el periodo seleccionado."
          mobileTitle={(row) => `Contrato #${row.contrato_id}`}
          rows={data.eventos}
        />
      </Card>
    </>
  )
}

function PackagesReport({ data }) {
  const summary = data.resumen
  const rows = (data.paquetes ?? []).map((row) => ({ ...row, id: row.key }))
  const columns = [
    { key: 'paquete_nombre', header: 'Paquete' },
    { key: 'cotizaciones', header: 'Cotizaciones' },
    { key: 'contratos_confirmados', header: 'Contratos' },
    {
      key: 'ingresos_confirmados',
      header: 'Ingresos',
      render: (row) => formatCurrency(row.ingresos_confirmados),
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
  ]

  return (
    <>
      <SummaryCards
        items={[
          {
            key: 'paquetes',
            label: 'Paquetes con actividad',
            value: summary.paquetes_con_actividad,
            detail: 'Cotizaciones o contratos',
          },
          {
            key: 'cotizaciones',
            label: 'Cotizaciones',
            value: summary.cotizaciones,
            detail: 'Demanda comercial',
          },
          {
            key: 'ingresos',
            label: 'Ingresos confirmados',
            value: formatCurrency(summary.ingresos_confirmados),
            detail: 'Solo contratos confirmados',
          },
          {
            key: 'margen',
            label: 'Margen bruto',
            value: formatPercent(summary.margen_bruto),
            detail: 'Utilidad sobre ingresos',
          },
        ]}
      />
      <Card>
        <DataTable
          columns={columns}
          emptyMessage="No hay actividad por paquete en el periodo seleccionado."
          mobileTitle={(row) => row.paquete_nombre}
          rows={rows}
        />
      </Card>
    </>
  )
}

export function ReportesPage() {
  const [activeReport, setActiveReport] = useState('comercial')
  const [filters, setFilters] = useState(initialRangeFilters)
  const [financialFilters, setFinancialFilters] = useState(initialFinancialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialRangeFilters)
  const [appliedFinancialFilters, setAppliedFinancialFilters] = useState(initialFinancialFilters)
  const [reportData, setReportData] = useState(null)
  const [pageError, setPageError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadReport = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const params =
        activeReport === 'financiero'
          ? buildQueryParams(appliedFinancialFilters)
          : buildQueryParams(appliedFilters)
      const data = await reportesService[activeReport](params)
      setReportData(data)
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [activeReport, appliedFilters, appliedFinancialFilters])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadReport, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadReport])

  const activeLabel = useMemo(
    () => reportOptions.find((report) => report.key === activeReport)?.label ?? 'Reporte',
    [activeReport],
  )

  const handleReportChange = (report) => {
    setActiveReport(report)
    setReportData(null)
    setPageError('')
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const handleFinancialFilterChange = (event) => {
    const { name, value } = event.target
    setFinancialFilters((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (activeReport === 'financiero') {
      setAppliedFinancialFilters(financialFilters)
    } else {
      setAppliedFilters(filters)
    }
  }

  const handleClear = () => {
    if (activeReport === 'financiero') {
      setFinancialFilters(initialFinancialFilters)
      setAppliedFinancialFilters(initialFinancialFilters)
    } else {
      setFilters(initialRangeFilters)
      setAppliedFilters(initialRangeFilters)
    }
  }

  const renderReport = () => {
    if (!reportData) return null
    if (activeReport === 'comercial') return <CommercialReport data={reportData} />
    if (activeReport === 'financiero') return <FinancialReport data={reportData} />
    if (activeReport === 'eventos') return <EventsReport data={reportData} />
    return <PackagesReport data={reportData} />
  }

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Button disabled={isLoading} icon={RefreshCw} onClick={loadReport} variant="secondary">
            Actualizar
          </Button>
        }
        description="Reportes comerciales, financieros, de eventos y paquetes desde backend."
        title="Reportes"
      />

      <ReportSelector activeReport={activeReport} onChange={handleReportChange} />

      <ReportFilters
        activeReport={activeReport}
        filters={filters}
        financialFilters={financialFilters}
        isLoading={isLoading}
        onClear={handleClear}
        onFilterChange={handleFilterChange}
        onFinancialFilterChange={handleFinancialFilterChange}
        onSubmit={handleSubmit}
      />

      <ErrorMessage>{pageError}</ErrorMessage>

      {isLoading && !reportData ? (
        <Card>
          <LoadingState label={`Cargando reporte ${activeLabel.toLowerCase()}`} />
        </Card>
      ) : null}

      {!isLoading && !reportData && !pageError ? (
        <Card>
          <EmptyState
            description="No hay informacion disponible con los filtros actuales."
            title="Sin reporte"
          />
        </Card>
      ) : null}

      {renderReport()}
    </div>
  )
}
