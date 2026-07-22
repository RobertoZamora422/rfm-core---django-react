import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, Power, PowerOff, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { ErrorMessage } from '../ui/ErrorMessage'
import { FiltersToolbar } from '../ui/FiltersToolbar'
import { Input } from '../ui/Input'
import { LoadingState } from '../ui/LoadingState'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'
import { Pagination } from '../ui/Pagination'
import { Select } from '../ui/Select'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useResource } from '../../hooks/useResource'

function buildInitialFilters(filterDefinitions, searchParams) {
  return Object.fromEntries(
    filterDefinitions.map((filter) => [filter.key, searchParams.get(filter.key) ?? filter.defaultValue ?? '']),
  )
}

function cleanParams(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
}

export function ResourcePage({
  columns,
  createLabel,
  description,
  emptyMessage,
  filterDefinitions = [],
  FormComponent,
  itemLabel,
  mobileTitle,
  service,
  statusConfig,
  title,
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [editingItem, setEditingItem] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formTrigger, setFormTrigger] = useState(null)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [actionMessage, setActionMessage] = useState('')
  const [filters, setFilters] = useState(() => buildInitialFilters(filterDefinitions, searchParams))
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1))
  const searchKey = filterDefinitions.find((filter) => filter.type === 'search')?.key
  const debouncedSearch = useDebouncedValue(searchKey ? filters[searchKey] : '', 350)
  const appliedFilters = useMemo(
    () => ({ ...filters, ...(searchKey ? { [searchKey]: debouncedSearch } : {}) }),
    [debouncedSearch, filters, searchKey],
  )
  const filterParams = useMemo(() => cleanParams(appliedFilters), [appliedFilters])
  const queryParams = useMemo(() => ({ ...filterParams, page, page_size: 12 }), [filterParams, page])
  const {
    error,
    fieldErrors,
    isLoading,
    isSaving,
    items,
    load,
    save,
    setError,
    setFieldErrors,
    totalItems,
  } = useResource(service, queryParams)
  const hasFilters = Object.values(appliedFilters).some(Boolean)

  useEffect(() => {
    setSearchParams({ ...filterParams, ...(page > 1 ? { page } : {}) }, { replace: true })
  }, [filterParams, page, setSearchParams])

  const openCreate = (event) => {
    setFormTrigger(event?.currentTarget ?? null)
    setEditingItem(null)
    setFieldErrors({})
    setError('')
    setActionMessage('')
    setIsFormOpen(true)
  }

  const openEdit = (item, event) => {
    setFormTrigger(event?.currentTarget ?? null)
    setEditingItem(item)
    setFieldErrors({})
    setError('')
    setActionMessage('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setEditingItem(null)
    setIsFormOpen(false)
  }

  const handleSubmit = async (payload) => {
    const saved = await save({ id: editingItem?.id, payload })
    if (!saved) return
    setActionMessage(
      editingItem
        ? `${itemLabel} actualizado correctamente.`
        : `${itemLabel} creado correctamente.`,
    )
    closeForm()
  }

  const requestStatusChange = (item) => {
    setActionMessage('')
    setPendingStatus({ item, nextValue: !item[statusConfig.field] })
  }

  const handleStatusChange = async () => {
    if (!pendingStatus) return
    const saved = await save({
      id: pendingStatus.item.id,
      payload: { [statusConfig.field]: pendingStatus.nextValue },
    })
    if (!saved) return

    setActionMessage(
      `${itemLabel} ${pendingStatus.nextValue ? statusConfig.activatedText : statusConfig.deactivatedText}.`,
    )
    setPendingStatus(null)
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
    setActionMessage('')
  }

  const clearFilters = () => {
    setFilters(Object.fromEntries(filterDefinitions.map((filter) => [filter.key, filter.defaultValue ?? ''])))
    setPage(1)
    setActionMessage('')
  }

  const tableColumns = [
    ...columns,
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => (
        <div className="table-actions table-actions--compact">
          <Button icon={Edit3} onClick={(event) => openEdit(item, event)} variant="secondary">
            Editar
          </Button>
          {statusConfig ? (
            <Button
              icon={item[statusConfig.field] ? PowerOff : Power}
              onClick={() => requestStatusChange(item)}
              variant="ghost"
            >
              {item[statusConfig.field] ? statusConfig.deactivateLabel : statusConfig.activateLabel}
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  const noResultsTitle = hasFilters ? 'Sin coincidencias' : `Aún no hay ${title.toLowerCase()}`
  const noResultsMessage = hasFilters
    ? 'No encontramos registros con la búsqueda o los filtros actuales.'
    : emptyMessage

  return (
    <div className="page-stack page-stack--commercial">
      <PageHeader
        actions={
          <Button icon={Plus} onClick={openCreate}>
            {createLabel}
          </Button>
        }
        description={description}
        eyebrow="Comercial"
        title={title}
      />

      <ErrorMessage
        action={
          error ? (
            <Button onClick={() => load()} variant="secondary">
              Reintentar
            </Button>
          ) : null
        }
      >
        {error}
      </ErrorMessage>
      {actionMessage ? <div className="success-message" role="status">{actionMessage}</div> : null}

      {filterDefinitions.length ? (
        <FiltersToolbar
          hasFilters={hasFilters}
          isLoading={isLoading}
          onClear={clearFilters}
          resultCount={totalItems}
        >
          {filterDefinitions.map((filter) =>
            filter.type === 'select' ? (
              <Select
                id={`${title.toLowerCase().replaceAll(' ', '-')}-${filter.key}`}
                key={filter.key}
                label={filter.label}
                name={filter.key}
                onChange={handleFilterChange}
                value={filters[filter.key]}
              >
                {filter.options.map((option) => (
                  <option key={option.value || 'todos'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                icon={Search}
                id={`${title.toLowerCase().replaceAll(' ', '-')}-${filter.key}`}
                key={filter.key}
                label={filter.label}
                name={filter.key}
                onChange={handleFilterChange}
                placeholder={filter.placeholder}
                type="search"
                value={filters[filter.key]}
              />
            ),
          )}
        </FiltersToolbar>
      ) : null}

      <Card className="commercial-list-card">
        {isLoading ? (
          <LoadingState label={`Cargando ${title.toLowerCase()}`} />
        ) : (
          <DataTable
            caption={`Listado de ${title.toLowerCase()}`}
            columns={tableColumns}
            emptyAction={
              hasFilters ? (
                <Button onClick={clearFilters} variant="secondary">Limpiar filtros</Button>
              ) : (
                <Button icon={Plus} onClick={openCreate}>{createLabel}</Button>
              )
            }
            emptyMessage={noResultsMessage}
            emptyTitle={noResultsTitle}
            mobileTitle={mobileTitle}
            rows={items}
          />
        )}
        <Pagination onPageChange={setPage} page={page} total={totalItems} />
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        returnFocusElement={formTrigger}
        title={editingItem ? `Editar ${itemLabel.toLowerCase()}` : createLabel}
      >
        <FormComponent
          errors={fieldErrors}
          key={editingItem?.id ?? 'nuevo'}
          initialValues={editingItem}
          isSubmitting={isSaving}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </Modal>

      <Modal
        isOpen={Boolean(pendingStatus)}
        onClose={() => setPendingStatus(null)}
        title={pendingStatus?.nextValue ? statusConfig?.activateTitle : statusConfig?.deactivateTitle}
      >
        <div className="confirm-dialog">
          <p>
            {pendingStatus?.nextValue
              ? statusConfig?.activateDescription
              : statusConfig?.deactivateDescription}
          </p>
          <div className="form-actions">
            <Button onClick={() => setPendingStatus(null)} variant="secondary">Volver</Button>
            <Button
              icon={pendingStatus?.nextValue ? Power : PowerOff}
              isLoading={isSaving}
              onClick={handleStatusChange}
            >
              {pendingStatus?.nextValue ? statusConfig?.activateLabel : statusConfig?.deactivateLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
