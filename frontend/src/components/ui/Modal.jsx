import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { Button } from './Button'

export function Modal({ children, isOpen, onClose, returnFocusElement, title }) {
  const titleId = useId()
  const modalRef = useRef(null)
  const returnFocusRef = useRef(null)

  useEffect(() => {
    if (isOpen) return undefined

    const rememberTrigger = (event) => {
      if (event.target instanceof HTMLElement) returnFocusRef.current = event.target
    }

    document.addEventListener('pointerdown', rememberTrigger, true)
    return () => document.removeEventListener('pointerdown', rememberTrigger, true)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const previouslyFocused = returnFocusElement || returnFocusRef.current || document.activeElement
    const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

    const focusTimeoutId = window.setTimeout(() => {
      const bodyTarget = modalRef.current?.querySelector('.modal__body')?.querySelector(focusableSelector)
      bodyTarget?.focus()
    }, 0)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = [...(modalRef.current?.querySelectorAll(focusableSelector) ?? [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.classList.add('modal-lock')
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimeoutId)
      document.body.classList.remove('modal-lock')
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
      returnFocusRef.current = null
    }
  }, [isOpen, onClose, returnFocusElement])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        ref={modalRef}
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
