import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'

function buildInitialForm(cotizacion) {
  return {
    fecha_evento: cotizacion?.fecha_tentativa ?? '',
    valor_final: cotizacion?.total_estimado ?? '0.00',
    monto_abonado: '0.00',
    observaciones: '',
  }
}

export function ConversionModal({
  cotizacion,
  errors = {},
  isSubmitting,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(buildInitialForm(cotizacion))

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
