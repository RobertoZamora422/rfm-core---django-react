import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { paquetesService } from '../../services/resourceService'
import { getApiErrorMessage } from '../../utils/apiErrors'

function buildInitialForm(cotizacion) {
  return {
    fecha_evento: cotizacion?.fecha_tentativa ?? '',
    numero_invitados: cotizacion?.numero_invitados ?? '',
    paquete: cotizacion?.paquete ?? '',
    valor_final: cotizacion?.total_estimado ?? '0.00',
    monto_abonado: '0.00',
    observaciones: '',
  }
}

function toArray(data) {
  return Array.isArray(data) ? data : data?.results ?? []
}

export function ConversionModal({
  cotizacion,
  errors = {},
  isSubmitting,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(buildInitialForm(cotizacion))
  const [paquetes, setPaquetes] = useState([])
  const [catalogError, setCatalogError] = useState('')
  const [isLoadingPaquetes, setIsLoadingPaquetes] = useState(true)

  useEffect(() => {
    let isActive = true

    async function loadPaquetes() {
      setIsLoadingPaquetes(true)
      setCatalogError('')

      try {
        const data = await paquetesService.list({ activo: true })
        if (isActive) {
          setPaquetes(toArray(data))
        }
      } catch (error) {
        if (isActive) {
          setCatalogError(getApiErrorMessage(error))
        }
      } finally {
        if (isActive) {
          setIsLoadingPaquetes(false)
        }
      }
    }

    const timeoutId = window.setTimeout(loadPaquetes, 0)
    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
    }
  }, [])

  const paqueteOptions = useMemo(() => {
    if (!cotizacion || cotizacion.tipo_servicio === 'no_seguro') return paquetes
    return paquetes.filter((paquete) => paquete.tipo_servicio === cotizacion.tipo_servicio)
  }, [cotizacion, paquetes])

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      fecha_evento: form.fecha_evento,
      numero_invitados: form.numero_invitados ? Number(form.numero_invitados) : '',
      paquete: form.paquete ? Number(form.paquete) : null,
      valor_final: form.valor_final,
      monto_abonado: form.monto_abonado,
      observaciones: form.observaciones,
    })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={cotizacion ? `Convertir cotizacion #${cotizacion.id}` : 'Convertir cotizacion'}
    >
      <form className="resource-form" onSubmit={handleSubmit}>
        <Input
          error={errors.fecha_evento}
          id="conversion-fecha-evento"
          label="Fecha del evento"
          name="fecha_evento"
          onChange={handleChange}
          required
          type="date"
          value={form.fecha_evento}
        />
        <Input
          error={errors.numero_invitados}
          id="conversion-numero-invitados"
          label="Numero de invitados final"
          min="1"
          name="numero_invitados"
          onChange={handleChange}
          required
          type="number"
          value={form.numero_invitados}
        />
        <Select
          disabled={isLoadingPaquetes}
          error={errors.paquete || catalogError}
          id="conversion-paquete"
          label="Paquete final"
          name="paquete"
          onChange={handleChange}
          value={form.paquete}
        >
          <option value="">Sin paquete</option>
          {paqueteOptions.map((paquete) => (
            <option key={paquete.id} value={paquete.id}>
              {paquete.nombre}
            </option>
          ))}
        </Select>
        <Input
          error={errors.valor_final}
          id="conversion-valor-final"
          label="Valor final acordado"
          min="0"
          name="valor_final"
          onChange={handleChange}
          required
          step="0.01"
          type="number"
          value={form.valor_final}
        />
        <Input
          error={errors.monto_abonado}
          id="conversion-monto-abonado"
          label="Monto abonado"
          min="0"
          name="monto_abonado"
          onChange={handleChange}
          step="0.01"
          type="number"
          value={form.monto_abonado}
        />
        <Textarea
          error={errors.observaciones}
          id="conversion-observaciones"
          label="Observaciones del contrato"
          name="observaciones"
          onChange={handleChange}
          value={form.observaciones}
        />
        <div className="form-actions">
          <Button onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button isLoading={isSubmitting} type="submit">
            Convertir
          </Button>
        </div>
      </form>
    </Modal>
  )
}
