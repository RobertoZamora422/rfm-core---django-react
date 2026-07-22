import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Edit3, Plus, Search, Trash2, WalletCards } from 'lucide-react'
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
import { Textarea } from '../../components/ui/Textarea'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'
import { gastosFijosService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { formatCurrency } from '../../utils/formatters'
import {
  filtersToPeriod,
  getCurrentPeriodValue,
  getPeriodLabel,
  periodToFilters,
} from '../../utils/periods'

function toArray(data) {
  return Array.isArray(data) ? data : data?.results ?? []
}

function buildInitialForm(item, defaultPeriod) {
  if (!item) {
    return {
      concepto: '',
      valor: '',
      periodo: defaultPeriod,
      observaciones: '',
    }
  }

  return {
    concepto: item.concepto ?? '',
    valor: item.valor ?? '',
    periodo: filtersToPeriod(item),
    observaciones: item.observaciones ?? '',
  }
}

function GastoFijoForm({ errors, initialValues, isSubmitting, onCancel, onSubmit, selectedPeriod }) {
  const [form, setForm] = useState(() => buildInitialForm(initialValues, selectedPeriod))
  useFocusFirstError(errors)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const period = periodToFilters(form.periodo)
    onSubmit({
      concepto: form.concepto,
      valor: form.valor,
      mes: Number(period.mes),
      anio: Number(period.anio),
      observaciones: form.observaciones,
    })
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit}>
      <Input
        error={errors.concepto}
        id="gasto-fijo-concepto"
        label="Concepto"
        maxLength={150}
        name="concepto"
        onChange={handleChange}
        placeholder="Ej. Internet, arriendo o mantenimiento"
        required
        value={form.concepto}
      />
      <div className="form-grid">
        <Input
          error={errors.valor}
          id="gasto-fijo-valor"
          inputMode="decimal"
          label="Valor (USD)"
          min="0"
          name="valor"
          onChange={handleChange}
          required
          step="0.01"
          type="number"
          value={form.valor}
        />
        <Input
          error={errors.mes || errors.anio}
          helpText="El gasto se incluirá en los resultados de este mes."
          id="gasto-fijo-periodo"
          label="Mes y año"
          name="periodo"
          onChange={handleChange}
          required
          type="month"
          value={form.periodo}
        />
      </div>
      <Textarea
        error={errors.observaciones}
        id="gasto-fijo-observaciones"
        label="Observaciones (opcional)"
        name="observaciones"
        onChange={handleChange}
        value={form.observaciones}
      />
      <div className="form-actions">
        <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button isLoading={isSubmitting} loadingLabel="Guardando gasto" type="submit">
          {initialValues?.id ? 'Guardar cambios' : 'Registrar gasto'}
        </Button>
      </div>
    </form>
  )
}

