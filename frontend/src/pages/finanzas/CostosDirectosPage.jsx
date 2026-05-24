import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Edit3, FilterX, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { contratosService, costosDirectosService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { formatCurrency, formatDate } from '../../utils/formatters'

const initialFilters = {
  buscar: '',
  contrato: '',
  desde: '',
  hasta: '',
}

const emptyForm = {
  contrato: '',
  concepto: '',
  valor: '',
  fecha: new Date().toISOString().slice(0, 10),
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

function buildContractLabel(contrato) {
  return `Contrato #${contrato.id} - ${contrato.cliente_nombre} - ${contrato.tipo_evento_nombre} (${formatDate(
    contrato.fecha_evento,
  )})`
}

function buildInitialForm(item) {
  if (!item) return emptyForm

  return {
    contrato: item.contrato ?? '',
    concepto: item.concepto ?? '',
    valor: item.valor ?? '',
    fecha: item.fecha ?? emptyForm.fecha,
    observaciones: item.observaciones ?? '',
  }
}

function CostoDirectoForm({
  contratos,
  errors,
  initialValues,
  isLoadingContracts,
  isSubmitting,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(() => buildInitialForm(initialValues))

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      ...form,
      contrato: form.contrato ? Number(form.contrato) : '',
    })
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit}>
      <Select
        disabled={isLoadingContracts}
        error={errors.contrato}
        id="costo-directo-contrato"
        label="Contrato"
        name="contrato"
        onChange={handleChange}
        required
        value={form.contrato}
      >
        <option value="">Seleccione un contrato</option>
        {contratos.map((contrato) => (
          <option key={contrato.id} value={contrato.id}>
            {buildContractLabel(contrato)}
          </option>
        ))}
      </Select>
      <div className="form-grid">
        <Input
          error={errors.concepto}
          id="costo-directo-concepto"
          label="Concepto"
          name="concepto"
          onChange={handleChange}
          required
          value={form.concepto}
        />
        <Input
          error={errors.valor}
          id="costo-directo-valor"
          label="Valor"
          min="0"
          name="valor"
          onChange={handleChange}
          required
          step="0.01"
          type="number"
          value={form.valor}
        />
        <Input
          error={errors.fecha}
          id="costo-directo-fecha"
          label="Fecha"
          name="fecha"
          onChange={handleChange}
          required
          type="date"
          value={form.fecha}
        />
      </div>
      <Textarea
        error={errors.observaciones}
        id="costo-directo-observaciones"
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
          Guardar costo directo
        </Button>
      </div>
    </form>
  )
}

