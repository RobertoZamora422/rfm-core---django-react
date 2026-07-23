import { Edit3, Eye, FilePlus2, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PersonaForm } from '../../components/personas/PersonaForm'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { FiltersToolbar } from '../../components/ui/FiltersToolbar'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useResource } from '../../hooks/useResource'
import { personasService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { formatPhone } from '../../utils/formatters'

function PersonIdentity({ person, showEmail = false }) {
  return (
    <div className="stacked-cell">
      <strong>{person.nombre}</strong>
      <a className="inline-contact" href={`tel:${person.telefono}`}>{formatPhone(person.telefono)}</a>
      {showEmail && person.correo ? <span>{person.correo}</span> : null}
    </div>
  )
}

function CountLink({ count, person, type }) {
  const path = type === 'cotizaciones' ? '/cotizaciones' : '/contratos'
  const singular = type === 'cotizaciones' ? 'cotización' : 'contrato'
  return (
    <Link className="count-link" to={`${path}?buscar=${encodeURIComponent(person.telefono)}`}>
      {count} {count === 1 ? singular : type}
    </Link>
  )
}

function PersonActions({ listLocation, onEdit, person }) {
  const contractLabel = person.clasificacion === 'cliente' ? 'Nuevo contrato' : 'Crear contrato'
  return (
    <div className="table-actions table-actions--compact">
      <Link className="button button--secondary" state={{ from: listLocation }} to={`/personas/${person.id}`}>
        <Eye aria-hidden="true" size={18} /><span>Detalle</span>
      </Link>
      <ActionMenu label={`Más acciones para ${person.nombre}`}>
        <button className="action-menu__item" onClick={() => onEdit(person)} role="menuitem" type="button">
          <Edit3 aria-hidden="true" size={17} /> Editar
        </button>
        <Link className="action-menu__item" role="menuitem" to={`/contratos/nuevo?persona=${person.id}`}>
          <FilePlus2 aria-hidden="true" size={17} /> {contractLabel}
        </Link>
        <Link className="action-menu__item" role="menuitem" to={`/cotizaciones/nueva?persona=${person.id}`}>
          <Plus aria-hidden="true" size={17} /> Nueva cotización
        </Link>
      </ActionMenu>
    </div>
  )
}

export function PersonasPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('buscar') ?? '')
  const [classification, setClassification] = useState(searchParams.get('clasificacion') ?? '')
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page')) || 1))
  const [summary, setSummary] = useState({ total: 0, clientes: 0, interesados: 0 })
  const [summaryError, setSummaryError] = useState('')
  const [editingPerson, setEditingPerson] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const queryParams = useMemo(() => ({
    ...(debouncedSearch ? { buscar: debouncedSearch } : {}),
    ...(classification ? { clasificacion: classification } : {}),
    page,
    page_size: 12,
  }), [classification, debouncedSearch, page])
  const { error, isLoading, items, load, totalItems } = useResource(personasService, queryParams)
  const hasFilters = Boolean(search || classification)
  const listLocation = `/personas${searchParams.toString() ? `?${searchParams}` : ''}`

  const loadSummary = useCallback(async () => {
    try {
      const data = await personasService.resumen(
        debouncedSearch ? { buscar: debouncedSearch } : undefined,
      )
      setSummary(data)
      setSummaryError('')
    } catch (requestError) {
      setSummaryError(getApiErrorMessage(requestError))
    }
  }, [debouncedSearch])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadSummary, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadSummary])

  useEffect(() => {
    setSearchParams({
      ...(debouncedSearch ? { buscar: debouncedSearch } : {}),
      ...(classification ? { clasificacion: classification } : {}),
      ...(page > 1 ? { page } : {}),
    }, { replace: true })
  }, [classification, debouncedSearch, page, setSearchParams])

  const openCreate = () => {
    setEditingPerson(null)
    setFieldErrors({})
    setFormError('')
    setActionMessage('')
    setIsFormOpen(true)
  }

  const openEdit = (person) => {
    setEditingPerson(person)
    setFieldErrors({})
    setFormError('')
    setActionMessage('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingPerson(null)
  }

  const savePerson = async (payload) => {
    setIsSaving(true)
    setFieldErrors({})
    setFormError('')
    try {
      const saved = editingPerson
        ? await personasService.update(editingPerson.id, payload)
        : await personasService.create(payload)
      closeForm()
      setActionMessage(
        editingPerson ? 'Persona actualizada correctamente.' : 'Persona registrada correctamente.',
      )
      await Promise.all([load(), loadSummary()])
      return saved
    } catch (requestError) {
      setFieldErrors(getApiFieldErrors(requestError))
      setFormError(getApiErrorMessage(requestError))
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const changeClassification = (value) => {
    setClassification(value)
    setPage(1)
    setActionMessage('')
  }

  const clearFilters = () => {
    setSearch('')
    setClassification('')
    setPage(1)
  }

  const actionColumn = {
    key: 'acciones',
    header: 'Acciones',
    render: (person) => (
      <PersonActions listLocation={listLocation} onEdit={openEdit} person={person} />
    ),
  }
  const originColumn = {
    key: 'origen',
    header: 'Origen',
    render: (person) => person.origen_display,
  }
  const quoteColumn = {
    key: 'cotizaciones',
    header: 'Cotizaciones',
    render: (person) => <CountLink count={person.cotizaciones_count} person={person} type="cotizaciones" />,
  }
  const contractColumn = {
    key: 'contratos',
    header: 'Contratos',
    render: (person) => <CountLink count={person.contratos_count} person={person} type="contratos" />,
  }

  const columns = classification === 'cliente'
    ? [
        { key: 'persona', header: 'Cliente', render: (person) => <PersonIdentity person={person} /> },
        { key: 'correo', header: 'Correo', render: (person) => person.correo || 'Sin correo' },
        quoteColumn,
        contractColumn,
        originColumn,
        actionColumn,
      ]
    : classification === 'interesado'
      ? [
          { key: 'persona', header: 'Interesado', render: (person) => <PersonIdentity person={person} /> },
          quoteColumn,
          originColumn,
          actionColumn,
        ]
      : [
          { key: 'persona', header: 'Persona', render: (person) => <PersonIdentity person={person} showEmail /> },
          {
            key: 'clasificacion',
            header: 'Clasificación',
            render: (person) => <span className={`person-kind person-kind--${person.clasificacion}`}>{person.clasificacion_display}</span>,
          },
          quoteColumn,
          contractColumn,
          originColumn,
          actionColumn,
        ]

  const tabs = [
    { value: '', label: 'Todos', count: summary.total },
    { value: 'cliente', label: 'Clientes', count: summary.clientes },
    { value: 'interesado', label: 'Interesados', count: summary.interesados },
  ]

  return (
    <div className="page-stack page-stack--commercial">
      <PageHeader
        actions={<Button icon={Plus} onClick={openCreate}>Registrar persona</Button>}
        description="Encuentra personas por nombre o teléfono y revisa rápidamente su relación con el negocio."
        eyebrow="Comercial"
        title="Clientes & Interesados"
      />

      <ErrorMessage action={error ? <Button onClick={() => load()} variant="secondary">Reintentar</Button> : null}>
        {error || summaryError}
      </ErrorMessage>
      {actionMessage ? <div className="success-message" role="status">{actionMessage}</div> : null}

      <div aria-label="Clasificación de personas" className="person-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={classification === tab.value}
            className={classification === tab.value ? 'person-tab person-tab--active' : 'person-tab'}
            key={tab.value || 'todos'}
            onClick={() => changeClassification(tab.value)}
            role="tab"
            type="button"
          >
            <span>{tab.label}</span><strong>{tab.count}</strong>
          </button>
        ))}
      </div>

      <FiltersToolbar hasFilters={hasFilters} isLoading={isLoading} onClear={clearFilters} resultCount={totalItems}>
        <Input
          icon={Search}
          id="personas-buscar"
          label="Buscar persona"
          name="buscar"
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Nombre, teléfono o correo"
          type="search"
          value={search}
        />
      </FiltersToolbar>

      <Card className="commercial-list-card">
        {isLoading ? (
          <LoadingState label="Cargando clientes e interesados" />
        ) : (
          <DataTable
            caption="Listado de clientes e interesados"
            columns={columns}
            emptyAction={hasFilters ? <Button onClick={clearFilters} variant="secondary">Limpiar filtros</Button> : <Button icon={Plus} onClick={openCreate}>Registrar primera persona</Button>}
            emptyMessage={hasFilters ? 'No encontramos personas con la búsqueda o clasificación actual.' : 'Registra la primera persona para relacionarla con cotizaciones o contratos.'}
            emptyTitle={hasFilters ? 'Sin coincidencias' : 'Aún no hay personas registradas'}
            mobileTitle={(person) => person.nombre}
            rows={items}
          />
        )}
        <Pagination onPageChange={setPage} page={page} total={totalItems} />
      </Card>

      <Modal isOpen={isFormOpen} onClose={closeForm} title={editingPerson ? 'Editar persona' : 'Registrar persona'}>
        <ErrorMessage>{formError}</ErrorMessage>
        <PersonaForm
          errors={fieldErrors}
          initialValues={editingPerson}
          isSubmitting={isSaving}
          key={editingPerson?.id ?? 'new-person'}
          onCancel={closeForm}
          onSubmit={savePerson}
          onUseExisting={(person) => {
            closeForm()
            navigate(`/personas/${person.id}`)
          }}
          submitLabel={editingPerson ? 'Guardar cambios' : 'Registrar persona'}
        />
      </Modal>
    </div>
  )
}
