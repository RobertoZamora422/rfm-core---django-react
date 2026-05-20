import { Menu, PanelLeftClose, PanelLeftOpen, UserRound, X } from 'lucide-react'
import { Button } from '../ui/Button'

export function Topbar({
  isCompactViewport = false,
  isMenuOpen = false,
  isSidebarCollapsed = false,
  onMenuClick,
  user,
}) {
  const displayName = user?.nombre_completo || user?.username || 'Usuario'
  const menuIcon = isCompactViewport
    ? isMenuOpen
      ? X
      : Menu
    : isSidebarCollapsed
      ? PanelLeftOpen
      : PanelLeftClose
  const menuLabel = isCompactViewport
    ? isMenuOpen
      ? 'Cerrar menú'
      : 'Abrir menú'
    : isSidebarCollapsed
      ? 'Mostrar menú'
      : 'Ocultar menú'

  return (
    <header className="topbar">
      <Button
        aria-label={menuLabel}
        aria-controls="sidebar-principal"
        aria-expanded={isCompactViewport ? isMenuOpen : !isSidebarCollapsed}
        className="topbar__menu"
        icon={menuIcon}
        onClick={onMenuClick}
        variant="ghost"
      >
        {menuLabel}
      </Button>
      <div className="topbar__context">
        <span>Sistema administrativo</span>
        <strong>Pre-cotizacion, contratos y rentabilidad</strong>
      </div>
      <div className="topbar__user">
        <UserRound aria-hidden="true" size={18} />
        <span>{displayName}</span>
      </div>
    </header>
  )
}
