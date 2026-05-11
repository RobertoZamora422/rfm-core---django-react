import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '../ui/Button'
import { navigationSections } from '../../routes/navigation'

export function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div>
            <span className="sidebar__mark">RFM</span>
          </div>
          <div>
            <strong>RFM Core</strong>
            <span>Administracion</span>
          </div>
          <Button className="sidebar__close" icon={X} onClick={onClose} variant="ghost">
            Cerrar
          </Button>
        </div>

        <nav className="sidebar__nav" aria-label="Navegacion principal">
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
                  onClick={onClose}
                  to={item.path}
                >
                  <item.icon aria-hidden="true" size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      {isOpen ? <button aria-label="Cerrar menu" className="sidebar-overlay" onClick={onClose} /> : null}
    </>
  )
}
