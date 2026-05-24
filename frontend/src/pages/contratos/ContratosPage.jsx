import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Eye, FilterX, Plus, RefreshCw, Search } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Input } from '../../components/ui/Input'
import { LoadingState } from '../../components/ui/LoadingState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { contratosService, tiposEventoService } from '../../services/resourceService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatCurrency, formatDate } from '../../utils/formatters'
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

function buildQueryParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )
}

export function ContratosPage() {
  const [contratos, setContratos] = useState([])
  const [tiposEvento, setTiposEvento] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [contractToCancel, setContractToCancel] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [isCanceling, setIsCanceling] = useState(false)

  const loadContratos = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const data = await contratosService.list(buildQueryParams(appliedFilters))
      setContratos(Array.isArray(data) ? data : data.results ?? [])
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [appliedFilters])

  useEffect(() => {
    let isActive = true

    async function loadTiposEvento() {
      setIsLoadingCatalogs(true)
      try {
        const data = await tiposEventoService.list({ activo: true })
        if (isActive) {
          setTiposEvento(Array.isArray(data) ? data : data.results ?? [])
        }
      } catch (error) {
        if (isActive) {
          setPageError(getApiErrorMessage(error))
        }
      } finally {
        if (isActive) {
          setIsLoadingCatalogs(false)
        }
      }
    }

    const timeoutId = window.setTimeout(loadTiposEvento, 0)
    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadContratos, 0)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadContratos])

  const counters = useMemo(
    () => ({
      total: contratos.length,
      confirmados: contratos.filter((contrato) => contrato.estado_contrato === 'confirmado').length,
      cancelados: contratos.filter((contrato) => contrato.estado_contrato === 'cancelado').length,
      pendientes: contratos.filter((contrato) => contrato.estado_pago === 'pendiente').length,
      abonados: contratos.filter((contrato) => contrato.estado_pago === 'abonado').length,
      pagados: contratos.filter((contrato) => contrato.estado_pago === 'pagado').length,
    }),
    [contratos],
  )

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

  const handleCancelContract = async () => {
    if (!contractToCancel) return

    setIsCanceling(true)
    setPageError('')
    setActionMessage('')

    try {
      await contratosService.cancelar(contractToCancel.id)
      setActionMessage(`Contrato #${contractToCancel.id} cancelado sin eliminar el registro.`)
      setContractToCancel(null)
      await loadContratos()
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
          <span>{item.cliente_telefono || '-'}</span>
        </div>
      ),
    },
    { key: 'tipo_evento_nombre', header: 'Tipo de evento' },
    {
      key: 'fecha_evento',
      header: 'Fecha del evento',
      render: (item) => formatDate(item.fecha_evento),
    },
    {
      key: 'paquete_nombre',
      header: 'Paquete',
      render: (item) => item.paquete_nombre || 'Sin paquete',
    },
    {
      key: 'valor_final',
      header: 'Valor final',
      render: (item) => formatCurrency(item.valor_final),
    },
    {
      key: 'monto_abonado',
      header: 'Monto abonado',
      render: (item) => formatCurrency(item.monto_abonado),
    },
    {
      key: 'saldo_pendiente',
      header: 'Saldo pendiente',
      render: (item) => formatCurrency(item.saldo_pendiente),
    },
    {
      key: 'estado_contrato',
      header: 'Estado contrato',
      render: (item) => (
        <StatusBadge status={item.estado_contrato}>
          {getEstadoContratoLabel(item.estado_contrato)}
        </StatusBadge>
      ),
    },
    {
      key: 'estado_pago',
      header: 'Estado pago',
      render: (item) => (
        <StatusBadge status={item.estado_pago}>{getEstadoPagoLabel(item.estado_pago)}</StatusBadge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => (
        <div className="table-actions">
          <Link className="button button--secondary" to={`/contratos/${item.id}`}>
            <Eye aria-hidden="true" size={18} />
            <span>Ver detalle</span>
          </Link>
          {item.estado_contrato !== 'cancelado' ? (
            <Button icon={Ban} onClick={() => setContractToCancel(item)} variant="ghost">
              Cancelar
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <Link className="button button--primary" to="/contratos/nuevo">
              <Plus aria-hidden="true" size={18} />
              <span>Nuevo contrato</span>
            </Link>
            <Button icon={RefreshCw} onClick={loadContratos} variant="secondary">
              Actualizar
            </Button>
          </>
        }
        description="Administra las ventas reales del negocio y su estado de pago."
        title="Contratos"
      />

      <ErrorMessage>{pageError}</ErrorMessage>
      {actionMessage ? <div className="success-message">{actionMessage}</div> : null}

      <Card>
        <div className="contract-summary">
          <span>Total: {counters.total}</span>
          <span>Confirmados: {counters.confirmados}</span>
          <span>Cancelados: {counters.cancelados}</span>
          <span>Pendientes: {counters.pendientes}</span>
          <span>Abonados: {counters.abonados}</span>
          <span>Pagados: {counters.pagados}</span>
        </div>
      </Card>

      <Card>
        <form className="filters-grid filters-grid--contracts" onSubmit={handleApplyFilters}>
          <Input
            id="contratos-buscar"
            label="Buscar"
            name="buscar"
            onChange={handleFilterChange}
            placeholder="Cliente o telefono"
            value={filters.buscar}
          />
          <Select
            id="contratos-estado-contrato"
            label="Estado de contrato"
            name="estado_contrato"
            onChange={handleFilterChange}
            value={filters.estado_contrato}
          >
            {ESTADOS_CONTRATO_FILTRO.map((estado) => (
              <option key={estado.value || 'todos'} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </Select>
          <Select
            id="contratos-estado-pago"
            label="Estado de pago"
            name="estado_pago"
            onChange={handleFilterChange}
            value={filters.estado_pago}
          >
            {ESTADOS_PAGO_FILTRO.map((estado) => (
              <option key={estado.value || 'todos'} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </Select>
          <Select
            disabled={isLoadingCatalogs}
            id="contratos-tipo-evento"
            label="Tipo de evento"
            name="tipo_evento"
            onChange={handleFilterChange}
            value={filters.tipo_evento}
          >
            <option value="">Todos los eventos</option>
            {tiposEvento.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </Select>
          <Input
            id="contratos-desde"
            label="Fecha desde"
            name="desde"
            onChange={handleFilterChange}
            type="date"
            value={filters.desde}
          />
          <Input
            id="contratos-hasta"
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
          <LoadingState label="Cargando contratos" />
        ) : (
          <DataTable
            columns={columns}
            emptyMessage="No hay contratos reales para los filtros aplicados."
            mobileTitle={(item) => `${item.cliente_nombre} - #${item.id}`}
            rows={contratos}
          />
        )}
      </Card>

      <Modal
        isOpen={Boolean(contractToCancel)}
        onClose={() => setContractToCancel(null)}
        title="Cancelar contrato"
      >
        <div className="confirm-dialog">
          <p>
            Esta accion cambiara el contrato #{contractToCancel?.id} a cancelado. El registro se conserva para
            control historico.
          </p>
          <div className="form-actions">
            <Button onClick={() => setContractToCancel(null)} variant="secondary">
              Mantener contrato
            </Button>
            <Button icon={Ban} isLoading={isCanceling} onClick={handleCancelContract}>
              Cancelar contrato
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
