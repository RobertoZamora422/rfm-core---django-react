import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  CalendarClock,
  Edit3,
  History,
  PauseCircle,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  WalletCards,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { FiltersToolbar } from '../../components/ui/FiltersToolbar'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { PeriodToolbar } from '../../components/ui/PeriodToolbar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Textarea } from '../../components/ui/Textarea'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'
import {
  gastosAdicionalesService,
  gastosRecurrentesService,
  gastosService,
} from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { formatCurrency, formatDate } from '../../utils/formatters'
import {
  getCurrentPeriodValue,
  getPeriodLabel,
  periodToFilters,
  shiftPeriod,
} from '../../utils/periods'

function toArray(data) {
  return Array.isArray(data) ? data : data?.results ?? []
}

function humanPeriod(value, fallback = 'Sin finalización') {
  return value ? getPeriodLabel(value) : fallback
}

function getAdditionalDefaultDate(selectedPeriod) {
  const currentPeriod = getCurrentPeriodValue()
  if (selectedPeriod === currentPeriod) {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }
  return `${selectedPeriod}-01`
}

function ExpenseTypeSelector({ onChange, value }) {
  const options = [
    {
      key: 'recurrente',
      icon: CalendarClock,
      title: 'Gasto fijo recurrente',
      description: 'Se aplica automáticamente cada mes durante su vigencia.',
    },
    {
      key: 'adicional',
      icon: ReceiptText,
      title: 'Gasto adicional',
      description: 'Se registra solamente en la fecha y periodo seleccionados.',
    },
  ]

  return (
    <fieldset className="expense-type-fieldset">
      <legend>Tipo de gasto</legend>
      <div className="expense-type-grid">
        {options.map((option) => {
          const Icon = option.icon
          const selected = value === option.key
          return (
            <button
              aria-pressed={selected}
              className={`expense-type-option ${selected ? 'expense-type-option--selected' : ''}`}
              key={option.key}
              onClick={() => onChange(option.key)}
              type="button"
            >
              <span aria-hidden="true"><Icon size={20} /></span>
              <strong>{option.title}</strong>
              <small>{option.description}</small>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function ExpenseForm({
  errors,
  initialItem,
  initialType,
  isSubmitting,
  onCancel,
  onSubmit,
  selectedPeriod,
}) {
  const editingType = initialItem ? initialType : null
  const [type, setType] = useState(initialType)
  const [form, setForm] = useState(() => ({
    concepto: initialItem?.concepto ?? '',
    valor: initialItem?.valor ?? '',
    valor_mensual: '',
    aplicar_desde: selectedPeriod,
    aplicar_hasta: '',
    fecha: initialItem?.fecha ?? getAdditionalDefaultDate(selectedPeriod),
    observaciones: initialItem?.observaciones ?? '',
  }))
  useFocusFirstError(errors)

  const change = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const submit = (event) => {
    event.preventDefault()
    if (type === 'recurrente') {
      onSubmit(type, {
        concepto: form.concepto,
        valor_mensual: form.valor_mensual,
        aplicar_desde: form.aplicar_desde,
        aplicar_hasta: form.aplicar_hasta || null,
        observaciones: form.observaciones,
      })
      return
    }
    onSubmit(type, {
      concepto: form.concepto,
      valor: form.valor,
      fecha: form.fecha,
      observaciones: form.observaciones,
    })
  }

  return (
    <form className="resource-form" onSubmit={submit}>
      {!editingType ? <ExpenseTypeSelector onChange={setType} value={type} /> : null}

      {type === 'adicional' ? (
        <div className="inline-guidance">
          <ReceiptText aria-hidden="true" size={18} />
          <p>
            Úsalo para gastos generales de una sola ocasión. Si pertenece a un evento
            contratado, regístralo como costo directo.
          </p>
        </div>
      ) : null}

      <Input
        error={errors.concepto}
        id="gasto-concepto"
        label="Concepto"
        maxLength={150}
        name="concepto"
        onChange={change}
        placeholder={type === 'recurrente' ? 'Ej. Internet o arriendo' : 'Ej. Reparación de tubería'}
        required
        value={form.concepto}
      />

      {type === 'recurrente' ? (
        <>
          <div className="form-grid">
            <Input
              error={errors.valor_mensual}
              id="gasto-valor-mensual"
              inputMode="decimal"
              label="Valor mensual (USD)"
              min="0"
              name="valor_mensual"
              onChange={change}
              required
              step="0.01"
              type="number"
              value={form.valor_mensual}
            />
            <Input
              error={errors.aplicar_desde}
              helpText="Primer mes en el que se incluirá automáticamente."
              id="gasto-aplicar-desde"
              label="Aplicar desde"
              name="aplicar_desde"
              onChange={change}
              required
              type="month"
              value={form.aplicar_desde}
            />
          </div>
          <Input
            error={errors.aplicar_hasta}
            helpText="Déjalo vacío cuando el compromiso no tenga una fecha de finalización."
            id="gasto-aplicar-hasta"
            label="Aplicar hasta (opcional)"
            min={form.aplicar_desde}
            name="aplicar_hasta"
            onChange={change}
            type="month"
            value={form.aplicar_hasta}
          />
        </>
      ) : (
        <div className="form-grid">
          <Input
            error={errors.valor}
            id="gasto-adicional-valor"
            inputMode="decimal"
            label="Valor (USD)"
            min="0"
            name="valor"
            onChange={change}
            required
            step="0.01"
            type="number"
            value={form.valor}
          />
          <Input
            error={errors.fecha}
            helpText="El periodo se obtiene automáticamente de esta fecha."
            id="gasto-adicional-fecha"
            label="Fecha"
            name="fecha"
            onChange={change}
            required
            type="date"
            value={form.fecha}
          />
        </div>
      )}

      <Textarea
        error={errors.observaciones}
        id="gasto-observaciones"
        label="Observaciones (opcional)"
        name="observaciones"
        onChange={change}
        value={form.observaciones}
      />

      <div className="form-actions">
        <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button isLoading={isSubmitting} loadingLabel="Guardando gasto" type="submit">
          {initialItem ? 'Guardar cambios' : 'Registrar gasto'}
        </Button>
      </div>
    </form>
  )
}

function RecurringGeneralForm({ errors, initialItem, isSubmitting, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    concepto: initialItem.concepto,
    observaciones: initialItem.observaciones ?? '',
  })
  useFocusFirstError(errors)

  return (
    <form
      className="resource-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(form)
      }}
    >
      <div className="inline-guidance">
        <Edit3 aria-hidden="true" size={18} />
        <p>Esta edición no cambia valores ni meses ya calculados.</p>
      </div>
      <Input
        error={errors.concepto}
        id="recurrente-concepto"
        label="Concepto"
        name="concepto"
        onChange={(event) => setForm((current) => ({ ...current, concepto: event.target.value }))}
        required
        value={form.concepto}
      />
      <Textarea
        error={errors.observaciones}
        id="recurrente-observaciones"
        label="Observaciones (opcional)"
        name="observaciones"
        onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))}
        value={form.observaciones}
      />
      <div className="form-actions">
        <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">Cancelar</Button>
        <Button isLoading={isSubmitting} loadingLabel="Guardando" type="submit">Guardar información</Button>
      </div>
    </form>
  )
}

