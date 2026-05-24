import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  clientesService,
  contratosService,
  paquetesService,
  tiposEventoService,
} from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { ContratoForm } from './ContratoForm'

function toArray(data) {
  return Array.isArray(data) ? data : data?.results ?? []
}

export function NuevoContratoPage() {
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
        tiposEventoService.list(),
        paquetesService.list(),
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
      const created = await contratosService.create(payload)
      navigate(`/contratos/${created.id}`)
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
          <Link className="button button--secondary" to="/contratos">
            <ArrowLeft aria-hidden="true" size={18} />
            <span>Volver</span>
          </Link>
        }
        description="Registra un contrato real sin modificar manualmente el estado de pago."
        title="Nuevo contrato"
      />

      <ErrorMessage>{pageError}</ErrorMessage>

      <Card>
        {isLoadingCatalogs ? (
          <LoadingState label="Cargando datos del formulario" />
        ) : (
          <ContratoForm
            clientes={clientes}
            errors={fieldErrors}
            isLoadingCatalogs={isLoadingCatalogs}
            isSubmitting={isSaving}
            onCancel={() => navigate('/contratos')}
            onSubmit={handleSubmit}
            paquetes={paquetes}
            submitLabel="Crear contrato"
            tiposEvento={tiposEvento}
          />
        )}
      </Card>
    </div>
  )
}
