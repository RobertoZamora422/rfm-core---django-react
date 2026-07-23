import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  Edit3,
  Eye,
  FilePlus2,
  PhoneCall,
  Plus,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react'
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
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SummaryStrip } from '../../components/ui/SummaryStrip'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { cotizacionesService, tiposEventoService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { formatCurrency, formatDate, formatPhone } from '../../utils/formatters'
import { ConversionModal } from './ConversionModal'
import {
  ESTADOS_FILTRO,
  TIPO_SERVICIO_LABELS,
  canConvertQuote,
  getEstadoLabel,
} from './quoteConstants'

const initialFilters = {
  buscar: '',
  estado: '',
  tipo_evento: '',
  desde: '',
  hasta: '',
}
const PAGE_SIZE = 12
const initialSummary = { total: 0, nuevas: 0, contactadas: 0, confirmadas: 0, convertidas: 0, descartadas: 0 }

function filtersFromSearchParams(searchParams) {
  return Object.fromEntries(
    Object.keys(initialFilters).map((key) => [key, searchParams.get(key) ?? '']),
  )
}

function buildQueryParams(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
}

function getNextAction(cotizacion) {
  if (cotizacion.estado === 'nueva') {
    return { estado: 'contactada', label: 'Marcar contactada', shortLabel: 'Contactar', icon: PhoneCall }
  }
  if (cotizacion.estado === 'contactada') {
    return { estado: 'confirmada', label: 'Marcar confirmada', shortLabel: 'Confirmar', icon: CheckCircle2 }
  }
  return null
}

export function CotizacionesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cotizaciones, setCotizaciones] = useState([])
  const [tiposEvento, setTiposEvento] = useState([])
  const [filters, setFilters] = useState(() => filtersFromSearchParams(searchParams))
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1))
  const debouncedSearch = useDebouncedValue(filters.buscar, 350)
  const appliedFilters = useMemo(
    () => ({ ...filters, buscar: debouncedSearch }),
    [debouncedSearch, filters],
  )
  const queryParams = useMemo(() => buildQueryParams(appliedFilters), [appliedFilters])
  const requestParams = useMemo(() => ({ ...queryParams, page, page_size: PAGE_SIZE }), [page, queryParams])
  const [summary, setSummary] = useState(initialSummary)
  const [totalItems, setTotalItems] = useState(0)
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [conversionErrors, setConversionErrors] = useState({})
  const [selectedConversion, setSelectedConversion] = useState(null)
  const [pendingStateAction, setPendingStateAction] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [changingId, setChangingId] = useState(null)
  const [isConverting, setIsConverting] = useState(false)
  const requestIdRef = useRef(0)
  const hasFilters = Object.values(appliedFilters).some(Boolean)
  const listLocation = `/cotizaciones${searchParams.toString() ? `?${searchParams}` : ''}`

  const loadCotizaciones = useCallback(async ({ silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (!silent) setIsLoading(true)
    if (!silent) setPageError('')

    try {
      const [data, summaryData] = await Promise.all([
        cotizacionesService.list(requestParams),
        cotizacionesService.resumen(queryParams),
      ])
      if (requestId === requestIdRef.current) {
        const nextItems = Array.isArray(data) ? data : data.results ?? []
        setCotizaciones(nextItems)
        setTotalItems(Array.isArray(data) ? data.length : data.count ?? nextItems.length)
        setSummary(summaryData)
        setPageError('')
      }
    } catch (error) {
      if (requestId === requestIdRef.current) setPageError(getApiErrorMessage(error))
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [queryParams, requestParams])

  useEffect(() => {
    setSearchParams({ ...queryParams, ...(page > 1 ? { page } : {}) }, { replace: true })
  }, [page, queryParams, setSearchParams])

  useEffect(() => {
    let isActive = true
    tiposEventoService.list({ activo: true })
      .then((data) => {
        if (isActive) setTiposEvento(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch((error) => {
        if (isActive) setPageError(getApiErrorMessage(error))
      })
      .finally(() => {
        if (isActive) setIsLoadingCatalogs(false)
      })
    return () => { isActive = false }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadCotizaciones, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCotizaciones])

  useAutoRefresh(loadCotizaciones, { refreshOnMutation: false })

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
    setActionMessage('')
  }

  const handleClearFilters = () => {
    setFilters(initialFilters)
    setPage(1)
    setActionMessage('')
  }

  const changeState = async (cotizacion, estado) => {
    setChangingId(`${cotizacion.id}-${estado}`)
    setPageError('')
    setActionMessage('')

    try {
      await cotizacionesService.cambiarEstado(cotizacion.id, estado)
      setActionMessage(`Cotización #${cotizacion.id} actualizada a ${getEstadoLabel(estado)}.`)
      setPendingStateAction(null)
      await loadCotizaciones({ silent: true })
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setChangingId(null)
    }
  }

  const openConversion = (cotizacion) => {
    setConversionErrors({})
    setPageError('')
    setActionMessage('')
    setSelectedConversion(cotizacion)
  }

  const handleConvert = async (payload) => {
    if (!selectedConversion) return
    setIsConverting(true)
    setConversionErrors({})
    setPageError('')

    try {
      const response = await cotizacionesService.convertirContrato(selectedConversion.id, payload)
      setSelectedConversion(null)
      setActionMessage(`Cotización #${response.cotizacion.id} convertida a contrato #${response.contrato.id}.`)
      await loadCotizaciones({ silent: true })
    } catch (error) {
      setConversionErrors(getApiFieldErrors(error))
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsConverting(false)
    }
  }

  const columns = [
    {
      key: 'persona',
      header: 'Persona',
      render: (item) => (
        <div className="stacked-cell">
          <strong>{item.persona_nombre}</strong>
          <span>{formatPhone(item.persona_telefono)}</span>
        </div>
      ),
    },
    {
      key: 'oportunidad',
      header: 'Evento / servicio',
      render: (item) => (
        <div className="stacked-cell">
          <strong>{item.tipo_evento_nombre}</strong>
          <span>{item.paquete_nombre || TIPO_SERVICIO_LABELS[item.tipo_servicio] || item.tipo_servicio}</span>
        </div>
      ),
    },
    { key: 'fecha_tentativa', header: 'Fecha tentativa', render: (item) => formatDate(item.fecha_tentativa) },
    { key: 'total_estimado', header: 'Estimado', render: (item) => formatCurrency(item.total_estimado), align: 'right' },
    { key: 'estado', header: 'Estado', render: (item) => <StatusBadge status={item.estado}>{getEstadoLabel(item.estado)}</StatusBadge> },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => {
        const nextAction = getNextAction(item)
        const NextIcon = nextAction?.icon
        return (
          <div className="table-actions table-actions--compact">
            <Link className="button button--secondary" state={{ from: listLocation }} to={`/cotizaciones/${item.id}`}>
              <Eye aria-hidden="true" size={18} /><span>Detalle</span>
            </Link>
            {nextAction ? (
              <Button
                icon={NextIcon}
                isLoading={changingId === `${item.id}-${nextAction.estado}`}
                onClick={() => changeState(item, nextAction.estado)}
                variant="ghost"
              >
                {nextAction.shortLabel}
              </Button>
            ) : null}
            {canConvertQuote(item) ? (
              <Button icon={FilePlus2} onClick={() => openConversion(item)}>Convertir</Button>
            ) : null}
            <ActionMenu label={`Más acciones para la cotización #${item.id}`}>
              <Link className="action-menu__item" role="menuitem" state={{ from: listLocation }} to={`/cotizaciones/${item.id}/editar`}>
                <Edit3 aria-hidden="true" size={17} /> Editar
              </Link>
              {item.estado === 'descartada' ? (
                <button className="action-menu__item" onClick={() => setPendingStateAction({ cotizacion: item, estado: 'nueva' })} role="menuitem" type="button">
                  <RotateCcw aria-hidden="true" size={17} /> Reactivar como nueva
                </button>
              ) : item.estado !== 'convertida' ? (
                <button className="action-menu__item action-menu__item--danger" onClick={() => setPendingStateAction({ cotizacion: item, estado: 'descartada' })} role="menuitem" type="button">
                  <XCircle aria-hidden="true" size={17} /> Descartar
                </button>
              ) : null}
            </ActionMenu>
          </div>
        )
      },
    },
  ]

  return (
    <div className="page-stack page-stack--commercial">
      <PageHeader
        actions={<Link className="button button--primary" to="/cotizaciones/nueva"><Plus aria-hidden="true" size={18} /><span>Nueva cotización</span></Link>}
        description="Da seguimiento a cada oportunidad desde el primer contacto hasta su conversión o descarte."
        eyebrow="Comercial"
        title="Cotizaciones"
      />

      <ErrorMessage action={pageError ? <Button onClick={() => loadCotizaciones()} variant="secondary">Reintentar</Button> : null}>{pageError}</ErrorMessage>
      {actionMessage ? <div className="success-message" role="status">{actionMessage}</div> : null}

      <SummaryStrip groups={[{
        label: hasFilters ? 'Resultados filtrados' : 'Pipeline actual',
        items: [
          { label: 'Total', value: summary.total },
          { label: 'Nuevas', value: summary.nuevas, tone: 'info' },
          { label: 'Contactadas', value: summary.contactadas, tone: 'notice' },
          { label: 'Confirmadas', value: summary.confirmadas, tone: 'success' },
          { label: 'Convertidas', value: summary.convertidas, tone: 'forest' },
          { label: 'Descartadas', value: summary.descartadas, tone: 'muted' },
        ],
      }]} />

      <FiltersToolbar hasFilters={hasFilters} isLoading={isLoading} onClear={handleClearFilters} resultCount={totalItems}>
        <Input icon={Search} id="cotizaciones-buscar" label="Buscar" name="buscar" onChange={handleFilterChange} placeholder="Persona, teléfono, evento o paquete" type="search" value={filters.buscar} />
        <Select id="cotizaciones-estado" label="Estado" name="estado" onChange={handleFilterChange} value={filters.estado}>
          {ESTADOS_FILTRO.map((estado) => <option key={estado.value || 'todos'} value={estado.value}>{estado.label}</option>)}
        </Select>
        <Select disabled={isLoadingCatalogs} id="cotizaciones-tipo-evento" label="Tipo de evento" name="tipo_evento" onChange={handleFilterChange} value={filters.tipo_evento}>
          <option value="">Todos los eventos</option>
          {tiposEvento.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
        </Select>
        <Input id="cotizaciones-desde" label="Desde" name="desde" onChange={handleFilterChange} type="date" value={filters.desde} />
        <Input id="cotizaciones-hasta" label="Hasta" name="hasta" onChange={handleFilterChange} type="date" value={filters.hasta} />
      </FiltersToolbar>

      <Card className="commercial-list-card">
        {isLoading ? <LoadingState label="Cargando cotizaciones" /> : (
          <DataTable
            caption="Cotizaciones comerciales"
            columns={columns}
            emptyAction={hasFilters ? <Button onClick={handleClearFilters} variant="secondary">Limpiar filtros</Button> : <Link className="button button--primary" to="/cotizaciones/nueva">Crear primera cotización</Link>}
            emptyMessage={hasFilters ? 'No hay cotizaciones que coincidan con la búsqueda o los filtros actuales.' : 'Crea la primera cotización para iniciar el seguimiento comercial.'}
            emptyTitle={hasFilters ? 'Sin coincidencias' : 'Aún no hay cotizaciones'}
            mobileTitle={(item) => `${item.persona_nombre} · Cotización #${item.id}`}
            rows={cotizaciones}
          />
        )}
        <Pagination onPageChange={setPage} page={page} pageSize={PAGE_SIZE} total={totalItems} />
      </Card>

      {selectedConversion ? (
        <ConversionModal cotizacion={selectedConversion} errors={conversionErrors} isSubmitting={isConverting} onClose={() => setSelectedConversion(null)} onSubmit={handleConvert} />
      ) : null}

      <Modal
        isOpen={Boolean(pendingStateAction)}
        onClose={() => setPendingStateAction(null)}
        title={pendingStateAction?.estado === 'descartada' ? 'Descartar cotización' : 'Reactivar cotización'}
      >
        <div className="confirm-dialog">
          <p>
            {pendingStateAction?.estado === 'descartada'
              ? `La cotización #${pendingStateAction.cotizacion.id} saldrá del flujo activo, pero permanecerá en el historial.`
              : `La cotización #${pendingStateAction?.cotizacion.id} volverá al estado Nueva para retomar el seguimiento desde el inicio.`}
          </p>
          <div className="form-actions">
            <Button onClick={() => setPendingStateAction(null)} variant="secondary">Volver</Button>
            <Button
              icon={pendingStateAction?.estado === 'descartada' ? XCircle : RotateCcw}
              isLoading={changingId === `${pendingStateAction?.cotizacion.id}-${pendingStateAction?.estado}`}
              onClick={() => changeState(pendingStateAction.cotizacion, pendingStateAction.estado)}
            >
              {pendingStateAction?.estado === 'descartada' ? 'Descartar cotización' : 'Reactivar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
