import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/navigation/Sidebar'
import { Topbar } from '../components/navigation/Topbar'
import { useAuth } from '../hooks/useAuth'

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="admin-shell__content">
        <Topbar
          onLogout={handleLogout}
          onMenuClick={() => setIsSidebarOpen(true)}
          user={user}
        />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