export function CostosDirectosPage() {
  const [searchParams] = useSearchParams()
  const contratoParam = searchParams.get('contrato') ?? ''
  const shouldOpenCreateFromQuery = searchParams.get('nuevo') === '1'
  const [costos, setCostos] = useState([])
  const [contratos, setContratos] = useState([])
  const [filters, setFilters] = useState(() => ({ ...initialFilters, contrato: contratoParam }))
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...initialFilters, contrato: contratoParam }))
  const [fieldErrors, setFieldErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [newItemInitialValues, setNewItemInitialValues] = useState(() =>
    shouldOpenCreateFromQuery ? { ...emptyForm, contrato: contratoParam } : null,
  )
  const [deletingItem, setDeletingItem] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(shouldOpenCreateFromQuery)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingContracts, setIsLoadingContracts] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadCostos = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const data = await costosDirectosService.list(buildQueryParams(appliedFilters))
      setCostos(toArray(data))
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [appliedFilters])

  const loadContratos = useCallback(async () => {
    setIsLoadingContracts(true)

    try {
      const data = await contratosService.list()
      setContratos(toArray(data))
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoadingContracts(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadCostos, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCostos])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadContratos, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadContratos])

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
    setNewItemInitialValues(null)
    setFieldErrors({})
    setPageError('')
    setIsFormOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setNewItemInitialValues(null)
    setFieldErrors({})
    setPageError('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setEditingItem(null)
    setNewItemInitialValues(null)
    setIsFormOpen(false)
  }

  const handleSubmit = async (payload) => {
    setIsSaving(true)
    setFieldErrors({})
    setPageError('')
    setActionMessage('')

    try {
      if (editingItem) {
        await costosDirectosService.update(editingItem.id, payload)
        setActionMessage(`Costo directo #${editingItem.id} actualizado.`)
      } else {
        const created = await costosDirectosService.create(payload)
        setActionMessage(`Costo directo #${created.id} registrado.`)
      }
      closeForm()
      await loadCostos()
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
      await costosDirectosService.remove(deletingItem.id)
      setActionMessage(`Costo directo #${deletingItem.id} eliminado.`)
      setDeletingItem(null)
      await loadCostos()
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    {
      key: 'contrato',
      header: 'Contrato',
      render: (item) => (
        <Link className="text-link" to={`/contratos/${item.contrato}`}>
          {item.contrato_label || `Contrato #${item.contrato}`}
        </Link>
      ),
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (item) => (
        <div className="stacked-cell">
          <strong>{item.cliente_nombre}</strong>
          <span>{item.cliente_telefono || '-'}</span>
        </div>
      ),
    },
    { key: 'tipo_evento_nombre', header: 'Evento' },
    { key: 'concepto', header: 'Concepto' },
    {
      key: 'valor',
      header: 'Valor',
      render: (item) => formatCurrency(item.valor),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item) => formatDate(item.fecha),
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
            <Button icon={RefreshCw} onClick={loadCostos} variant="secondary">
              Actualizar
            </Button>
            <Button icon={Plus} onClick={openCreate}>
              Nuevo costo directo
            </Button>
          </>
        }
        description="Registra costos asociados directamente a contratos."
        title="Costos directos"
      />

      <ErrorMessage>{pageError}</ErrorMessage>
      {actionMessage ? <div className="success-message">{actionMessage}</div> : null}

      <Card>
        <form className="filters-grid filters-grid--costs" onSubmit={handleApplyFilters}>
          <Input
            id="costos-buscar"
            label="Buscar"
            name="buscar"
            onChange={handleFilterChange}
            placeholder="Cliente, telefono o concepto"
            value={filters.buscar}
          />
          <Select
            disabled={isLoadingContracts}
            id="costos-contrato"
            label="Contrato"
            name="contrato"
            onChange={handleFilterChange}
            value={filters.contrato}
          >
            <option value="">Todos los contratos</option>
            {contratos.map((contrato) => (
              <option key={contrato.id} value={contrato.id}>
                {buildContractLabel(contrato)}
              </option>
            ))}
          </Select>
          <Input
            id="costos-desde"
            label="Fecha desde"
            name="desde"
            onChange={handleFilterChange}
            type="date"
            value={filters.desde}
          />
          <Input
            id="costos-hasta"
            label="Fecha hasta"
            name="hasta"
            onChange={handleFilterChange}
            type="date"
            value={filters.hasta}
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
          <LoadingState label="Cargando costos directos" />
        ) : (
          <DataTable
            columns={columns}
            emptyMessage="No hay costos directos para los filtros aplicados."
            mobileTitle={(item) => `${item.concepto} - ${item.contrato_label}`}
            rows={costos}
          />
        )}
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingItem ? `Editar costo directo #${editingItem.id}` : 'Nuevo costo directo'}
      >
        <CostoDirectoForm
          contratos={contratos}
          errors={fieldErrors}
          initialValues={editingItem ?? newItemInitialValues}
          isLoadingContracts={isLoadingContracts}
          isSubmitting={isSaving}
          key={editingItem?.id ?? newItemInitialValues?.contrato ?? 'nuevo'}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </Modal>

      <Modal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Eliminar costo directo"
      >
        <div className="confirm-dialog">
          <p>
            Se marcara como eliminado el costo directo #{deletingItem?.id}. No se borrara
            fisicamente, pero dejara de contar en rentabilidad, dashboard y reportes.
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
