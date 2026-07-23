import { ArrowLeft, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function NotFoundPage() {
  const { isAuthenticated } = useAuth()
  const primaryTarget = isAuthenticated ? '/inicio' : '/pre-cotizacion'

  return (
    <main className="not-found-page">
      <section aria-labelledby="not-found-title" className="not-found-card">
        <span className="not-found-card__code" aria-hidden="true">
          404
        </span>
        <p className="page-header__eyebrow">Ruta no encontrada</p>
        <h1 id="not-found-title">Esta página no existe</h1>
        <p>
          Revise la dirección o vuelva a un punto seguro para continuar en RFM Core.
        </p>
        <div className="not-found-card__actions">
          <Link className="button button--primary" to={primaryTarget}>
            <Home aria-hidden="true" size={18} />
            <span>{isAuthenticated ? 'Ir al inicio' : 'Ir a pre-cotización'}</span>
          </Link>
          {!isAuthenticated ? (
            <Link className="button button--secondary" to="/login">
              <ArrowLeft aria-hidden="true" size={18} />
              <span>Acceso administrativo</span>
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  )
}
