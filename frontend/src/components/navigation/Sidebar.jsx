import { NavLink } from 'react-router'
import { LogOut, Menu, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { navigationSections } from '../../routes/navigation'

export function Sidebar({ isCollapsed = false, isOpen, onClose, onCollapseToggle, onLogout }) {
  const classes = ['sidebar', isOpen ? 'sidebar--open' : '', isCollapsed ? 'sidebar--collapsed' : '']
    .filter(Boolean)
    .join(' ')
  const collapseLabel = isCollapsed ? 'Abrir menú' : 'Cerrar menú'
  const CollapseIcon = isCollapsed ? Menu : X

  return (
    <>
      <aside
        aria-label="Navegacion principal"
        className={classes}
        id="sidebar-principal"
      >
        <div className="sidebar__brand">
          <button
            aria-label={collapseLabel}
            aria-controls="sidebar-principal"
            aria-expanded={!isCollapsed}
            className="button button--ghost sidebar__collapse"
            onClick={onCollapseToggle}
            title={collapseLabel}
            type="button"
          >
            <CollapseIcon aria-hidden="true" size={20} />
          </button>
          <div className="sidebar__brand-mark">
            <span className="sidebar__mark">RFM</span>
          </div>
          <div className="sidebar__brand-copy">
            <strong>RFM Core</strong>
            <span>Administracion</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navigationSections.map((section) => (
            <div className="sidebar__section" key={section.title}>
              <span className="sidebar__section-title">{section.title}</span>
              {section.items.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    ['sidebar__link', isActive ? 'sidebar__link--active' : '']
                      .filter(Boolean)
                      .join(' ')
                  }
                  key={item.path}
                  aria-label={`Ir a ${item.label}`}
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                  to={item.path}
                >
                  <item.icon aria-hidden="true" size={18} />
                  <span className="sidebar__link-text">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <Button
            aria-label="Cerrar sesión"
            className="sidebar__logout"
            icon={LogOut}
            onClick={onLogout}
            title={isCollapsed ? 'Cerrar sesión' : undefined}
            variant="ghost"
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>
      {isOpen ? (
        <button
          aria-label="Cerrar menu de navegacion"
          className="sidebar-overlay"
          onClick={onClose}
          type="button"
        />
      ) : null}
    </>
  )
}
