import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  clientesService,
  cotizacionesService,
  paquetesService,
  tiposEventoService,
} from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { CotizacionForm } from './CotizacionForm'

function toArray(data) {
  return Array.isArray(data) ? data : data?.results ?? []
}

function ensureCurrentOption(items, currentId, currentName, extra = {}) {
  if (!currentId || items.some((item) => String(item.id) === String(currentId))) return items
  return [
    ...items,
    {
      ...extra,
      id: currentId,
      nombre: `${currentName || `Registro #${currentId}`} (actual)`,
    },
  ]
}

export function EditarCotizacionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnPath = location.state?.from || `/cotizaciones/${id}`
  const [cotizacion, setCotizacion] = useState(null)
  const [clientes, setClientes] = useState([])
  const [tiposEvento, setTiposEvento] = useState([])
  const [paquetes, setPaquetes] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setPageError('')

    try {
      const [cotizacionData, clientesData, tiposData, paquetesData] = await Promise.all([
        cotizacionesService.retrieve(id),
        clientesService.list(),
        tiposEventoService.list({ activo: true }),
        paquetesService.list({ activo: true }),
      ])
      const tiposActivos = toArray(tiposData)
      const paquetesActivos = toArray(paquetesData)
      setCotizacion(cotizacionData)
      setClientes(toArray(clientesData))
      setTiposEvento(
        ensureCurrentOption(
          tiposActivos,
          cotizacionData.tipo_evento,
          cotizacionData.tipo_evento_nombre,
        ),
      )
      setPaquetes(
        ensureCurrentOption(paquetesActivos, cotizacionData.paquete, cotizacionData.paquete_nombre, {
          tipo_servicio: cotizacionData.tipo_servicio,
        }),
      )
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadData, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  const handleSubmit = async (payload) => {
    setIsSaving(true)
    setFieldErrors({})
    setPageError('')

    try {
      const updated = await cotizacionesService.update(id, payload)
      navigate(`/cotizaciones/${updated.id}`, { state: { from: location.state?.from } })
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error))
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page-stack page-stack--commercial">
      <PageHeader
        actions={
          <Link className="button button--secondary" to={returnPath}>
            <ArrowLeft aria-hidden="true" size={18} />
            <span>Volver</span>
          </Link>
        }
        description="Actualiza datos comerciales; los cambios de estado se realizan desde las acciones de seguimiento."
        eyebrow="Comercial · Cotizaciones"
        title={`Editar cotización #${id}`}
      />

      <ErrorMessage>{pageError}</ErrorMessage>

      <Card className="form-card">
        {isLoading ? (
          <LoadingState label="Cargando cotizacion" />
        ) : cotizacion ? (
          <CotizacionForm
            clientes={clientes}
            errors={fieldErrors}
            initialValues={cotizacion}
            isLoadingCatalogs={isLoading}
            isSubmitting={isSaving}
            key={cotizacion.id}
            onCancel={() => navigate(returnPath)}
            onSubmit={handleSubmit}
            paquetes={paquetes}
            submitLabel="Guardar cambios"
            tiposEvento={tiposEvento}
          />
        ) : (
          <ErrorMessage>No se pudo cargar la cotizacion solicitada.</ErrorMessage>
        )}
      </Card>
    </div>
  )
}
