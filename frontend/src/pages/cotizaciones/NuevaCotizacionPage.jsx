import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

export function NuevaCotizacionPage() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [tiposEvento, setTiposEvento] = useState([])
  const [paquetes, setPaquetes] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadCatalogs = useCallback(async () => {
    setIsLoadingCatalogs(true)
    setPageError('')

    try {
      const [clientesData, tiposData, paquetesData] = await Promise.all([
        clientesService.list(),
        tiposEventoService.list({ activo: true }),
        paquetesService.list({ activo: true }),
      ])
      setClientes(toArray(clientesData))
      setTiposEvento(toArray(tiposData))
      setPaquetes(toArray(paquetesData))
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoadingCatalogs(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadCatalogs, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCatalogs])

  const handleSubmit = async (payload) => {
    setIsSaving(true)
    setFieldErrors({})
    setPageError('')

    try {
      const created = await cotizacionesService.create(payload)
      navigate(`/cotizaciones/${created.id}`)
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error))
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/cotizaciones">
            <ArrowLeft aria-hidden="true" size={18} />
            <span>Volver</span>
          </Link>
        }
        description="Registra una cotizacion administrativa sin crear contrato ni ingreso real."
        title="Nueva cotizacion"
      />

      <ErrorMessage>{pageError}</ErrorMessage>

      <Card>
        {isLoadingCatalogs ? (
          <LoadingState label="Cargando datos del formulario" />
        ) : (
          <CotizacionForm
            clientes={clientes}
            errors={fieldErrors}
            isLoadingCatalogs={isLoadingCatalogs}
            isSubmitting={isSaving}
            onCancel={() => navigate('/cotizaciones')}
            onSubmit={handleSubmit}
            paquetes={paquetes}
            submitLabel="Crear cotizacion"
            tiposEvento={tiposEvento}
          />
        )}
      </Card>
    </div>
  )
}