function RecurringAdjustmentForm({
  errors,
  initialItem,
  isSubmitting,
  onCancel,
  onSubmit,
  selectedPeriod,
}) {
  const [mode, setMode] = useState('periodo')
  const [form, setForm] = useState({
    periodo: selectedPeriod,
    valor: initialItem.valor_vigente ?? '',
    observaciones: '',
  })
  useFocusFirstError(errors)

  return (
    <form
      className="resource-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(mode, form)
      }}
    >
      <fieldset className="adjustment-choice">
        <legend>Alcance del cambio</legend>
        <label>
          <input
            checked={mode === 'periodo'}
            name="modo-ajuste"
            onChange={() => setMode('periodo')}
            type="radio"
          />
          <span>
            <strong>Modificar solamente este periodo</strong>
            <small>Útil para una factura excepcional de un solo mes.</small>
          </span>
        </label>
        <label>
          <input
            checked={mode === 'desde'}
            name="modo-ajuste"
            onChange={() => setMode('desde')}
            type="radio"
          />
          <span>
            <strong>Modificar desde este periodo en adelante</strong>
            <small>Conserva los valores de los meses anteriores.</small>
          </span>
        </label>
      </fieldset>
      <div className="form-grid">
        <Input
          error={errors.periodo}
          id="ajuste-periodo"
          label="Periodo"
          min={mode === 'desde' ? getCurrentPeriodValue() : initialItem.aplicar_desde}
          name="periodo"
          onChange={(event) => setForm((current) => ({ ...current, periodo: event.target.value }))}
          required
          type="month"
          value={form.periodo}
        />
        <Input
          error={errors.valor || errors.valor_mensual}
          id="ajuste-valor"
          inputMode="decimal"
          label={mode === 'periodo' ? 'Valor de este periodo (USD)' : 'Nuevo valor mensual (USD)'}
          min="0"
          name="valor"
          onChange={(event) => setForm((current) => ({ ...current, valor: event.target.value }))}
          required
          step="0.01"
          type="number"
          value={form.valor}
        />
      </div>
      {mode === 'periodo' ? (
        <Textarea
          error={errors.observaciones}
          id="ajuste-observaciones"
          label="Motivo del ajuste (opcional)"
          name="observaciones"
          onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))}
          value={form.observaciones}
        />
      ) : null}
      <div className="form-actions">
        <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">Cancelar</Button>
        <Button isLoading={isSubmitting} loadingLabel="Aplicando cambio" type="submit">Aplicar cambio</Button>
      </div>
    </form>
  )
}

