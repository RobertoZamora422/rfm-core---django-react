import { X } from 'lucide-react'
import { useEffect, useId } from 'react'
import { Button } from './Button'

export function Modal({ children, isOpen, onClose, title }) {
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.classList.add('modal-lock')
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('modal-lock')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="modal__header">
          <h2 id={titleId}>{title}</h2>
          <Button aria-label="Cerrar" icon={X} onClick={onClose} variant="ghost">
            Cerrar
          </Button>
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  )
}
