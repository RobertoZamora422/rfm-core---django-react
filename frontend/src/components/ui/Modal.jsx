import { X } from 'lucide-react'
import { Button } from './Button'

export function Modal({ children, isOpen, onClose, title }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal" role="dialog">
        <header className="modal__header">
          <h2>{title}</h2>
          <Button aria-label="Cerrar" icon={X} onClick={onClose} variant="ghost">
            Cerrar
          </Button>
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  )
}