function RecurringStatusForm({
  action,
  errors,
  initialItem,
  isSubmitting,
  onCancel,
  onSubmit,
  selectedPeriod,
}) {
  const defaultPeriod = action === 'desactivar'
    ? shiftPeriod(selectedPeriod, 1)
    : getCurrentPeriodValue()
  const [form, setForm] = useState({
    periodo_desde: defaultPeriod,
    valor_mensual: initialItem.valor_vigente ?? '',
  })
  useFocusFirstError(errors)

  return (
    <form
      className="resource-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(form)
      }}
    >
      <div className="inline-guidance">
        {action === 'desactivar' ? <PauseCircle aria-hidden="true" size={18} /> : <RotateCcw aria-hidden="true" size={18} />}
        <p>
          {action === 'desactivar'
            ? 'Dejará de aplicarse desde el periodo indicado, pero se conservará en el historial financiero.'
            : 'Volverá a incluirse automáticamente desde el periodo indicado.'}
        </p>
      </div>
      <Input
        error={errors.periodo_desde}
        id="estado-periodo-desde"
        label={action === 'desactivar' ? 'Dejar de aplicar desde' : 'Reactivar desde'}
        min={getCurrentPeriodValue()}
        name="periodo_desde"
        onChange={(event) => setForm((current) => ({ ...current, periodo_desde: event.target.value }))}
        required
        type="month"
        value={form.periodo_desde}
      />
      {action === 'reactivar' ? (
        <Input
          error={errors.valor_mensual}
          id="reactivar-valor"
          inputMode="decimal"
          label="Valor mensual (USD)"
          min="0"
          name="valor_mensual"
          onChange={(event) => setForm((current) => ({ ...current, valor_mensual: event.target.value }))}
          required
          step="0.01"
          type="number"
          value={form.valor_mensual}
        />
      ) : null}
      <div className="form-actions">
        <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">Cancelar</Button>
        <Button isLoading={isSubmitting} loadingLabel="Guardando estado" type="submit">
          {action === 'desactivar' ? 'Desactivar gasto' : 'Reactivar gasto'}
        </Button>
      </div>
    </form>
  )
}

function ExpenseSummary({ summary, selectedPeriod }) {
  const items = [
    {
      key: 'recurrentes',
      icon: CalendarClock,
      label: 'Gastos fijos recurrentes',
      value: summary?.gastos_fijos_recurrentes_periodo,
      detail: `${summary?.gastos_recurrentes_aplicados ?? 0} aplicados automáticamente`,
    },
    {
      key: 'adicionales',
      icon: ReceiptText,
      label: 'Gastos adicionales',
      value: summary?.gastos_adicionales_periodo,
      detail: `${summary?.gastos_adicionales_registrados ?? 0} registrados en el mes`,
    },
    {
      key: 'total',
      icon: WalletCards,
      label: 'Total de gastos operativos',
      value: summary?.total_gastos_operativos_periodo,
      detail: getPeriodLabel(selectedPeriod),
      featured: true,
    },
  ]

  return (
    <section aria-label={`Resumen de gastos de ${getPeriodLabel(selectedPeriod)}`} className="expense-summary-grid">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card className={`expense-summary-card ${item.featured ? 'expense-summary-card--featured' : ''}`} key={item.key}>
            <span aria-hidden="true" className="expense-summary-card__icon"><Icon size={21} /></span>
            <div>
              <span>{item.label}</span>
              <strong>{formatCurrency(item.value)}</strong>
              <small>{item.detail}</small>
            </div>
          </Card>
        )
      })}
    </section>
  )
}

