import { useCallback, useEffect, useState } from 'react'
import { Edit3, FilterX, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Input } from '../../components/ui/Input'
import { KpiCard } from '../../components/ui/KpiCard'
import { LoadingState } from '../../components/ui/LoadingState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { gastosFijosService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { formatCurrency } from '../../utils/formatters'

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
  concepto: '',
}

const emptyForm = {
  concepto: '',
  valor: '',
  mes: currentMonth,
  anio: currentYear,
  observaciones: '',
}

function toArray(data) {
  return Array.isArray(data) ? data : data?.results ?? []
}

function buildQueryParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )
}

function getMonthLabel(value) {
  return monthOptions.find((month) => month.value === String(value))?.label ?? value
}

function getPeriodLabel(filters) {
  if (filters.mes && filters.anio) return `${getMonthLabel(filters.mes)} ${filters.anio}`
  if (filters.mes) return getMonthLabel(filters.mes)
  if (filters.anio) return filters.anio
  return 'Todos los periodos'
}

function buildInitialForm(item) {
  if (!item) return emptyForm

  return {
    concepto: item.concepto ?? '',
    valor: item.valor ?? '',
    mes: String(item.mes ?? currentMonth),
    anio: String(item.anio ?? currentYear),
    observaciones: item.observaciones ?? '',
  }
}

function GastoFijoForm({ errors, initialValues, isSubmitting, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => buildInitialForm(initialValues))

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      ...form,
      mes: form.mes ? Number(form.mes) : '',
      anio: form.anio ? Number(form.anio) : '',
    })
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit}>
      <Input
        error={errors.concepto}
        id="gasto-fijo-concepto"
        label="Concepto"
        name="concepto"
        onChange={handleChange}
        required
        value={form.concepto}
      />
      <div className="form-grid">
        <Input
          error={errors.valor}
          id="gasto-fijo-valor"
          label="Valor"
          min="0"
          name="valor"
          onChange={handleChange}
          required
          step="0.01"
          type="number"
          value={form.valor}
        />
        <Select
          error={errors.mes}
          id="gasto-fijo-mes"
          label="Mes"
          name="mes"
          onChange={handleChange}
          required
          value={form.mes}
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </Select>
        <Input
          error={errors.anio}
          id="gasto-fijo-anio"
          label="Año"
          min="2000"
          name="anio"
          onChange={handleChange}
          required
          type="number"
          value={form.anio}
        />
      </div>
      <Textarea
        error={errors.observaciones}
        id="gasto-fijo-observaciones"
        label="Observaciones"
        name="observaciones"
        onChange={handleChange}
        value={form.observaciones}
      />
      <div className="form-actions">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button isLoading={isSubmitting} type="submit">
          Guardar gasto fijo
        </Button>
      </div>
    </form>
  )
}

export function GastosFijosPage() {
  const [gastos, setGastos] = useState([])
  const [totalPeriodo, setTotalPeriodo] = useState('0.00')
  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [fieldErrors, setFieldErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadGastos = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const params = buildQueryParams(appliedFilters)
      const [data, resumen] = await Promise.all([
        gastosFijosService.list(params),
        gastosFijosService.resumen(params),
      ])
      setGastos(toArray(data))
      setTotalPeriodo(resumen.total_periodo ?? '0.00')
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [appliedFilters])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadGastos, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadGastos])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const handleApplyFilters = (event) => {
    event.preventDefault()
    setActionMessage('')
    setAppliedFilters(filters)
  }

  const handleClearFilters = () => {
    setFilters(initialFilters)
    setAppliedFilters(initialFilters)
    setActionMessage('')
  }

  const openCreate = () => {
    setEditingItem(null)
    setFieldErrors({})
    setPageError('')
    setIsFormOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setFieldErrors({})
    setPageError('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setEditingItem(null)
    setIsFormOpen(false)
  }

  const handleSubmit = async (payload) => {
    setIsSaving(true)
    setFieldErrors({})
    setPageError('')
    setActionMessage('')

    try {
      if (editingItem) {
        await gastosFijosService.update(editingItem.id, payload)
        setActionMessage(`Gasto fijo #${editingItem.id} actualizado.`)
      } else {
        const created = await gastosFijosService.create(payload)
        setActionMessage(`Gasto fijo #${created.id} registrado.`)
      }
      closeForm()
      await loadGastos()
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error))
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    setIsDeleting(true)
    setPageError('')
    setActionMessage('')

    try {
      await gastosFijosService.remove(deletingItem.id)
      setActionMessage(`Gasto fijo #${deletingItem.id} eliminado.`)
      setDeletingItem(null)
      await loadGastos()
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    { key: 'concepto', header: 'Concepto' },
    {
      key: 'valor',
      header: 'Valor',
      render: (item) => formatCurrency(item.valor),
    },
    {
      key: 'mes',
      header: 'Mes',
      render: (item) => getMonthLabel(item.mes),
    },
    { key: 'anio', header: 'Año' },
    {
      key: 'observaciones',
      header: 'Observaciones',
      render: (item) => item.observaciones || '-',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => (
        <div className="table-actions">
          <Button icon={Edit3} onClick={() => openEdit(item)} variant="secondary">
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
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <Button icon={RefreshCw} onClick={loadGastos} variant="secondary">
              Actualizar
            </Button>
            <Button icon={Plus} onClick={openCreate}>
              Nuevo gasto fijo
            </Button>
          </>
        }
        description="Registra gastos operativos mensuales del negocio."
        title="Gastos fijos"
      />

      <ErrorMessage>{pageError}</ErrorMessage>
      {actionMessage ? <div className="success-message">{actionMessage}</div> : null}

      <section className="summary-grid" aria-label="Resumen de gastos fijos">
        <KpiCard
          detail={getPeriodLabel(appliedFilters)}
          label="Total de gastos del periodo"
          value={formatCurrency(totalPeriodo)}
        />
      </section>

      <Card>
        <form className="filters-grid filters-grid--expenses" onSubmit={handleApplyFilters}>
          <Select id="gastos-mes" label="Mes" name="mes" onChange={handleFilterChange} value={filters.mes}>
            <option value="">Todos los meses</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </Select>
          <Input
            id="gastos-anio"
            label="Año"
            min="2000"
            name="anio"
            onChange={handleFilterChange}
            type="number"
            value={filters.anio}
          />
          <Input
            id="gastos-concepto"
            label="Concepto"
            name="concepto"
            onChange={handleFilterChange}
            placeholder="Buscar por concepto"
            value={filters.concepto}
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

      <Card>
        {isLoading ? (
          <LoadingState label="Cargando gastos fijos" />
        ) : (
          <DataTable
            columns={columns}
            emptyMessage="No hay gastos fijos para los filtros aplicados."
            mobileTitle={(item) => `${item.concepto} - ${getMonthLabel(item.mes)} ${item.anio}`}
            rows={gastos}
          />
        )}
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingItem ? `Editar gasto fijo #${editingItem.id}` : 'Nuevo gasto fijo'}
      >
        <GastoFijoForm
          errors={fieldErrors}
          initialValues={editingItem}
          isSubmitting={isSaving}
          key={editingItem?.id ?? 'nuevo'}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </Modal>

      <Modal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Eliminar gasto fijo"
      >
        <div className="confirm-dialog">
          <p>
            Se eliminara el gasto fijo #{deletingItem?.id}. Esta accion solo afecta este registro operativo mensual.
          </p>
          <div className="form-actions">
            <Button onClick={() => setDeletingItem(null)} variant="secondary">
              Cancelar
            </Button>
            <Button icon={Trash2} isLoading={isDeleting} onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
