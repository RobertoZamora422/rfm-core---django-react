import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Edit3,
  Eye,
  FilePlus2,
  FilterX,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Input } from '../../components/ui/Input'
import { KpiCard } from '../../components/ui/KpiCard'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { cotizacionesService, tiposEventoService } from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { formatCurrency, formatDate } from '../../utils/formatters'
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

function buildQueryParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )
}

function getNextAction(cotizacion) {
  if (cotizacion.estado === 'nueva') {
    return {
      estado: 'contactada',
      label: 'Contactar',
      icon: PhoneCall,
    }
  }

  if (cotizacion.estado === 'contactada') {
    return {
      estado: 'confirmada',
      label: 'Confirmar',
      icon: CheckCircle2,
    }
  }

  return null
}

export function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [tiposEvento, setTiposEvento] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [pageError, setPageError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [conversionErrors, setConversionErrors] = useState({})
  const [selectedConversion, setSelectedConversion] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [changingId, setChangingId] = useState(null)
  const [isConverting, setIsConverting] = useState(false)

  const loadCotizaciones = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const data = await cotizacionesService.list(buildQueryParams(appliedFilters))
      setCotizaciones(Array.isArray(data) ? data : data.results ?? [])
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
    const timeoutId = window.setTimeout(loadCotizaciones, 0)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadCotizaciones])

  const counters = useMemo(
    () => ({
      total: cotizaciones.length,
      nuevas: cotizaciones.filter((item) => item.estado === 'nueva').length,
      contactadas: cotizaciones.filter((item) => item.estado === 'contactada').length,
      confirmadas: cotizaciones.filter((item) => item.estado === 'confirmada').length,
      convertidas: cotizaciones.filter((item) => item.estado === 'convertida').length,
    }),
    [cotizaciones],
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

  const handleChangeState = async (cotizacion, estado) => {
    setChangingId(`${cotizacion.id}-${estado}`)
    setPageError('')
    setActionMessage('')

    try {
      await cotizacionesService.cambiarEstado(cotizacion.id, estado)
      setActionMessage(`Cotizacion #${cotizacion.id} actualizada a ${getEstadoLabel(estado)}.`)
      await loadCotizaciones()
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

  const closeConversion = () => {
    setSelectedConversion(null)
    setConversionErrors({})
  }

  const handleConvert = async (payload) => {
    if (!selectedConversion) return

    setIsConverting(true)
    setConversionErrors({})
    setPageError('')

    try {
      const response = await cotizacionesService.convertirContrato(selectedConversion.id, payload)
      closeConversion()
      setActionMessage(
        `Cotizacion #${response.cotizacion.id} convertida a contrato #${response.contrato.id}.`,
      )
      await loadCotizaciones()
    } catch (error) {
      setConversionErrors(getApiFieldErrors(error))
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsConverting(false)
    }
  }

  const columns = [
    {
      key: 'cliente',
      header: 'Cliente',
      render: (item) => (
        <div className="stacked-cell">
          <strong>{item.cliente_nombre}</strong>
          <span>{item.cliente_telefono}</span>
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <StatusBadge status={item.estado}>{getEstadoLabel(item.estado)}</StatusBadge>
      ),
    },
    { key: 'tipo_evento_nombre', header: 'Evento' },
    {
      key: 'fecha_tentativa',
      header: 'Fecha tentativa',
      render: (item) => formatDate(item.fecha_tentativa),
    },
    {
      key: 'tipo_servicio',
      header: 'Servicio',
      render: (item) => TIPO_SERVICIO_LABELS[item.tipo_servicio] ?? item.tipo_servicio,
    },
    {
      key: 'total_estimado',
      header: 'Total estimado',
      render: (item) => formatCurrency(item.total_estimado),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item) => {
        const nextAction = getNextAction(item)
        const NextIcon = nextAction?.icon

        return (
          <div className="table-actions">
            <Link className="button button--secondary" to={`/cotizaciones/${item.id}`}>
              <Eye aria-hidden="true" size={18} />
              <span>Detalle</span>
            </Link>
            <Link className="button button--secondary" to={`/cotizaciones/${item.id}/editar`}>
              <Edit3 aria-hidden="true" size={18} />
              <span>Editar</span>
            </Link>
            {nextAction ? (
              <Button
                icon={NextIcon}
                isLoading={changingId === `${item.id}-${nextAction.estado}`}
                onClick={() => handleChangeState(item, nextAction.estado)}
                variant="secondary"
              >
                {nextAction.label}
              </Button>
            ) : null}
            {item.estado !== 'convertida' && item.estado !== 'descartada' ? (
              <Button
                icon={XCircle}
                isLoading={changingId === `${item.id}-descartada`}
                onClick={() => handleChangeState(item, 'descartada')}
                variant="ghost"
              >
                Descartar
              </Button>
            ) : null}
            {canConvertQuote(item) ? (
              <Button icon={FilePlus2} onClick={() => openConversion(item)}>
                Convertir
              </Button>
            ) : null}
          </div>
        )
      },
    },
  ]

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <>
            <Button icon={RefreshCw} onClick={loadCotizaciones} variant="secondary">
              Actualizar
            </Button>
            <Link className="button button--primary" to="/cotizaciones/nueva">
              <Plus aria-hidden="true" size={18} />
              <span>Nueva cotizacion</span>
            </Link>
          </>
        }
        description="Pipeline comercial conectado a cotizaciones reales del backend."
        title="Cotizaciones"
      />

      <ErrorMessage>{pageError}</ErrorMessage>
      {actionMessage ? <div className="success-message">{actionMessage}</div> : null}

      <section className="kpi-grid" aria-label="Resumen de cotizaciones filtradas">
        <KpiCard detail="En la vista actual" label="Total" value={counters.total} />
        <KpiCard detail="Pendientes de primer contacto" label="Nuevas" value={counters.nuevas} />
        <KpiCard detail="Con seguimiento activo" label="Contactadas" value={counters.contactadas} />
        <KpiCard detail="Listas para contrato" label="Confirmadas" value={counters.confirmadas} />
        <KpiCard detail="Ya tienen contrato" label="Convertidas" value={counters.convertidas} />
      </section>

      <Card>
        <form className="filters-grid" onSubmit={handleApplyFilters}>
          <Input
            id="cotizaciones-buscar"
            label="Buscar"
            name="buscar"
            onChange={handleFilterChange}
            placeholder="Cliente, telefono u observacion"
            value={filters.buscar}
          />
          <Select
            id="cotizaciones-estado"
            label="Estado"
            name="estado"
            onChange={handleFilterChange}
            value={filters.estado}
          >
            {ESTADOS_FILTRO.map((estado) => (
              <option key={estado.value || 'todos'} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </Select>
          <Select
            disabled={isLoadingCatalogs}
            id="cotizaciones-tipo-evento"
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
            id="cotizaciones-desde"
            label="Desde"
            name="desde"
            onChange={handleFilterChange}
            type="date"
            value={filters.desde}
          />
          <Input
            id="cotizaciones-hasta"
            label="Hasta"
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
          <LoadingState label="Cargando cotizaciones" />
        ) : (
          <DataTable
            columns={columns}
            emptyMessage="No hay cotizaciones para los filtros aplicados."
            mobileTitle={(item) => `${item.cliente_nombre} - #${item.id}`}
            rows={cotizaciones}
          />
        )}
      </Card>

      {selectedConversion ? (
        <ConversionModal
          cotizacion={selectedConversion}
          errors={conversionErrors}
          isSubmitting={isConverting}
          onClose={closeConversion}
          onSubmit={handleConvert}
        />
      ) : null}
    </div>
  )
}
