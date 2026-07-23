import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { PersonaSelector } from '../../components/personas/PersonaSelector'
import { PERSON_ORIGIN_LABELS } from '../../components/personas/personaConstants'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'
import { TIPO_SERVICIO_LABELS } from './quoteConstants'

const TIPOS_SERVICIO = ['alquiler', 'servicio_completo', 'no_estoy_seguro']

function buildInitialForm(initialValues) {
  return {
    tipo_evento: initialValues?.tipo_evento ?? '',
    tipo_servicio: initialValues?.tipo_servicio ?? 'alquiler',
    paquete: initialValues?.paquete ?? '',
    fecha_tentativa: initialValues?.fecha_tentativa ?? '',
    numero_invitados: initialValues?.numero_invitados ?? '',
    total_estimado: initialValues?.total_estimado ?? '',
    observaciones: initialValues?.observaciones ?? '',
  }
}

export function CotizacionForm({
  errors,
  initialPerson,
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
  const [personSelection, setPersonSelection] = useState(() => initialPerson ?? (
    initialValues?.persona
      ? {
          id: initialValues.persona,
          nombre: initialValues.persona_nombre,
          telefono: initialValues.persona_telefono,
          clasificacion_display: 'Persona registrada',
          isNew: false,
        }
      : null
  ))
  const isConverted = initialValues?.estado === 'convertida'
  useFocusFirstError(errors)

  const paqueteOptions = useMemo(() => {
    if (form.tipo_servicio === 'alquiler') return []
    return paquetes
  }, [form.tipo_servicio, paquetes])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'tipo_servicio' ? { paquete: '' } : {}),
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (isConverted) {
      onSubmit({ observaciones: form.observaciones })
      return
    }

    const personPayload = personSelection?.isNew
      ? {
          persona_nueva: {
            nombre: personSelection.nombre,
            telefono: personSelection.telefono,
            correo: personSelection.correo ?? '',
            observaciones: personSelection.observaciones ?? '',
          },
        }
      : { persona: personSelection?.id ?? '' }

    onSubmit({
      ...personPayload,
      tipo_evento: form.tipo_evento ? Number(form.tipo_evento) : '',
      paquete: form.paquete ? Number(form.paquete) : null,
      fecha_tentativa: form.fecha_tentativa,
      numero_invitados: form.numero_invitados ? Number(form.numero_invitados) : '',
      tipo_servicio: form.tipo_servicio,
      total_estimado: form.total_estimado,
      observaciones: form.observaciones,
    })
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit}>
      {isConverted ? (
        <div className="warning-message">
          Esta cotizacion ya fue convertida. Para no romper el contrato asociado, solo puedes
          actualizar observaciones.
        </div>
      ) : null}

      <fieldset className="form-section" disabled={isConverted}>
        <legend>Persona y evento</legend>
        <div className="form-grid">
          <PersonaSelector
            allowCreate={!initialValues}
            disabled={isLoadingCatalogs || isConverted}
            error={errors.persona || errors.persona_nueva}
            onChange={setPersonSelection}
            originLabel={PERSON_ORIGIN_LABELS.cotizacion_manual}
            selection={personSelection}
          />
          <Select
            disabled={isLoadingCatalogs || isConverted}
            error={errors.tipo_evento}
            id="cotizacion-tipo-evento"
            label="Tipo de evento"
            name="tipo_evento"
            onChange={handleChange}
            required
            value={form.tipo_evento}
          >
            <option value="">Seleccione un tipo de evento</option>
            {tiposEvento.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
          </Select>
        </div>
      </fieldset>

      <fieldset className="form-section" disabled={isConverted}>
        <legend>Servicio</legend>
        <div className="form-grid">
          <Select
            disabled={isConverted}
            error={errors.tipo_servicio}
            id="cotizacion-tipo-servicio"
            label="Tipo de servicio"
            name="tipo_servicio"
            onChange={handleChange}
            required
            value={form.tipo_servicio}
          >
            {TIPOS_SERVICIO.map((tipo) => <option key={tipo} value={tipo}>{TIPO_SERVICIO_LABELS[tipo]}</option>)}
          </Select>
          <Select
            disabled={isLoadingCatalogs || isConverted || form.tipo_servicio === 'alquiler'}
            error={errors.paquete}
            id="cotizacion-paquete"
            label="Paquete"
            name="paquete"
            onChange={handleChange}
            required={form.tipo_servicio === 'servicio_completo'}
            value={form.paquete}
          >
            <option value="">
              {form.tipo_servicio === 'servicio_completo'
                ? 'Seleccione un paquete'
                : form.tipo_servicio === 'no_estoy_seguro'
                  ? 'Aún por definir'
                  : 'No aplica'}
            </option>
            {paqueteOptions.map((paquete) => <option key={paquete.id} value={paquete.id}>{paquete.nombre}</option>)}
          </Select>
        </div>
      </fieldset>

      <fieldset className="form-section" disabled={isConverted}>
        <legend>Fecha y valor</legend>
        <div className="form-grid form-grid--three">
          <Input disabled={isConverted} error={errors.fecha_tentativa} id="cotizacion-fecha" label="Fecha tentativa" name="fecha_tentativa" onChange={handleChange} required type="date" value={form.fecha_tentativa} />
          <Input disabled={isConverted} error={errors.numero_invitados} id="cotizacion-invitados" label="Número de invitados" min="1" name="numero_invitados" onChange={handleChange} required type="number" value={form.numero_invitados} />
          <Input disabled={isConverted} error={errors.total_estimado} helpText="Valor referencial; no representa un ingreso." id="cotizacion-total" inputMode="decimal" label="Total estimado (USD)" min="0" name="total_estimado" onChange={handleChange} required step="0.01" type="number" value={form.total_estimado} />
        </div>
      </fieldset>

      <Textarea
        error={errors.observaciones}
        id="cotizacion-observaciones"
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