export function GastosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPeriod = searchParams.get('periodo') || getCurrentPeriodValue()
  const initialTab = searchParams.get('tipo') === 'adicionales' ? 'adicionales' : 'recurrentes'
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [search, setSearch] = useState(searchParams.get('buscar') ?? '')
  const debouncedSearch = useDebouncedValue(search, 350)
  const params = useMemo(() => periodToFilters(selectedPeriod), [selectedPeriod])
  const [summary, setSummary] = useState(null)
  const [recurring, setRecurring] = useState([])
  const [additional, setAdditional] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formState, setFormState] = useState(null)
  const [adjustingItem, setAdjustingItem] = useState(null)
  const [statusItem, setStatusItem] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [historyState, setHistoryState] = useState(null)
  const requestIdRef = useRef(0)
  const hasSearch = Boolean(debouncedSearch)

  const loadExpenses = useCallback(async ({ silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (!silent) setIsLoading(true)
    if (!silent) setPageError('')
    const searchQuery = debouncedSearch ? { buscar: debouncedSearch } : {}

    try {
      const [summaryData, recurringData, additionalData] = await Promise.all([
        gastosService.resumen(params),
        gastosRecurrentesService.list({ ...params, ...searchQuery }),
        gastosAdicionalesService.list({ ...params, ...searchQuery }),
      ])
      if (requestId === requestIdRef.current) {
        setSummary(summaryData)
        setRecurring(toArray(recurringData))
        setAdditional(toArray(additionalData))
        setPageError('')
      }
    } catch (error) {
      if (requestId === requestIdRef.current) setPageError(getApiErrorMessage(error))
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [debouncedSearch, params])

  useEffect(() => {
    setSearchParams(
      {
        periodo: selectedPeriod,
        tipo: activeTab,
        ...(debouncedSearch ? { buscar: debouncedSearch } : {}),
      },
      { replace: true },
    )
  }, [activeTab, debouncedSearch, selectedPeriod, setSearchParams])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadExpenses, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadExpenses])

  useAutoRefresh(loadExpenses, { refreshOnMutation: false })

  const resetMutationModals = () => {
    setFormState(null)
    setAdjustingItem(null)
    setStatusItem(null)
    setDeletingItem(null)
    setFieldErrors({})
  }

  const closeMutationModal = () => {
    if (isSaving) return
    resetMutationModals()
  }

  const runMutation = async (operation, successMessage) => {
    if (isSaving) return
    setIsSaving(true)
    setFieldErrors({})
    setPageError('')
    setActionMessage('')
    try {
      await operation()
      resetMutationModals()
      setActionMessage(successMessage)
      await loadExpenses({ silent: true })
    } catch (error) {
      const errors = getApiFieldErrors(error)
      setFieldErrors(errors)
      if (!Object.keys(errors).length) setPageError(getApiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const submitExpense = (type, payload) => {
    const item = formState?.item
    const service = type === 'recurrente' ? gastosRecurrentesService : gastosAdicionalesService
    return runMutation(
      () => item ? service.update(item.id, payload) : service.create(payload),
      item
        ? `El gasto “${payload.concepto}” se actualizó correctamente.`
        : `El gasto “${payload.concepto}” se registró correctamente.`,
    )
  }

  const submitAdjustment = (mode, form) => runMutation(
    () => mode === 'periodo'
      ? gastosRecurrentesService.ajustarPeriodo(adjustingItem.id, {
          periodo: form.periodo,
          valor: form.valor,
          observaciones: form.observaciones,
        })
      : gastosRecurrentesService.ajustarDesde(adjustingItem.id, {
          periodo: form.periodo,
          valor_mensual: form.valor,
        }),
    mode === 'periodo'
      ? `El valor de ${getPeriodLabel(form.periodo)} se ajustó sin cambiar otros meses.`
      : `El nuevo valor se aplicará desde ${getPeriodLabel(form.periodo)}.`,
  )

  const submitStatus = (form) => runMutation(
    () => statusItem.action === 'desactivar'
      ? gastosRecurrentesService.desactivar(statusItem.item.id, {
          periodo_desde: form.periodo_desde,
        })
      : gastosRecurrentesService.reactivar(statusItem.item.id, {
          periodo_desde: form.periodo_desde,
          valor_mensual: form.valor_mensual,
        }),
    statusItem.action === 'desactivar'
      ? `El gasto dejará de aplicarse desde ${getPeriodLabel(form.periodo_desde)}.`
      : `El gasto volverá a aplicarse desde ${getPeriodLabel(form.periodo_desde)}.`,
  )

  const showHistory = async (item) => {
    setHistoryState({ item, data: null, error: '', loading: true })
    try {
      const data = await gastosRecurrentesService.historial(item.id, params)
      setHistoryState({ item, data, error: '', loading: false })
    } catch (error) {
      setHistoryState({ item, data: null, error: getApiErrorMessage(error), loading: false })
    }
  }

  const deleteAdditional = () => runMutation(
    () => gastosAdicionalesService.remove(deletingItem.id),
    `El gasto “${deletingItem.concepto}” se eliminó del periodo sin perder su trazabilidad.`,
  )

  const recurringColumns = [
    {
      key: 'concepto',
      header: 'Concepto',
      render: (item) => (
        <div className="stacked-cell">
          <strong>{item.concepto}</strong>
          {item.observaciones ? <span>{item.observaciones}</span> : null}
        </div>
      ),
    },
    {
      key: 'valor_vigente',
      header: `Valor en ${getPeriodLabel(selectedPeriod)}`,
      align: 'right',
      render: (item) => (
        <div className="stacked-cell stacked-cell--end">
          <strong>{item.valor_vigente === null ? 'No aplica' : formatCurrency(item.valor_vigente)}</strong>
          {item.tiene_ajuste_periodo ? <span>Ajuste solo de este mes</span> : null}
        </div>
      ),
    },
    {
      key: 'vigencia',
      header: 'Vigencia',
      render: (item) => (
        <div className="stacked-cell">
          <strong>Desde {humanPeriod(item.aplicar_desde)}</strong>
          <span>Hasta {humanPeriod(item.aplicar_hasta)}</span>
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <StatusBadge status={item.activo ? 'activo' : 'inactivo'}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </StatusBadge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => (
        <div className="table-actions table-actions--compact">
          <Button icon={History} onClick={() => showHistory(item)} variant="ghost">Historial</Button>
          <Button
            icon={Edit3}
            onClick={() => {
              setFieldErrors({})
              setFormState({ type: 'recurrente-general', item })
            }}
            variant="secondary"
          >
            Editar
          </Button>
          {item.activo ? (
            <>
              <Button
                icon={SlidersHorizontal}
                onClick={() => {
                  setFieldErrors({})
                  setAdjustingItem(item)
                }}
                variant="secondary"
              >
                Ajustar valor
              </Button>
              <Button
                icon={PauseCircle}
                onClick={() => {
                  setFieldErrors({})
                  setStatusItem({ action: 'desactivar', item })
                }}
                variant="ghost"
              >
                Desactivar
              </Button>
            </>
          ) : (
            <Button
              icon={RotateCcw}
              onClick={() => {
                setFieldErrors({})
                setStatusItem({ action: 'reactivar', item })
              }}
              variant="secondary"
            >
              Reactivar
            </Button>
          )}
        </div>
      ),
    },
  ]

  const additionalColumns = [
    {
      key: 'concepto',
      header: 'Concepto',
      render: (item) => (
        <div className="stacked-cell">
          <strong>{item.concepto}</strong>
          {item.observaciones ? <span>{item.observaciones}</span> : null}
        </div>
      ),
    },
    { key: 'fecha', header: 'Fecha', render: (item) => formatDate(item.fecha) },
    {
      key: 'valor',
      header: 'Valor',
      align: 'right',
      render: (item) => formatCurrency(item.valor),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => (
        <div className="table-actions table-actions--compact">
          <Button
            icon={Edit3}
            onClick={() => {
              setFieldErrors({})
              setFormState({ type: 'adicional', item })
            }}
            variant="secondary"
          >
            Editar
          </Button>
          <Button icon={Trash2} onClick={() => setDeletingItem(item)} variant="ghost">
            Eliminar
          </Button>
        </div>
      ),
    },
  ]

  const visibleRows = activeTab === 'recurrentes' ? recurring : additional

  return (
    <div className="page-stack page-stack--workspace">
      <PageHeader
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setFieldErrors({})
              setFormState({ type: activeTab === 'recurrentes' ? 'recurrente' : 'adicional', item: null })
            }}
          >
            Registrar gasto
          </Button>
        }
        description="Administra los gastos recurrentes del negocio y los gastos adicionales de cada mes."
        eyebrow="Finanzas"
        title="Gastos"
      />

      <PeriodToolbar
        id="gastos-periodo"
        label="Periodo de gastos"
        onChange={(value) => {
          setSelectedPeriod(value)
          setActionMessage('')
        }}
        value={selectedPeriod}
      />

      <ErrorMessage
        action={pageError ? <Button onClick={() => loadExpenses()} variant="secondary">Reintentar</Button> : null}
      >
        {pageError}
      </ErrorMessage>
      {actionMessage ? <div className="success-message" role="status">{actionMessage}</div> : null}

      <ExpenseSummary selectedPeriod={selectedPeriod} summary={summary} />

      <div aria-label="Tipo de gastos" className="expense-tabs" role="tablist">
        <button
          aria-controls="gastos-panel"
          aria-selected={activeTab === 'recurrentes'}
          id="gastos-tab-recurrentes"
          onClick={() => setActiveTab('recurrentes')}
          role="tab"
          type="button"
        >
          <CalendarClock aria-hidden="true" size={18} />
          <span><strong>Gastos fijos recurrentes</strong><small>Se repiten durante su vigencia</small></span>
        </button>
        <button
          aria-controls="gastos-panel"
          aria-selected={activeTab === 'adicionales'}
          id="gastos-tab-adicionales"
          onClick={() => setActiveTab('adicionales')}
          role="tab"
          type="button"
        >
          <ReceiptText aria-hidden="true" size={18} />
          <span><strong>Gastos adicionales</strong><small>Ocurren solo en el periodo</small></span>
        </button>
      </div>

      <FiltersToolbar
        hasFilters={hasSearch}
        isLoading={isLoading}
        onClear={() => setSearch('')}
        resultCount={visibleRows.length}
      >
        <Input
          icon={Search}
          id="gastos-buscar"
          label="Buscar por concepto"
          name="buscar"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={activeTab === 'recurrentes' ? 'Ej. internet o arriendo' : 'Ej. reparación o publicidad'}
          type="search"
          value={search}
        />
      </FiltersToolbar>

      <Card
        aria-busy={isLoading}
        aria-labelledby={`gastos-tab-${activeTab}`}
        className="commercial-list-card"
        id="gastos-panel"
        role="tabpanel"
      >
        {isLoading ? (
          <LoadingState label="Cargando gastos" />
        ) : (
          <DataTable
            caption={activeTab === 'recurrentes'
              ? 'Configuración de gastos fijos recurrentes'
              : `Gastos adicionales de ${getPeriodLabel(selectedPeriod)}`}
            columns={activeTab === 'recurrentes' ? recurringColumns : additionalColumns}
            emptyAction={
              hasSearch ? (
                <Button onClick={() => setSearch('')} variant="secondary">Limpiar búsqueda</Button>
              ) : (
                <Button
                  icon={Plus}
                  onClick={() => setFormState({
                    type: activeTab === 'recurrentes' ? 'recurrente' : 'adicional',
                    item: null,
                  })}
                >
                  Registrar gasto
                </Button>
              )
            }
            emptyMessage={
              hasSearch
                ? 'No hay gastos que coincidan con la búsqueda.'
                : activeTab === 'recurrentes'
                  ? 'Registra los compromisos mensuales del negocio para incluirlos automáticamente en cada periodo.'
                  : 'No hay gastos adicionales registrados en este periodo.'
            }
            emptyTitle={
              hasSearch
                ? 'Sin coincidencias'
                : activeTab === 'recurrentes'
                  ? 'No hay gastos fijos recurrentes configurados'
                  : 'Sin gastos adicionales'
            }
            mobileTitle={(item) => `${item.concepto} · ${formatCurrency(item.valor_vigente ?? item.valor)}`}
            rows={visibleRows}
          />
        )}
      </Card>

      <Modal
        isOpen={Boolean(formState && formState.type !== 'recurrente-general')}
        onClose={closeMutationModal}
        title={formState?.item ? 'Editar gasto adicional' : 'Registrar gasto'}
      >
        {formState && formState.type !== 'recurrente-general' ? (
          <ExpenseForm
            errors={fieldErrors}
            initialItem={formState.item}
            initialType={formState.type}
            isSubmitting={isSaving}
            key={`${formState.type}-${formState.item?.id ?? 'nuevo'}-${selectedPeriod}`}
            onCancel={closeMutationModal}
            onSubmit={submitExpense}
            selectedPeriod={selectedPeriod}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={formState?.type === 'recurrente-general'}
        onClose={closeMutationModal}
        title={`Editar información de ${formState?.item?.concepto ?? 'gasto recurrente'}`}
      >
        {formState?.item ? (
          <RecurringGeneralForm
            errors={fieldErrors}
            initialItem={formState.item}
            isSubmitting={isSaving}
            key={formState.item.id}
            onCancel={closeMutationModal}
            onSubmit={(payload) => submitExpense('recurrente', payload)}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(adjustingItem)}
        onClose={closeMutationModal}
        title={`Ajustar valor de ${adjustingItem?.concepto ?? ''}`}
      >
        {adjustingItem ? (
          <RecurringAdjustmentForm
            errors={fieldErrors}
            initialItem={adjustingItem}
            isSubmitting={isSaving}
            key={`${adjustingItem.id}-${selectedPeriod}`}
            onCancel={closeMutationModal}
            onSubmit={submitAdjustment}
            selectedPeriod={selectedPeriod}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(statusItem)}
        onClose={closeMutationModal}
        title={statusItem?.action === 'desactivar' ? 'Desactivar gasto recurrente' : 'Reactivar gasto recurrente'}
      >
        {statusItem ? (
          <RecurringStatusForm
            action={statusItem.action}
            errors={fieldErrors}
            initialItem={statusItem.item}
            isSubmitting={isSaving}
            key={`${statusItem.action}-${statusItem.item.id}`}
            onCancel={closeMutationModal}
            onSubmit={submitStatus}
            selectedPeriod={selectedPeriod}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(deletingItem)}
        onClose={() => {
          if (!isSaving) setDeletingItem(null)
        }}
        title="Eliminar gasto adicional"
      >
        <div className="confirm-dialog">
          <p>
            “{deletingItem?.concepto}” dejará de contar en Dashboard y Reportes.
            El registro se conservará internamente para mantener la trazabilidad.
          </p>
          <div className="form-actions">
            <Button disabled={isSaving} onClick={() => setDeletingItem(null)} variant="secondary">
              Mantener gasto
            </Button>
            <Button icon={Trash2} isLoading={isSaving} loadingLabel="Eliminando" onClick={deleteAdditional}>
              Eliminar gasto
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(historyState)}
        onClose={() => setHistoryState(null)}
        title={`Historial de ${historyState?.item?.concepto ?? 'gasto recurrente'}`}
      >
        {historyState?.loading ? <LoadingState label="Cargando historial" /> : null}
        {historyState?.error ? <ErrorMessage>{historyState.error}</ErrorMessage> : null}
        {historyState?.data ? (
          <div className="expense-history">
            <section>
              <h3>Valores programados</h3>
              <ul>
                {historyState.data.versiones.map((version) => (
                  <li key={version.id}>
                    <span>{humanPeriod(version.vigente_desde)} — {humanPeriod(version.vigente_hasta)}</span>
                    <strong>{formatCurrency(version.valor_mensual)} al mes</strong>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Excepciones mensuales</h3>
              {historyState.data.ajustes.length ? (
                <ul>
                  {historyState.data.ajustes.map((adjustment) => (
                    <li key={adjustment.id}>
                      <span>{humanPeriod(adjustment.periodo)}{adjustment.observaciones ? ` · ${adjustment.observaciones}` : ''}</span>
                      <strong>{formatCurrency(adjustment.valor)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No se han registrado excepciones mensuales.</p>
              )}
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
