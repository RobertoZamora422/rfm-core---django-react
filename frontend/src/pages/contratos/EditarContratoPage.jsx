import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

export function EditarContratoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contrato, setContrato] = useState(null)
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
      const [contratoData, clientesData, tiposData, paquetesData] = await Promise.all([
        contratosService.retrieve(id),
        clientesService.list(),
        tiposEventoService.list(),
        paquetesService.list(),
      ])
      setContrato(contratoData)
      setClientes(toArray(clientesData))
      setTiposEvento(toArray(tiposData))
      setPaquetes(toArray(paquetesData))
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
      const updated = await contratosService.update(id, payload)
      navigate(`/contratos/${updated.id}`)
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
          <Link className="button button--secondary" to={`/contratos/${id}`}>
            <ArrowLeft aria-hidden="true" size={18} />
            <span>Volver</span>
          </Link>
        }
        description="Actualiza los datos operativos y financieros editables del contrato."
        title={`Editar contrato #${id}`}
      />

      <ErrorMessage>{pageError}</ErrorMessage>

      <Card>
        {isLoading ? (
          <LoadingState label="Cargando contrato" />
        ) : contrato ? (
          <ContratoForm
            clientes={clientes}
            errors={fieldErrors}
            initialValues={contrato}
            isLoadingCatalogs={isLoading}
            isSubmitting={isSaving}
            key={contrato.id}
            onCancel={() => navigate(`/contratos/${id}`)}
            onSubmit={handleSubmit}
            paquetes={paquetes}
            submitLabel="Guardar cambios"
            tiposEvento={tiposEvento}
          />
        ) : (
          <ErrorMessage>No se pudo cargar el contrato solicitado.</ErrorMessage>
        )}
      </Card>
    </div>
  )
}
