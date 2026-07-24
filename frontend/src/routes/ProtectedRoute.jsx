import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingState } from '../components/ui/LoadingState'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isCheckingSession } = useAuth()
  const location = useLocation()

  if (isCheckingSession) {
    return (
      <main className="route-loader">
        <LoadingState label="Validando sesion" />
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}
