import { LogOut, Menu, UserRound } from 'lucide-react'
import { Button } from '../ui/Button'

export function Topbar({ onLogout, onMenuClick, user }) {
  const displayName = user?.nombre_completo || user?.username || 'Usuario'

  return (
    <header className="topbar">
      <Button
        aria-label="Abrir navegacion"
        className="topbar__menu"
        icon={Menu}
        onClick={onMenuClick}
        variant="ghost"
      >
        Menu
      </Button>
      <div className="topbar__context">
        <span>Sistema administrativo</span>
        <strong>Pre-cotizacion, contratos y rentabilidad</strong>
      </div>
      <div className="topbar__user">
        <UserRound aria-hidden="true" size={18} />
        <span>{displayName}</span>
        <Button icon={LogOut} onClick={onLogout} variant="secondary">
          Salir
        </Button>
      </div>
    </header>
  )
}
