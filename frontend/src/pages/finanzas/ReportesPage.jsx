import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  Package,
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
import { PeriodToolbar } from '../../components/ui/PeriodToolbar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { reportesService } from '../../services/resourceService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatCurrency, formatDate, formatPercent, toDateInputValue } from '../../utils/formatters'
import { getCurrentPeriodValue, periodToFilters } from '../../utils/periods'

const today = new Date()
const todayValue = toDateInputValue(today)
const firstDayValue = toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1))

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

const initialFinancialPeriod = getCurrentPeriodValue(today)

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

function buildQueryParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )
}

function getStatusLabel(value, labels) {
  return labels[value] || value
}

function ReportStatusBadge({ labels, value }) {
  return (
    <StatusBadge status={value}>
      {getStatusLabel(value, labels)}
    </StatusBadge>
  )
}

function formatKpiValue(kpi) {
  if (kpi.format === 'currency') return formatCurrency(kpi.value)
  if (kpi.format === 'percent') return formatPercent(kpi.value)
  return kpi.value
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value)
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

function downloadCsv(filename, rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\r\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function buildExportRows(activeReport, data) {
  if (!data) return []

  if (activeReport === 'comercial') {
    return (data.cotizaciones ?? []).map((row) => ({
      'Cotización': row.id,
      'Cliente': row.persona_nombre,
      'Teléfono': row.persona_telefono,
      'Tipo de evento': row.tipo_evento_nombre,
      'Fecha tentativa': formatDate(row.fecha_tentativa),
      'Estado comercial': getStatusLabel(row.estado, quoteStatusLabels),
      'Estimado referencial (USD)': row.total_estimado,
      'Contrato asociado': row.contrato_id ?? '',
    }))
  }

  if (activeReport === 'financiero') {
    const period = data.periodo?.label ?? ''
    const base = {
      'Periodo consultado': period,
      'Tipo de registro': '',
      'Contrato': '',
      'Cliente o concepto': '',
      'Fecha': '',
      'Vigencia': '',
      'Estado': '',
      'Ingresos confirmados (USD)': '',
      'Costos directos (USD)': '',
      'Valor del gasto (USD)': '',
      'Utilidad bruta (USD)': '',
      'Margen bruto (%)': '',
      'Saldo pendiente (USD)': '',
      'Observaciones': '',
    }
    const contractRows = (data.rentabilidad_eventos ?? []).map((row) => ({
      ...base,
      'Tipo de registro': 'Contrato confirmado',
      'Contrato': row.contrato_id,
      'Cliente o concepto': `${row.persona_nombre} · ${row.tipo_evento_nombre}`,
      'Fecha': formatDate(row.fecha_evento),
      'Estado': getStatusLabel(row.estado_pago, paymentLabels),
      'Ingresos confirmados (USD)': row.valor_final,
      'Costos directos (USD)': row.costos_directos,
      'Utilidad bruta (USD)': row.utilidad_bruta,
      'Margen bruto (%)': row.margen_bruto,
      'Saldo pendiente (USD)': row.saldo_pendiente,
    }))
    const recurringRows = (data.gastos_periodo?.recurrentes ?? []).map((row) => ({
      ...base,
      'Tipo de registro': row.es_ajuste
        ? 'Gasto fijo recurrente · ajuste mensual'
        : 'Gasto fijo recurrente',
      'Cliente o concepto': row.concepto,
      'Vigencia': `${row.inicio_periodo} a ${row.fin_periodo ?? 'sin finalización'}`,
      'Estado': row.activo ? 'Activo' : 'Inactivo',
      'Valor del gasto (USD)': row.valor,
      'Observaciones': row.observaciones,
    }))
    const additionalRows = (data.gastos_periodo?.adicionales ?? []).map((row) => ({
      ...base,
      'Tipo de registro': 'Gasto adicional',
      'Cliente o concepto': row.concepto,
      'Fecha': formatDate(row.fecha),
      'Estado': 'Registrado',
      'Valor del gasto (USD)': row.valor,
      'Observaciones': row.observaciones,
    }))
    return [...contractRows, ...recurringRows, ...additionalRows]
  }

  if (activeReport === 'eventos') {
    return (data.eventos ?? []).map((row) => ({
      'Contrato': row.contrato_id,
      'Cliente': row.persona_nombre,
      'Teléfono': row.persona_telefono,
      'Tipo de evento': row.tipo_evento_nombre,
      'Fecha del evento': formatDate(row.fecha_evento),
      'Invitados': row.numero_invitados,
      'Estado del contrato': getStatusLabel(row.estado_contrato, contractStatusLabels),
      'Estado de pago': getStatusLabel(row.estado_pago, paymentLabels),
      'Valor final (USD)': row.valor_final,
      'Monto abonado (USD)': row.monto_abonado,
      'Saldo pendiente (USD)': row.saldo_pendiente,
    }))
  }

  return (data.paquetes ?? []).map((row) => ({
    'Paquete': row.paquete_nombre,
    'Tipo de servicio': row.tipo_servicio,
    'Cotizaciones': row.cotizaciones,
    'Cotizaciones convertidas': row.cotizaciones_convertidas,
    'Contratos confirmados': row.contratos_confirmados,
    'Ingresos confirmados (USD)': row.ingresos_confirmados,
    'Costos directos (USD)': row.costos_directos,
    'Utilidad bruta (USD)': row.utilidad_bruta,
    'Margen bruto (%)': row.margen_bruto,
  }))
}

function getExportPeriodSlug(data) {
  const period = data?.periodo
  if (!period) return toDateInputValue()
  if (period.mes && period.anio) return `${period.anio}-${String(period.mes).padStart(2, '0')}`
  return `${period.desde}-a-${period.hasta}`
}

function ReportSelector({ activeReport, onChange }) {
  return (
    <div className="report-selector" role="tablist" aria-label="Tipos de reporte">
      {reportOptions.map((option) => (
        <button
          aria-controls="reporte-panel"
          aria-selected={activeReport === option.key}
          className={`report-selector__item ${activeReport === option.key ? 'report-selector__item--active' : ''}`}
          id={`reporte-tab-${option.key}`}
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
  errors,
  filters,
  financialPeriod,
  onFilterChange,
  onFinancialPeriodChange,
  onResetRange,
}) {
  if (activeReport === 'financiero') {
    return (
      <PeriodToolbar
        id="reporte-periodo-financiero"
        label="Periodo del reporte financiero"
        onChange={onFinancialPeriodChange}
        value={financialPeriod}
      />
    )
  }

  return (
    <Card className="report-period-card">
      <div className="report-period-card__heading">
        <div>
          <span>Periodo consultado</span>
          <strong>Rango de fechas</strong>
        </div>
        <div className="report-period-card__actions">
          <small>Los resultados cambian automáticamente.</small>
          <Button onClick={onResetRange} variant="secondary">Mes actual</Button>
        </div>
      </div>
      <div className="report-period-card__fields">
        <Input
          error={errors.desde}
          id="reporte-desde"
          label="Desde"
          name="desde"
          onChange={onFilterChange}
          required
          type="date"
          value={filters.desde}
        />
        <Input
          error={errors.hasta}
          id="reporte-hasta"
          label="Hasta"
          name="hasta"
          onChange={onFilterChange}
          required
          type="date"
          value={filters.hasta}
        />
      </div>
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
              <span>
                {item.cantidad ?? item.total}{' '}
                {(item.cantidad ?? item.total) === 1 ? 'registro' : 'registros'}
              </span>
              {item.confirmados !== undefined ? (
                <small>{item.confirmados} {item.confirmados === 1 ? 'confirmado' : 'confirmados'}</small>
              ) : null}
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
      key: 'persona_nombre',
      header: 'Cliente',
      render: (row) => (
        <div className="stacked-cell">
          <strong>{row.persona_nombre}</strong>
          <span>{row.persona_telefono}</span>
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
      render: (row) => <ReportStatusBadge labels={quoteStatusLabels} value={row.estado} />,
    },
    {
      key: 'total_estimado',
      header: 'Estimado',
      align: 'right',
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
          caption="Cotizaciones comerciales del periodo"
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
  const recurringExpenses = data.gastos_periodo?.recurrentes ?? []
  const additionalExpenses = data.gastos_periodo?.adicionales ?? []
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
      key: 'persona_nombre',
      header: 'Cliente / evento',
      render: (row) => (
        <div className="stacked-cell">
          <strong>{row.persona_nombre}</strong>
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
      align: 'right',
      render: (row) => formatCurrency(row.valor_final),
    },
    {
      key: 'costos_directos',
      header: 'Costos directos',
      align: 'right',
      render: (row) => formatCurrency(row.costos_directos),
    },
    {
      key: 'utilidad_bruta',
      header: 'Utilidad bruta',
      align: 'right',
      render: (row) => formatCurrency(row.utilidad_bruta),
    },
    {
      key: 'pago',
      header: 'Pago / saldo',
      render: (row) => (
        <div className="stacked-cell">
          <ReportStatusBadge labels={paymentLabels} value={row.estado_pago} />
          <span>{formatCurrency(row.saldo_pendiente)} pendiente</span>
        </div>
      ),
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
      <Card className="report-expense-breakdown">
        <div className="report-expense-breakdown__heading">
          <div>
            <span>Gastos operativos</span>
            <h3>Desglose del periodo</h3>
          </div>
          <strong>{formatCurrency(data.gastos_periodo?.total_gastos_operativos_periodo)}</strong>
        </div>
        <div className="report-expense-breakdown__tables">
          <section>
            <h4>Gastos fijos recurrentes</h4>
            <DataTable
              caption="Gastos fijos recurrentes aplicados en el periodo"
              columns={[
                { key: 'concepto', header: 'Concepto' },
                {
                  key: 'tipo',
                  header: 'Aplicación',
                  render: (row) => row.es_ajuste ? 'Ajuste de este mes' : 'Valor recurrente',
                },
                {
                  key: 'valor',
                  header: 'Valor',
                  align: 'right',
                  render: (row) => formatCurrency(row.valor),
                },
              ]}
              emptyMessage="No hay gastos fijos recurrentes aplicables en este periodo."
              mobileTitle={(row) => row.concepto}
              rows={recurringExpenses}
            />
          </section>
          <section>
            <h4>Gastos adicionales</h4>
            <DataTable
              caption="Gastos adicionales registrados en el periodo"
              columns={[
                { key: 'concepto', header: 'Concepto' },
                { key: 'fecha', header: 'Fecha', render: (row) => formatDate(row.fecha) },
                {
                  key: 'valor',
                  header: 'Valor',
                  align: 'right',
                  render: (row) => formatCurrency(row.valor),
                },
              ]}
              emptyMessage="No hay gastos adicionales registrados en este periodo."
              mobileTitle={(row) => row.concepto}
              rows={additionalExpenses}
            />
          </section>
        </div>
      </Card>
      <Card>
        <DataTable
          caption="Rentabilidad de contratos confirmados del periodo"
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
      key: 'persona_nombre',
      header: 'Cliente / evento',
      render: (row) => (
        <div className="stacked-cell">
          <strong>{row.persona_nombre}</strong>
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
      render: (row) => <ReportStatusBadge labels={contractStatusLabels} value={row.estado_contrato} />,
    },
    {
      key: 'estado_pago',
      header: 'Pago',
      render: (row) => <ReportStatusBadge labels={paymentLabels} value={row.estado_pago} />,
    },
    {
      key: 'saldo_pendiente',
      header: 'Saldo',
      align: 'right',
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
            detail: `${summary.eventos_cancelados} ${summary.eventos_cancelados === 1 ? 'cancelado' : 'cancelados'} en historial`,
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
          caption="Eventos contratados del periodo"
          columns={columns}
          emptyMessage="No hay contratos en el periodo seleccionado."
          getRowClassName={(row) => row.estado_contrato === 'cancelado' ? 'data-table__row--cancelled' : ''}
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
      align: 'right',
      render: (row) => formatCurrency(row.ingresos_confirmados),
    },
    {
      key: 'costos_directos',
      header: 'Costos',
      align: 'right',
      render: (row) => formatCurrency(row.costos_directos),
    },
    {
      key: 'utilidad_bruta',
      header: 'Utilidad',
      align: 'right',
      render: (row) => formatCurrency(row.utilidad_bruta),
    },
    {
      key: 'margen_bruto',
      header: 'Margen',
      align: 'right',
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
          caption="Actividad comercial y rentabilidad por paquete"
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
  const [financialPeriod, setFinancialPeriod] = useState(initialFinancialPeriod)
  const [filterErrors, setFilterErrors] = useState({})
  const [reportData, setReportData] = useState(null)
  const [pageError, setPageError] = useState('')
  const [exportError, setExportError] = useState('')
  const [exportMessage, setExportMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const requestIdRef = useRef(0)

  const loadReport = useCallback(async ({ silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const nextFilterErrors = {}

    if (activeReport !== 'financiero') {
      if (!filters.desde) nextFilterErrors.desde = 'Selecciona la fecha inicial.'
      if (!filters.hasta) nextFilterErrors.hasta = 'Selecciona la fecha final.'
      if (filters.desde && filters.hasta && filters.desde > filters.hasta) {
        nextFilterErrors.hasta = 'La fecha final no puede ser anterior a la fecha inicial.'
      }
    }

    setFilterErrors(nextFilterErrors)
    if (Object.keys(nextFilterErrors).length) {
      setReportData(null)
      setIsLoading(false)
      return
    }

    if (!silent) {
      setIsLoading(true)
      setReportData(null)
      setPageError('')
    }

    try {
      const params =
        activeReport === 'financiero'
          ? periodToFilters(financialPeriod)
          : buildQueryParams(filters)
      const data = await reportesService[activeReport](params)
      if (requestId === requestIdRef.current) {
        setReportData(data)
        setPageError('')
      }
    } catch (error) {
      if (requestId === requestIdRef.current) setPageError(getApiErrorMessage(error))
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [activeReport, filters, financialPeriod])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadReport, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadReport])

  useAutoRefresh(loadReport)

  const activeLabel = useMemo(
    () => reportOptions.find((report) => report.key === activeReport)?.label ?? 'Reporte',
    [activeReport],
  )

  const exportRows = useMemo(
    () => buildExportRows(activeReport, reportData),
    [activeReport, reportData],
  )

  const handleReportChange = (report) => {
    setActiveReport(report)
    setReportData(null)
    setPageError('')
    setFilterErrors({})
    setExportError('')
    setExportMessage('')
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
    setExportError('')
    setExportMessage('')
  }

  const renderReport = () => {
    if (!reportData) return null
    if (activeReport === 'comercial') return <CommercialReport data={reportData} />
    if (activeReport === 'financiero') return <FinancialReport data={reportData} />
    if (activeReport === 'eventos') return <EventsReport data={reportData} />
    return <PackagesReport data={reportData} />
  }

  const handleExportCsv = () => {
    if (!exportRows.length) return

    setExportError('')
    setExportMessage('')
    try {
      const period = getExportPeriodSlug(reportData)
      downloadCsv(`rfm-core-${activeReport}-${period}.csv`, exportRows)
      setExportMessage(`El CSV del reporte ${activeLabel.toLowerCase()} se descargó correctamente.`)
    } catch {
      setExportError('No fue posible generar el archivo CSV. Inténtalo nuevamente.')
    }
  }

  return (
    <div className="page-stack page-stack--workspace">
      <PageHeader
        actions={
          <Button
            disabled={isLoading || !exportRows.length}
            icon={Download}
            onClick={handleExportCsv}
            variant="secondary"
          >
            Exportar CSV
          </Button>
        }
        description="Consulta resultados comerciales, operativos y financieros con datos reales del sistema."
        eyebrow="Finanzas"
        title="Reportes"
      />

      <ReportSelector activeReport={activeReport} onChange={handleReportChange} />

      <ReportFilters
        activeReport={activeReport}
        errors={filterErrors}
        filters={filters}
        financialPeriod={financialPeriod}
        onFilterChange={handleFilterChange}
        onFinancialPeriodChange={(value) => {
          setFinancialPeriod(value)
          setExportError('')
          setExportMessage('')
        }}
        onResetRange={() => {
          setFilters(initialRangeFilters)
          setExportError('')
          setExportMessage('')
        }}
      />

      <ErrorMessage
        action={pageError ? <Button onClick={() => loadReport()} variant="secondary">Reintentar</Button> : null}
      >
        {pageError || exportError}
      </ErrorMessage>
      {exportMessage ? <div className="success-message" role="status">{exportMessage}</div> : null}

      {isLoading && !reportData ? (
        <Card>
          <LoadingState label={`Cargando reporte ${activeLabel.toLowerCase()}`} />
        </Card>
      ) : null}

      {!isLoading && !reportData && !pageError && !Object.keys(filterErrors).length ? (
        <Card>
          <EmptyState
            description="El reporte todavía no puede calcularse con la información disponible."
            title="Reporte no disponible"
          />
        </Card>
      ) : null}

      {reportData ? (
        <section
          aria-busy={isLoading}
          aria-labelledby={`reporte-tab-${activeReport}`}
          className={isLoading ? 'report-panel report-panel--refreshing' : 'report-panel'}
          id="reporte-panel"
          role="tabpanel"
          tabIndex="0"
        >
          {renderReport()}
        </section>
      ) : null}
    </div>
  )
}
