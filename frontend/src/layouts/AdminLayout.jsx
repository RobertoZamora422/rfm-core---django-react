import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/navigation/Sidebar'
import { Topbar } from '../components/navigation/Topbar'
import { useAuth } from '../hooks/useAuth'

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.toggle('sidebar-lock', isSidebarOpen)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsSidebarOpen(false)
    }

    if (isSidebarOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.body.classList.remove('sidebar-lock')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSidebarOpen])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido
      </a>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="admin-shell__content">
        <Topbar
          isMenuOpen={isSidebarOpen}
          onLogout={handleLogout}
          onMenuClick={() => setIsSidebarOpen(true)}
          user={user}
        />
        <main className="content-area" id="contenido-principal" tabIndex="-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
