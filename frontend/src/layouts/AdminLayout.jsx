import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/navigation/Sidebar'
import { Topbar } from '../components/navigation/Topbar'
import { useAuth } from '../hooks/useAuth'

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    window.matchMedia('(max-width: 980px)').matches,
  )
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 980px)')

    const handleViewportChange = (event) => {
      setIsCompactViewport(event.matches)
      if (!event.matches) setIsSidebarOpen(false)
    }

    mediaQuery.addEventListener('change', handleViewportChange)

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange)
    }
  }, [])

  useEffect(() => {
    const shouldLockBody = isCompactViewport && isSidebarOpen

    document.body.classList.toggle('sidebar-lock', shouldLockBody)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsSidebarOpen(false)
    }

    if (shouldLockBody) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.body.classList.remove('sidebar-lock')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCompactViewport, isSidebarOpen])

  const isDesktopCollapsed = !isCompactViewport && isSidebarCollapsed

  const handleNavigationToggle = () => {
    if (isCompactViewport) {
      setIsSidebarOpen((isOpen) => !isOpen)
      return
    }

    setIsSidebarCollapsed((isCollapsed) => !isCollapsed)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`admin-shell ${isDesktopCollapsed ? 'admin-shell--sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido
      </a>
      <Sidebar
        isCollapsed={isDesktopCollapsed}
        isOpen={isSidebarOpen}
        onCollapseToggle={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <div className="admin-shell__content">
        <Topbar
          isCompactViewport={isCompactViewport}
          isSidebarCollapsed={isDesktopCollapsed}
          isMenuOpen={isSidebarOpen}
          onMenuClick={handleNavigationToggle}
          user={user}
        />
        <main className="content-area" id="contenido-principal" tabIndex="-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
