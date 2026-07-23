import { MoreHorizontal } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function ActionMenu({ children, label = 'Más acciones' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!isOpen) return undefined

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return

      const horizontal = { right: Math.max(12, window.innerWidth - rect.right) }
      setPosition(
        rect.bottom + 220 > window.innerHeight
          ? { ...horizontal, bottom: window.innerHeight - rect.top + 6 }
          : { ...horizontal, top: rect.bottom + 6 },
      )
    }

    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      setIsOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
        return
      }

      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      const items = [...(menuRef.current?.querySelectorAll('.action-menu__item') ?? [])]
      if (!items.length) return
      event.preventDefault()
      const currentIndex = items.indexOf(document.activeElement)
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : currentIndex <= 0 ? items.length - 1 : currentIndex - 1
      items[nextIndex]?.focus()
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !position) return undefined
    const timeoutId = window.setTimeout(() => {
      menuRef.current?.querySelector('.action-menu__item')?.focus()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [isOpen, position])

  const toggleMenu = () => setIsOpen((current) => !current)

  return (
    <>
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={label}
        className="action-menu__trigger"
        onClick={toggleMenu}
        ref={buttonRef}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" size={20} />
      </button>
      {isOpen && position
        ? createPortal(
            <div
              className="action-menu"
              id={menuId}
              onClick={() => setIsOpen(false)}
              ref={menuRef}
              role="menu"
              aria-orientation="vertical"
              style={position}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
