import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  contratosService,
  paquetesService,
  tiposEventoService,
} from '../../services/resourceService'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors'
import { ContratoForm } from './ContratoForm'

function toArray(data) {
  return Array.isArray(data) ? data : data?.results ?? []
}

function ensureCurrentOption(items, currentId, currentName) {
  if (!currentId || items.some((item) => String(item.id) === String(currentId))) return items
  return [...items, { id: currentId, nombre: `${currentName || `Registro #${currentId}`} (actual)` }]
}

export function EditarContratoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnPath = location.state?.from || `/contratos/${id}`
  const [contrato, setContrato] = useState(null)
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
      const [contratoData, tiposData, paquetesData] = await Promise.all([
        contratosService.retrieve(id),
        tiposEventoService.list({ activo: true }),
        paquetesService.list({ activo: true }),
      ])
      const tiposActivos = toArray(tiposData)
      const paquetesActivos = toArray(paquetesData)
      setContrato(contratoData)
      setTiposEvento(
        ensureCurrentOption(tiposActivos, contratoData.tipo_evento, contratoData.tipo_evento_nombre),
      )
      setPaquetes(
        ensureCurrentOption(paquetesActivos, contratoData.paquete, contratoData.paquete_nombre),
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
      const updated = await contratosService.update(id, payload)
      navigate(`/contratos/${updated.id}`, { state: { from: location.state?.from } })
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
        description="Actualiza datos operativos y financieros. El estado de pago seguirá calculándose automáticamente."
        eyebrow="Comercial · Contratos"
        title={`Editar contrato #${id}`}
      />

      <ErrorMessage>{pageError}</ErrorMessage>

      <Card className="form-card">
        {isLoading ? (
          <LoadingState label="Cargando contrato" />
        ) : contrato ? (
          <ContratoForm
            errors={fieldErrors}
            initialValues={contrato}
            isLoadingCatalogs={isLoading}
            isSubmitting={isSaving}
            key={contrato.id}
            onCancel={() => navigate(returnPath)}
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
