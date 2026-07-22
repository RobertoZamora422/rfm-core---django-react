import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Edit3, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { FiltersToolbar } from '../../components/ui/FiltersToolbar'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SummaryStrip } from '../../components/ui/SummaryStrip'
import { Textarea } from '../../components/ui/Textarea'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'
import { contratosService, costosDirectosService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { formatCurrency, formatDate, formatPhone, toDateInputValue } from '../../utils/formatters'

const initialFilters = {
  buscar: '',
  contrato: '',
  desde: '',
  hasta: '',
}

const initialSummary = {
  cantidad: 0,
  total_registrado: '0.00',
  total_financiero: '0.00',
  historicos_cancelados: 0,
}

function getEmptyForm(contrato = '') {
  return {
    contrato,
    concepto: '',
    valor: '',
    fecha: toDateInputValue(),
    observaciones: '',
  }
}

function toArray(data) {
  return Array.isArray(data) ? data : data?.results ?? []
}

function buildQueryParams(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
}

function buildContractLabel(contrato) {
  if (contrato.contrato_descripcion) return contrato.contrato_descripcion

  return `Contrato #${contrato.id} · ${contrato.cliente_nombre} · ${contrato.tipo_evento_nombre} · ${formatDate(
    contrato.fecha_evento,
  )}`
}

function buildContractOptions(contratos, initialValues) {
  if (!initialValues?.contrato) return contratos
  if (contratos.some((contrato) => String(contrato.id) === String(initialValues.contrato))) {
    return contratos
  }

  return [
    ...contratos,
    {
      id: initialValues.contrato,
      contrato_descripcion:
        initialValues.contrato_descripcion || `Contrato #${initialValues.contrato} · registro histórico`,
    },
  ]
}

function buildInitialForm(item) {
  if (!item) return getEmptyForm()

  return {
    contrato: item.contrato ?? '',
    concepto: item.concepto ?? '',
    valor: item.valor ?? '',
    fecha: item.fecha ?? toDateInputValue(),
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
  const contractOptions = buildContractOptions(contratos, initialValues)
  const isHistoricalContract = initialValues?.contrato_estado === 'cancelado'
  useFocusFirstError(errors)

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
        disabled={isLoadingContracts || isHistoricalContract}
        error={errors.contrato}
        helpText={
          isHistoricalContract
            ? 'El contrato está cancelado. Puedes corregir este registro histórico, pero no reasignarlo.'
            : 'Identifica el contrato por cliente, evento y fecha.'
        }
        id="costo-directo-contrato"
        label="Contrato"
        name="contrato"
        onChange={handleChange}
        required
        value={form.contrato}
      >
        <option value="">Seleccione un contrato confirmado</option>
        {contractOptions.map((contrato) => (
          <option key={contrato.id} value={contrato.id}>
            {buildContractLabel(contrato)}
          </option>
        ))}
      </Select>
      <div className="form-grid form-grid--three">
        <Input
          error={errors.concepto}
          id="costo-directo-concepto"
          label="Concepto"
          maxLength={150}
          name="concepto"
          onChange={handleChange}
          placeholder="Ej. Catering, decoración o transporte"
          required
          value={form.concepto}
        />
        <Input
          error={errors.valor}
          id="costo-directo-valor"
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
          error={errors.fecha}
          helpText="Fecha en la que se registró o comprobó el costo."
          id="costo-directo-fecha"
          label="Fecha de registro"
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
        label="Observaciones (opcional)"
        name="observaciones"
        onChange={handleChange}
        value={form.observaciones}
      />
      <div className="form-actions">
        <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button isLoading={isSubmitting} loadingLabel="Guardando costo" type="submit">
          {initialValues?.id ? 'Guardar cambios' : 'Registrar costo'}
        </Button>
      </div>
    </form>
  )
}

export function CostosDirectosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const contratoParam = searchParams.get('contrato') ?? ''
  const shouldOpenCreateFromQuery = searchParams.get('nuevo') === '1'
  const [costos, setCostos] = useState([])
  const [contratos, setContratos] = useState([])
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    buscar: searchParams.get('buscar') ?? '',
    contrato: contratoParam,
    desde: searchParams.get('desde') ?? '',
    hasta: searchParams.get('hasta') ?? '',
  }))
  const debouncedSearch = useDebouncedValue(filters.buscar, 350)
  const appliedFilters = useMemo(
    () => ({ ...filters, buscar: debouncedSearch }),
    [debouncedSearch, filters],
  )
  const queryParams = useMemo(() => buildQueryParams(appliedFilters), [appliedFilters])
  const [summary, setSummary] = useState(initialSummary)
  const [fieldErrors, setFieldErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [newItemInitialValues, setNewItemInitialValues] = useState(() =>
    shouldOpenCreateFromQuery ? getEmptyForm(contratoParam) : null,
  )
  const [deletingItem, setDeletingItem] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(shouldOpenCreateFromQuery)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingContracts, setIsLoadingContracts] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formTrigger, setFormTrigger] = useState(null)
  const requestIdRef = useRef(0)
  const hasFilters = Object.values(appliedFilters).some(Boolean)

  const loadCostos = useCallback(async ({ silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (!silent) setIsLoading(true)
    if (!silent) setPageError('')

    try {
      const [data, summaryData] = await Promise.all([
        costosDirectosService.list(queryParams),
        costosDirectosService.resumen(queryParams),
      ])
      if (requestId === requestIdRef.current) {
        setCostos(toArray(data))
        setSummary(summaryData)
        setPageError('')
      }
    } catch (error) {
      if (requestId === requestIdRef.current) setPageError(getApiErrorMessage(error))
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [queryParams])

  const loadContratos = useCallback(async () => {
    setIsLoadingContracts(true)
    try {
      const data = await contratosService.list({ estado_contrato: 'confirmado' })
      setContratos(toArray(data))
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoadingContracts(false)
    }
  }, [])

  useEffect(() => {
    setSearchParams(queryParams, { replace: true })
  }, [queryParams, setSearchParams])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadCostos, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCostos])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadContratos, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadContratos])

  useAutoRefresh(loadCostos, { refreshOnMutation: false })

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
    setActionMessage('')
  }

  const handleClearFilters = () => {
    setFilters(initialFilters)
    setActionMessage('')
  }

  const openCreate = (event) => {
    setFormTrigger(event?.currentTarget ?? null)
    setEditingItem(null)
    setNewItemInitialValues(getEmptyForm(filters.contrato || contratoParam))
    setFieldErrors({})
    setPageError('')
    setActionMessage('')
    setIsFormOpen(true)
  }

  const openEdit = (item, event) => {
    setFormTrigger(event?.currentTarget ?? null)
    setEditingItem(item)
    setNewItemInitialValues(null)
    setFieldErrors({})
    setPageError('')
    setActionMessage('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) return
    setEditingItem(null)
    setNewItemInitialValues(null)
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
        await costosDirectosService.update(editingItem.id, payload)
        setActionMessage(`El costo “${payload.concepto}” se actualizó correctamente.`)
      } else {
        await costosDirectosService.create(payload)
        setActionMessage(`El costo “${payload.concepto}” se registró correctamente.`)
      }
      setEditingItem(null)
      setNewItemInitialValues(null)
      setIsFormOpen(false)
      await loadCostos({ silent: true })
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
      await costosDirectosService.remove(deletingItem.id)
      setDeletingItem(null)
      setActionMessage(`El costo “${deletedConcept}” se eliminó del registro activo.`)
      await loadCostos({ silent: true })
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
        <div className="stacked-cell">
          <Link className="text-link" to={`/contratos/${item.contrato}`}>
            Contrato #{item.contrato}
          </Link>
          <StatusBadge status={item.contrato_estado}>
            {item.contrato_estado === 'cancelado' ? 'Cancelado' : 'Confirmado'}
          </StatusBadge>
        </div>
      ),
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (item) => (
        <div className="stacked-cell">
          <strong>{item.cliente_nombre}</strong>
          <span>{formatPhone(item.cliente_telefono)}</span>
        </div>
      ),
    },
    {
      key: 'evento',
      header: 'Evento',
      render: (item) => (
        <div className="stacked-cell">
          <strong>{item.tipo_evento_nombre}</strong>
          <span>{formatDate(item.fecha_evento)}</span>
        </div>
      ),
    },
    { key: 'concepto', header: 'Concepto' },
    {
      key: 'valor',
      header: 'Valor',
      align: 'right',
      render: (item) => formatCurrency(item.valor),
    },
    {
      key: 'fecha',
      header: 'Registrado',
      render: (item) => formatDate(item.fecha),
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
            Nuevo costo
          </Button>
        }
        description="Registra y consulta los costos vinculados a cada evento contratado."
        eyebrow="Finanzas"
        title="Costos directos"
      />

      <ErrorMessage
        action={pageError ? <Button onClick={() => loadCostos()} variant="secondary">Reintentar</Button> : null}
      >
        {pageError}
      </ErrorMessage>
      {actionMessage ? <div className="success-message" role="status">{actionMessage}</div> : null}

      <SummaryStrip
        groups={[
          {
            label: hasFilters ? 'Resultados filtrados' : 'Costos registrados',
            items: [
              { label: summary.cantidad === 1 ? 'registro' : 'registros', value: summary.cantidad },
              { label: 'Total registrado', value: formatCurrency(summary.total_registrado), tone: 'notice' },
            ],
          },
          {
            label: 'Lectura financiera',
            items: [
              { label: 'En contratos confirmados', value: formatCurrency(summary.total_financiero), tone: 'success' },
              ...(summary.historicos_cancelados
                ? [{ label: 'históricos cancelados', value: summary.historicos_cancelados, tone: 'muted' }]
                : []),
            ],
          },
        ]}
      />

      <FiltersToolbar
        hasFilters={hasFilters}
        isLoading={isLoading}
        onClear={handleClearFilters}
        resultCount={summary.cantidad}
      >
        <Input
          icon={Search}
          id="costos-buscar"
          label="Buscar"
          name="buscar"
          onChange={handleFilterChange}
          placeholder="Cliente, teléfono o concepto"
          type="search"
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
          <option value="">Todos los contratos confirmados</option>
          {contratos.map((contrato) => (
            <option key={contrato.id} value={contrato.id}>
              {buildContractLabel(contrato)}
            </option>
          ))}
        </Select>
        <Input
          id="costos-desde"
          label="Registro desde"
          name="desde"
          onChange={handleFilterChange}
          type="date"
          value={filters.desde}
        />
        <Input
          id="costos-hasta"
          label="Registro hasta"
          name="hasta"
          onChange={handleFilterChange}
          type="date"
          value={filters.hasta}
        />
      </FiltersToolbar>

      <Card className="commercial-list-card">
        {isLoading ? (
          <LoadingState label="Cargando costos directos" />
        ) : (
          <DataTable
            caption="Costos directos asociados a contratos"
            columns={columns}
            emptyAction={
              hasFilters ? (
                <Button onClick={handleClearFilters} variant="secondary">Limpiar filtros</Button>
              ) : (
                <Button icon={Plus} onClick={openCreate}>Registrar primer costo</Button>
              )
            }
            emptyMessage={
              hasFilters
                ? 'No hay costos que coincidan con la búsqueda o los filtros actuales.'
                : 'Registra un costo cuando exista un gasto directamente relacionado con un contrato.'
            }
            emptyTitle={hasFilters ? 'Sin coincidencias' : 'Aún no hay costos directos'}
            getRowClassName={(item) => item.contrato_estado === 'cancelado' ? 'data-table__row--cancelled' : ''}
            mobileTitle={(item) => `${item.concepto} · ${formatCurrency(item.valor)}`}
            rows={costos}
          />
        )}
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        returnFocusElement={formTrigger}
        title={editingItem ? `Editar costo #${editingItem.id}` : 'Registrar costo directo'}
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
        onClose={() => {
          if (!isDeleting) setDeletingItem(null)
        }}
        title="Eliminar costo directo"
      >
        <div className="confirm-dialog">
          <p>
            Se eliminará “{deletingItem?.concepto}” por {formatCurrency(deletingItem?.valor)} del registro activo.
            Se conservará en el historial, pero dejará de contar en rentabilidad, dashboard y reportes.
          </p>
          <div className="form-actions">
            <Button disabled={isDeleting} onClick={() => setDeletingItem(null)} variant="secondary">
              Mantener costo
            </Button>
            <Button icon={Trash2} isLoading={isDeleting} loadingLabel="Eliminando" onClick={handleDelete}>
              Eliminar costo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
