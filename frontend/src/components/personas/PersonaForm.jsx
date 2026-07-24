import { Search, UserCheck } from 'lucide-react'
import { useRef, useState } from 'react'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'
import { usePersonaMatches } from '../../hooks/usePersonaMatches'
import { formatPhone } from '../../utils/formatters'
import {
  ECUADOR_MOBILE_ERROR,
  isValidPersonName,
  normalizeEcuadorMobile,
  normalizePersonName,
  PERSON_NAME_ERROR,
} from '../../utils/personValidation'
import { Button } from '../ui/Button'
import { ErrorMessage } from '../ui/ErrorMessage'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'

function PersonOption({ onSelect, person }) {
  return (
    <button className="person-match" onClick={() => onSelect(person)} type="button">
      <span className="person-match__identity">
        <strong>{person.nombre}</strong>
        <small>{formatPhone(person.telefono)}{person.correo ? ` · ${person.correo}` : ''}</small>
      </span>
      <span className={`person-kind person-kind--${person.clasificacion}`}>
        {person.clasificacion_display}
      </span>
      <span className="person-match__counts">
        {person.cotizaciones_count} cot. · {person.contratos_count} cont.
      </span>
    </button>
  )
}

export function PersonaForm({
  embedded = false,
  errors = {},
  initialValues,
  isSubmitting,
  onCancel,
  onSubmit,
  onUseExisting,
  submitLabel = 'Guardar persona',
}) {
  const containerRef = useRef(null)
  const [form, setForm] = useState({
    nombre: initialValues?.nombre ?? '',
    telefono: initialValues?.telefono ?? '',
    correo: initialValues?.correo ?? '',
    observaciones: initialValues?.observaciones ?? '',
  })
  const [nameLookup, setNameLookup] = useState(initialValues?.nombre ?? '')
  const [phoneLookup, setPhoneLookup] = useState(initialValues?.telefono ?? '')
  const [localErrors, setLocalErrors] = useState({})
  const nameMatches = usePersonaMatches(nameLookup, { exclude: initialValues?.id })
  const phoneMatches = usePersonaMatches(phoneLookup, { exclude: initialValues?.id })
  const fieldErrors = { ...errors, ...localErrors }
  useFocusFirstError(fieldErrors)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setLocalErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
    if (name === 'nombre') setNameLookup(value)
    if (name === 'telefono') setPhoneLookup(value)
  }

  const submitPerson = () => {
    const nextErrors = {}
    if (!isValidPersonName(form.nombre)) nextErrors.nombre = PERSON_NAME_ERROR
    const normalizedPhone = normalizeEcuadorMobile(form.telefono)
    if (!normalizedPhone) nextErrors.telefono = ECUADOR_MOBILE_ERROR
    if (Object.keys(nextErrors).length) {
      setLocalErrors(nextErrors)
      return
    }
    const invalidField = containerRef.current?.querySelector('input:invalid, textarea:invalid')
    if (invalidField) {
      invalidField.reportValidity()
      invalidField.focus()
      return
    }
    if (isSubmitting || phoneMatches.exacta_telefono || isPhoneCheckPending) return
    onSubmit({
      nombre: normalizePersonName(form.nombre),
      telefono: normalizedPhone,
      correo: form.correo.trim(),
      observaciones: form.observaciones.trim(),
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    submitPerson()
  }

  const handleEmbeddedKeyDown = (event) => {
    if (event.key !== 'Enter' || event.target.tagName !== 'INPUT') return
    event.preventDefault()
    submitPerson()
  }

  const suggestions = [...phoneMatches.sugerencias, ...nameMatches.sugerencias]
    .filter((person, index, all) => all.findIndex((item) => item.id === person.id) === index)
    .filter((person) => person.id !== phoneMatches.exacta_telefono?.id)
  const isPhoneCheckPending = Boolean(normalizeEcuadorMobile(form.telefono))
    && (phoneMatches.query !== form.telefono.trim() || phoneMatches.isLoading)
  const isSearching = nameMatches.isLoading || phoneMatches.isLoading
  const searchError = nameMatches.error || phoneMatches.error

  const FormContainer = embedded ? 'div' : 'form'

  return (
    <FormContainer
      className="resource-form person-form"
      onKeyDown={embedded ? handleEmbeddedKeyDown : undefined}
      onSubmit={embedded ? undefined : handleSubmit}
      ref={containerRef}
    >
      <div className="form-grid">
        <Input
          autoComplete="name"
          autoFocus
          error={fieldErrors.nombre}
          id="persona-nombre"
          label="Nombre principal"
          name="nombre"
          onBlur={() => {
            const nombre = normalizePersonName(form.nombre)
            setForm((current) => ({ ...current, nombre }))
            setNameLookup(nombre)
          }}
          onChange={handleChange}
          required
          value={form.nombre}
        />
        <Input
          autoComplete="tel"
          error={fieldErrors.telefono}
          helpText="El teléfono identifica a la persona, aunque cambie la forma de escribirlo."
          id="persona-telefono"
          label="Teléfono"
          name="telefono"
          onBlur={() => {
            const telefono = normalizeEcuadorMobile(form.telefono)
            if (!telefono) return
            setForm((current) => ({ ...current, telefono }))
            setPhoneLookup(telefono)
          }}
          onChange={handleChange}
          required
          type="tel"
          value={form.telefono}
        />
      </div>
      <Input
        autoComplete="email"
        error={fieldErrors.correo}
        id="persona-correo"
        label="Correo"
        name="correo"
        onChange={handleChange}
        type="email"
        value={form.correo}
      />

      {isSearching ? (
        <div className="person-search-status" role="status"><Search aria-hidden="true" size={16} /> Buscando coincidencias…</div>
      ) : null}
      <ErrorMessage>{searchError}</ErrorMessage>
      {phoneMatches.exacta_telefono ? (
        <div className="person-duplicate-notice" role="status">
          <div>
            <strong>Esta persona ya está registrada.</strong>
            <span>Puedes seleccionarla para continuar sin crear un duplicado.</span>
          </div>
          <PersonOption onSelect={onUseExisting} person={phoneMatches.exacta_telefono} />
        </div>
      ) : suggestions.length ? (
        <div className="person-suggestions" aria-label="Personas con datos parecidos">
          <div className="person-suggestions__heading">
            <strong>Posibles coincidencias</strong>
            <span>El nombre es una sugerencia; verifica el teléfono antes de elegir.</span>
          </div>
          {suggestions.map((person) => (
            <PersonOption key={person.id} onSelect={onUseExisting} person={person} />
          ))}
        </div>
      ) : null}

      <Textarea
        error={fieldErrors.observaciones}
        id="persona-observaciones"
        label="Observaciones"
        name="observaciones"
        onChange={handleChange}
        value={form.observaciones}
      />
      <div className="form-actions">
        <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">Cancelar</Button>
        <Button
          disabled={Boolean(phoneMatches.exacta_telefono) || isPhoneCheckPending}
          icon={UserCheck}
          isLoading={isSubmitting}
          onClick={embedded ? submitPerson : undefined}
          type={embedded ? 'button' : 'submit'}
        >
          {submitLabel}
        </Button>
      </div>
    </FormContainer>
  )
}
