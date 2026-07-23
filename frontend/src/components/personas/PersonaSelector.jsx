import { Plus, Search, UserRound, X } from 'lucide-react'
import { useId, useState } from 'react'
import { usePersonaMatches } from '../../hooks/usePersonaMatches'
import { formatPhone } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { ErrorMessage } from '../ui/ErrorMessage'
import { Modal } from '../ui/Modal'
import { PersonaForm } from './PersonaForm'

function selectionFromPerson(person) {
  return { ...person, isNew: false }
}

export function PersonaSelector({
  allowCreate = true,
  disabled,
  error,
  onChange,
  originLabel,
  selection,
}) {
  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listboxId = useId()
  const matches = usePersonaMatches(query, { enabled: !selection })

  const selectExisting = (person) => {
    onChange(selectionFromPerson(person))
    setQuery('')
    setActiveIndex(-1)
    setIsCreateOpen(false)
  }

  const selectNew = (person) => {
    onChange({ ...person, id: null, isNew: true })
    setQuery('')
    setIsCreateOpen(false)
  }

  const handleKeyDown = (event) => {
    const options = matches.sugerencias
    if (!options.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % options.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current <= 0 ? options.length - 1 : current - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      selectExisting(options[activeIndex])
    } else if (event.key === 'Escape') {
      setQuery('')
      setActiveIndex(-1)
    }
  }

  return (
    <div className="person-selector">
      <span className="field__label">Persona <span aria-hidden="true" className="field__required">*</span></span>
      {selection ? (
        <div className="person-selection">
          <span className="person-selection__icon" aria-hidden="true"><UserRound size={19} /></span>
          <span className="person-selection__copy">
            <strong>{selection.nombre}</strong>
            <small>{formatPhone(selection.telefono)}{selection.correo ? ` · ${selection.correo}` : ''}</small>
            <span>{selection.isNew ? `Nueva persona · ${originLabel}` : selection.clasificacion_display}</span>
          </span>
          {!disabled ? (
            <Button aria-label={`Cambiar persona seleccionada: ${selection.nombre}`} icon={X} onClick={() => onChange(null)} variant="ghost">
              Cambiar
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="person-search-control">
            <Search aria-hidden="true" size={18} />
            <input
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={Boolean(matches.sugerencias.length)}
              aria-invalid={Boolean(error)}
              autoComplete="off"
              className="field__control"
              disabled={disabled}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Busca por nombre o teléfono"
              role="combobox"
              value={query}
            />
          </div>
          {matches.isLoading ? <span className="field__help" role="status">Buscando personas…</span> : null}
          {query.length >= 2 && !matches.isLoading && !matches.sugerencias.length ? (
            <div className="person-no-results">
              <span>No encontramos una persona con esos datos.</span>
              {allowCreate ? <Button icon={Plus} onClick={() => setIsCreateOpen(true)} variant="secondary">Crear sin salir</Button> : null}
            </div>
          ) : null}
          {matches.sugerencias.length ? (
            <div className="person-search-results" id={listboxId} role="listbox">
              {matches.sugerencias.map((person, index) => (
                <button
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? 'person-result person-result--active' : 'person-result'}
                  key={person.id}
                  onClick={() => selectExisting(person)}
                  role="option"
                  type="button"
                >
                  <span><strong>{person.nombre}</strong><small>{formatPhone(person.telefono)}{person.correo ? ` · ${person.correo}` : ''}</small></span>
                  <span className={`person-kind person-kind--${person.clasificacion}`}>{person.clasificacion_display}</span>
                </button>
              ))}
              {allowCreate ? (
                <Button className="person-search-results__create" icon={Plus} onClick={() => setIsCreateOpen(true)} variant="ghost">Crear una persona diferente</Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
      {error ? <span className="field__error" role="alert">{error}</span> : null}
      <ErrorMessage>{matches.error}</ErrorMessage>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Crear persona sin salir">
        <p className="modal-intro">Se registrará con origen <strong>{originLabel}</strong> al guardar el formulario principal.</p>
        <PersonaForm
          embedded
          initialValues={{
            nombre: /[a-záéíóúñ]/i.test(query) ? query : '',
            telefono: /\d/.test(query) ? query : '',
          }}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={selectNew}
          onUseExisting={selectExisting}
          submitLabel="Usar persona nueva"
        />
      </Modal>
    </div>
  )
}
