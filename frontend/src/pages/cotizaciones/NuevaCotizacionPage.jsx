import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  const [searchParams] = useSearchParams()
  const preselectedPersonId = searchParams.get('cliente')
  const [initialPerson, setInitialPerson] = useState(null)
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
      const [personData, tiposData, paquetesData] = await Promise.all([
        preselectedPersonId ? clientesService.retrieve(preselectedPersonId) : Promise.resolve(null),
        tiposEventoService.list({ activo: true }),
        paquetesService.list({ activo: true }),
      ])
      setInitialPerson(personData)
      setTiposEvento(toArray(tiposData))
      setPaquetes(toArray(paquetesData))
    } catch (error) {
      setPageError(getApiErrorMessage(error))
    } finally {
      setIsLoadingCatalogs(false)
    }
  }, [preselectedPersonId])

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
    <div className="page-stack page-stack--commercial">
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/cotizaciones">
            <ArrowLeft aria-hidden="true" size={18} />
            <span>Volver</span>
          </Link>
        }
        description="Registra una oportunidad comercial. No se creará un ingreso ni una venta hasta convertirla en contrato."
        eyebrow="Comercial · Cotizaciones"
        title="Nueva cotización"
      />

      <ErrorMessage>{pageError}</ErrorMessage>

      <Card className="form-card">
        {isLoadingCatalogs ? (
          <LoadingState label="Cargando datos del formulario" />
        ) : (
          <CotizacionForm
            errors={fieldErrors}
            initialPerson={initialPerson}
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
