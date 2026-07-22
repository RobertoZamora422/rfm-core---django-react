import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'

function buildInitialForm(initialValues) {
  return {
    cliente: initialValues?.cliente ?? '',
    tipo_evento: initialValues?.tipo_evento ?? '',
    paquete: initialValues?.paquete ?? '',
    fecha_evento: initialValues?.fecha_evento ?? '',
    numero_invitados: initialValues?.numero_invitados ?? '',
    valor_final: initialValues?.valor_final ?? '',
    monto_abonado: initialValues?.monto_abonado ?? '0.00',
    observaciones: initialValues?.observaciones ?? '',
  }
}

export function ContratoForm({
  clientes,
  errors,
  initialValues,
  isLoadingCatalogs,
  isSubmitting,
  onCancel,
  onSubmit,
  paquetes,
  submitLabel,
  tiposEvento,
}) {
  const [form, setForm] = useState(() => buildInitialForm(initialValues))
  useFocusFirstError(errors)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      cliente: form.cliente ? Number(form.cliente) : '',
      tipo_evento: form.tipo_evento ? Number(form.tipo_evento) : '',
      paquete: form.paquete ? Number(form.paquete) : null,
      fecha_evento: form.fecha_evento,
      numero_invitados: form.numero_invitados ? Number(form.numero_invitados) : '',
      valor_final: form.valor_final,
      monto_abonado: form.monto_abonado || '0.00',
      observaciones: form.observaciones,
    })
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit}>
      <fieldset className="form-section">
        <legend>Cliente y evento</legend>
        <div className="form-grid">
        <Select
          autoFocus
          disabled={isLoadingCatalogs}
          error={errors.cliente}
          id="contrato-cliente"
          label="Cliente"
          name="cliente"
          onChange={handleChange}
          required
          value={form.cliente}
        >
          <option value="">Seleccione un cliente</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nombre} · {cliente.telefono}
            </option>
          ))}
        </Select>
        <Select
          disabled={isLoadingCatalogs}
          error={errors.tipo_evento}
          id="contrato-tipo-evento"
          label="Tipo de evento"
          name="tipo_evento"
          onChange={handleChange}
          required
          value={form.tipo_evento}
        >
          <option value="">Seleccione un tipo de evento</option>
          {tiposEvento.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </Select>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Servicio contratado</legend>
        <Select disabled={isLoadingCatalogs} error={errors.paquete} id="contrato-paquete" label="Paquete" name="paquete" onChange={handleChange} value={form.paquete}>
          <option value="">Sin paquete</option>
          {paquetes.map((paquete) => <option key={paquete.id} value={paquete.id}>{paquete.nombre}</option>)}
        </Select>
      </fieldset>

      <fieldset className="form-section">
        <legend>Operación y pago</legend>
        <div className="form-grid">
        <Input
          error={errors.fecha_evento}
          id="contrato-fecha-evento"
          label="Fecha del evento"
          name="fecha_evento"
          onChange={handleChange}
          required
          type="date"
          value={form.fecha_evento}
        />
        <Input
          error={errors.numero_invitados}
          id="contrato-numero-invitados"
          label="Número de invitados"
          min="1"
          name="numero_invitados"
          onChange={handleChange}
          required
          type="number"
          value={form.numero_invitados}
        />
        <Input
          error={errors.valor_final}
          id="contrato-valor-final"
          inputMode="decimal"
          label="Valor final (USD)"
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
          id="contrato-monto-abonado"
          helpText="No puede superar el valor final."
          inputMode="decimal"
          label="Monto abonado (USD)"
          min="0"
          name="monto_abonado"
          onChange={handleChange}
          step="0.01"
          type="number"
          value={form.monto_abonado}
        />
        </div>
        <div className="notice-message">
          El estado del pago se calcula automáticamente con el valor final y el monto abonado.
        </div>
      </fieldset>

      <Textarea
        error={errors.observaciones}
        id="contrato-observaciones"
        label="Observaciones internas"
        name="observaciones"
        onChange={handleChange}
        value={form.observaciones}
      />

      <div className="form-actions">
        <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={isLoadingCatalogs} isLoading={isSubmitting} type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