export function GastosFijosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPeriod = searchParams.get('periodo') || getCurrentPeriodValue()
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod)
  const [search, setSearch] = useState(searchParams.get('concepto') ?? '')
  const debouncedSearch = useDebouncedValue(search, 350)
  const periodParams = useMemo(() => periodToFilters(selectedPeriod), [selectedPeriod])
  const listParams = useMemo(
    () => ({ ...periodParams, ...(debouncedSearch ? { concepto: debouncedSearch } : {}) }),
    [debouncedSearch, periodParams],
  )
  const [gastos, setGastos] = useState([])
  const [totalPeriodo, setTotalPeriodo] = useState('0.00')
  const [fieldErrors, setFieldErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formTrigger, setFormTrigger] = useState(null)
  const requestIdRef = useRef(0)
  const hasSearch = Boolean(debouncedSearch)

  const loadGastos = useCallback(async ({ silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (!silent) setIsLoading(true)
    if (!silent) setPageError('')

    try {
      const [data, resumen] = await Promise.all([
        gastosFijosService.list(listParams),
        gastosFijosService.resumen(periodParams),
      ])
      if (requestId === requestIdRef.current) {
        setGastos(toArray(data))
        setTotalPeriodo(resumen.total_periodo ?? '0.00')
        setPageError('')
      }
    } catch (error) {
      if (requestId === requestIdRef.current) setPageError(getApiErrorMessage(error))
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [listParams, periodParams])

  useEffect(() => {
    setSearchParams(
      { periodo: selectedPeriod, ...(debouncedSearch ? { concepto: debouncedSearch } : {}) },
      { replace: true },
    )
  }, [debouncedSearch, selectedPeriod, setSearchParams])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadGastos, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadGastos])

  useAutoRefresh(loadGastos, { refreshOnMutation: false })

  const openCreate = (event) => {
    setFormTrigger(event?.currentTarget ?? null)
    setEditingItem(null)
    setFieldErrors({})
    setPageError('')
    setActionMessage('')
    setIsFormOpen(true)
  }

  const openEdit = (item, event) => {
    setFormTrigger(event?.currentTarget ?? null)
    setEditingItem(item)
    setFieldErrors({})
    setPageError('')
    setActionMessage('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) return
    setEditingItem(null)
    setIsFormOpen(false)
  }

  const handleSubmit = async (payload) => {
    if (isSaving) return
    setIsSaving(true)
    setFieldErrors({})
    setPageError('')
    setActionMessage('')

    try {
      if (editingItem) {
        await gastosFijosService.update(editingItem.id, payload)
        setActionMessage(`El gasto “${payload.concepto}” se actualizó correctamente.`)
      } else {
        await gastosFijosService.create(payload)
        setActionMessage(`El gasto “${payload.concepto}” se registró correctamente.`)
      }
      setEditingItem(null)
      setIsFormOpen(false)
      await loadGastos({ silent: true })
    } catch (error) {
      const errors = getApiFieldErrors(error)
      setFieldErrors(errors)
      if (!Object.keys(errors).length) setPageError(getApiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem || isDeleting) return
    setIsDeleting(true)
    setPageError('')
    setActionMessage('')

    try {
      const deletedConcept = deletingItem.concepto
      await gastosFijosService.remove(deletingItem.id)
      setDeletingItem(null)
      setActionMessage(`El gasto “${deletedConcept}” se eliminó del periodo.`)
      await loadGastos({ silent: true })
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
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
      key: 'periodo',
      header: 'Periodo',
      render: (item) => getPeriodLabel(filtersToPeriod(item)),
    },
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
          <Button icon={Edit3} onClick={(event) => openEdit(item, event)} variant="secondary">
            Editar
          </Button>
          <Button icon={Trash2} onClick={() => setDeletingItem(item)} variant="ghost">
            Eliminar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="page-stack page-stack--workspace">
      <PageHeader
        actions={
          <Button icon={Plus} onClick={openCreate}>
            Nuevo gasto
          </Button>
        }
        description="Administra los gastos operativos mensuales del negocio."
        eyebrow="Finanzas"
        title="Gastos fijos"
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
        action={pageError ? <Button onClick={() => loadGastos()} variant="secondary">Reintentar</Button> : null}
      >
        {pageError}
      </ErrorMessage>
      {actionMessage ? <div className="success-message" role="status">{actionMessage}</div> : null}

      <Card className="period-total-card">
        <span className="period-total-card__icon" aria-hidden="true"><WalletCards size={22} /></span>
        <div>
          <span>Total de gastos del periodo</span>
          <strong>{formatCurrency(totalPeriodo)}</strong>
          <small>{getPeriodLabel(selectedPeriod)} · incluye todos los gastos activos del mes</small>
        </div>
      </Card>

      <FiltersToolbar
        hasFilters={hasSearch}
        isLoading={isLoading}
        onClear={() => {
          setSearch('')
          setActionMessage('')
        }}
        resultCount={gastos.length}
      >
        <Input
          icon={Search}
          id="gastos-concepto"
          label="Buscar por concepto"
          name="concepto"
          onChange={(event) => {
            setSearch(event.target.value)
            setActionMessage('')
          }}
          placeholder="Ej. internet o mantenimiento"
          type="search"
          value={search}
        />
      </FiltersToolbar>

      <Card className="commercial-list-card">
        {isLoading ? (
          <LoadingState label="Cargando gastos fijos" />
        ) : (
          <DataTable
            caption={`Gastos fijos de ${getPeriodLabel(selectedPeriod)}`}
            columns={columns}
            emptyAction={
              hasSearch ? (
                <Button onClick={() => setSearch('')} variant="secondary">Limpiar búsqueda</Button>
              ) : (
                <Button icon={Plus} onClick={openCreate}>Registrar gasto del periodo</Button>
              )
            }
            emptyMessage={
              hasSearch
                ? 'No hay gastos del periodo que coincidan con el concepto buscado.'
                : `No existen gastos activos registrados para ${getPeriodLabel(selectedPeriod)}.`
            }
            emptyTitle={hasSearch ? 'Sin coincidencias' : 'Periodo sin gastos registrados'}
            mobileTitle={(item) => `${item.concepto} · ${formatCurrency(item.valor)}`}
            rows={gastos}
          />
        )}
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        returnFocusElement={formTrigger}
        title={editingItem ? `Editar gasto #${editingItem.id}` : 'Registrar gasto fijo'}
      >
        <GastoFijoForm
          errors={fieldErrors}
          initialValues={editingItem}
          isSubmitting={isSaving}
          key={editingItem?.id ?? `nuevo-${selectedPeriod}`}
          onCancel={closeForm}
          onSubmit={handleSubmit}
          selectedPeriod={selectedPeriod}
        />
      </Modal>

      <Modal
        isOpen={Boolean(deletingItem)}
        onClose={() => {
          if (!isDeleting) setDeletingItem(null)
        }}
        title="Eliminar gasto fijo"
      >
        <div className="confirm-dialog">
          <p>
            Se eliminará “{deletingItem?.concepto}” por {formatCurrency(deletingItem?.valor)} del periodo.
            Se conservará en el historial, pero dejará de contar en dashboard y reportes.
          </p>
          <div className="form-actions">
            <Button disabled={isDeleting} onClick={() => setDeletingItem(null)} variant="secondary">
              Mantener gasto
            </Button>
            <Button icon={Trash2} isLoading={isDeleting} loadingLabel="Eliminando" onClick={handleDelete}>
              Eliminar gasto
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
