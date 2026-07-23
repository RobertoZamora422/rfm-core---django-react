import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ban, Edit3, Eye, Plus, Receipt, Search } from 'lucide-react'
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
import { contratosService, tiposEventoService } from '../../services/resourceService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatCurrency, formatDate, formatPhone } from '../../utils/formatters'
import {
  ESTADOS_CONTRATO_FILTRO,
  ESTADOS_PAGO_FILTRO,
  getEstadoContratoLabel,
  getEstadoPagoLabel,
} from './contractConstants'

const initialFilters = {
  buscar: '',
  estado_contrato: '',
  estado_pago: '',
  tipo_evento: '',
  desde: '',
  hasta: '',
}
const PAGE_SIZE = 12
const initialSummary = { total: 0, confirmados: 0, cancelados: 0, pendientes: 0, abonados: 0, pagados: 0 }

function filtersFromSearchParams(searchParams) {
  return Object.fromEntries(Object.keys(initialFilters).map((key) => [key, searchParams.get(key) ?? '']))
}

function buildQueryParams(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
}

export function ContratosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [contratos, setContratos] = useState([])
  const [tiposEvento, setTiposEvento] = useState([])
  const [filters, setFilters] = useState(() => filtersFromSearchParams(searchParams))
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1))
  const debouncedSearch = useDebouncedValue(filters.buscar, 350)
  const appliedFilters = useMemo(() => ({ ...filters, buscar: debouncedSearch }), [debouncedSearch, filters])
  const queryParams = useMemo(() => buildQueryParams(appliedFilters), [appliedFilters])
  const requestParams = useMemo(() => ({ ...queryParams, page, page_size: PAGE_SIZE }), [page, queryParams])
  const [summary, setSummary] = useState(initialSummary)
  const [totalItems, setTotalItems] = useState(0)
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [contractToCancel, setContractToCancel] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [isCanceling, setIsCanceling] = useState(false)
  const requestIdRef = useRef(0)
  const hasFilters = Object.values(appliedFilters).some(Boolean)
  const listLocation = `/contratos${searchParams.toString() ? `?${searchParams}` : ''}`

  const loadContratos = useCallback(async ({ silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (!silent) setIsLoading(true)
    if (!silent) setPageError('')

    try {
      const [data, summaryData] = await Promise.all([
        contratosService.list(requestParams),
        contratosService.resumen(queryParams),
      ])
      if (requestId === requestIdRef.current) {
        const nextItems = Array.isArray(data) ? data : data.results ?? []
        setContratos(nextItems)
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
    const timeoutId = window.setTimeout(loadContratos, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadContratos])

  useAutoRefresh(loadContratos, { refreshOnMutation: false })

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

  const handleCancelContract = async () => {
    if (!contractToCancel) return
    setIsCanceling(true)
    setPageError('')
    setActionMessage('')

    try {
      await contratosService.cancelar(contractToCancel.id)
      setActionMessage(`Contrato #${contractToCancel.id} cancelado y conservado en el historial.`)
      setContractToCancel(null)
      await loadContratos({ silent: true })
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsCanceling(false)
    }
  }

  const columns = [
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
          <span>{item.paquete_nombre || 'Sin paquete'} · {formatDate(item.fecha_evento)}</span>
        </div>
      ),
    },
    {
      key: 'valores',
      header: 'Valores',
      align: 'right',
      render: (item) => (
        <dl className="money-breakdown">
          <div><dt>Final</dt><dd>{formatCurrency(item.valor_final)}</dd></div>
          <div><dt>Abonado</dt><dd>{formatCurrency(item.monto_abonado)}</dd></div>
          <div className="money-breakdown__balance"><dt>Saldo</dt><dd>{formatCurrency(item.saldo_pendiente)}</dd></div>
        </dl>
      ),
    },
    {
      key: 'estado_contrato',
      header: 'Contrato',
      render: (item) => <StatusBadge status={item.estado_contrato}>{getEstadoContratoLabel(item.estado_contrato)}</StatusBadge>,
    },
    {
      key: 'estado_pago',
      header: 'Pago',
      render: (item) => <StatusBadge status={item.estado_pago}>{getEstadoPagoLabel(item.estado_pago)}</StatusBadge>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => (
        <div className="table-actions table-actions--compact">
          <Link className="button button--secondary" state={{ from: listLocation }} to={`/contratos/${item.id}`}>
            <Eye aria-hidden="true" size={18} /><span>Detalle</span>
          </Link>
          <ActionMenu label={`Más acciones para el contrato #${item.id}`}>
            <Link className="action-menu__item" role="menuitem" state={{ from: listLocation }} to={`/contratos/${item.id}/editar`}>
              <Edit3 aria-hidden="true" size={17} /> Editar contrato
            </Link>
            {item.estado_contrato !== 'cancelado' ? (
              <>
                <Link className="action-menu__item" role="menuitem" to={`/costos-directos?contrato=${item.id}&nuevo=1`}>
                  <Receipt aria-hidden="true" size={17} /> Registrar costo directo
                </Link>
                <button className="action-menu__item action-menu__item--danger" onClick={() => setContractToCancel(item)} role="menuitem" type="button">
                  <Ban aria-hidden="true" size={17} /> Cancelar contrato
                </button>
              </>
            ) : null}
          </ActionMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="page-stack page-stack--commercial">
      <PageHeader
        actions={<Link className="button button--primary" to="/contratos/nuevo"><Plus aria-hidden="true" size={18} /><span>Nuevo contrato</span></Link>}
        description="Consulta ventas confirmadas, pagos y saldos sin confundir el estado comercial con la cobranza."
        eyebrow="Comercial"
        title="Contratos"
      />

      <ErrorMessage action={pageError ? <Button onClick={() => loadContratos()} variant="secondary">Reintentar</Button> : null}>{pageError}</ErrorMessage>
      {actionMessage ? <div className="success-message" role="status">{actionMessage}</div> : null}

      <SummaryStrip groups={[
        {
          label: hasFilters ? 'Contratos filtrados' : 'Estado del contrato',
          items: [
            { label: 'Total', value: summary.total },
            { label: 'Confirmados', value: summary.confirmados, tone: 'success' },
            { label: 'Cancelados', value: summary.cancelados, tone: 'muted' },
          ],
        },
        {
          label: 'Estado del pago',
          items: [
            { label: 'Pendientes', value: summary.pendientes, tone: 'notice' },
            { label: 'Abonados', value: summary.abonados, tone: 'info' },
            { label: 'Pagados', value: summary.pagados, tone: 'success' },
          ],
        },
      ]} />

      <FiltersToolbar hasFilters={hasFilters} isLoading={isLoading} onClear={handleClearFilters} resultCount={totalItems}>
        <Input icon={Search} id="contratos-buscar" label="Buscar" name="buscar" onChange={handleFilterChange} placeholder="Cliente, teléfono, evento o paquete" type="search" value={filters.buscar} />
        <Select id="contratos-estado-contrato" label="Estado del contrato" name="estado_contrato" onChange={handleFilterChange} value={filters.estado_contrato}>
          {ESTADOS_CONTRATO_FILTRO.map((item) => <option key={item.value || 'todos'} value={item.value}>{item.label}</option>)}
        </Select>
        <Select id="contratos-estado-pago" label="Estado del pago" name="estado_pago" onChange={handleFilterChange} value={filters.estado_pago}>
          {ESTADOS_PAGO_FILTRO.map((item) => <option key={item.value || 'todos'} value={item.value}>{item.label}</option>)}
        </Select>
        <Select disabled={isLoadingCatalogs} id="contratos-tipo-evento" label="Tipo de evento" name="tipo_evento" onChange={handleFilterChange} value={filters.tipo_evento}>
          <option value="">Todos los eventos</option>
          {tiposEvento.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
        </Select>
        <Input id="contratos-desde" label="Evento desde" name="desde" onChange={handleFilterChange} type="date" value={filters.desde} />
        <Input id="contratos-hasta" label="Evento hasta" name="hasta" onChange={handleFilterChange} type="date" value={filters.hasta} />
      </FiltersToolbar>

      <Card className="commercial-list-card">
        {isLoading ? <LoadingState label="Cargando contratos" /> : (
          <DataTable
            caption="Contratos comerciales y estado de pago"
            columns={columns}
            emptyAction={hasFilters ? <Button onClick={handleClearFilters} variant="secondary">Limpiar filtros</Button> : <Link className="button button--primary" to="/contratos/nuevo">Crear primer contrato</Link>}
            emptyMessage={hasFilters ? 'No hay contratos que coincidan con la búsqueda o los filtros actuales.' : 'Crea el primer contrato cuando exista una venta confirmada.'}
            emptyTitle={hasFilters ? 'Sin coincidencias' : 'Aún no hay contratos'}
            getRowClassName={(item) => item.estado_contrato === 'cancelado' ? 'data-table__row--cancelled' : ''}
            mobileTitle={(item) => `${item.cliente_nombre} · Contrato #${item.id}`}
            rows={contratos}
          />
        )}
        <Pagination onPageChange={setPage} page={page} pageSize={PAGE_SIZE} total={totalItems} />
      </Card>

      <Modal isOpen={Boolean(contractToCancel)} onClose={() => setContractToCancel(null)} title="Cancelar contrato">
        <div className="confirm-dialog">
          <p>
            El contrato #{contractToCancel?.id} se conservará para control histórico, pero dejará de contar como venta activa y no permitirá nuevos costos directos.
          </p>
          <div className="form-actions">
            <Button onClick={() => setContractToCancel(null)} variant="secondary">Mantener contrato</Button>
            <Button icon={Ban} isLoading={isCanceling} onClick={handleCancelContract}>Cancelar contrato</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
