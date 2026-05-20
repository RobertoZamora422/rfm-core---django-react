import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { obtenerConfiguracionPublica } from '../services/preCotizacionService'

export function PublicLayout() {
  const [nombreNegocio, setNombreNegocio] = useState('RFM Core')

  useEffect(() => {
    let isMounted = true

    obtenerConfiguracionPublica()
      .then((data) => {
        if (isMounted && data?.nombre_negocio) {
          setNombreNegocio(data.nombre_negocio)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="public-brand" to="/pre-cotizacion">
          <span className="public-brand__mark">RFM</span>
          <span>
            <strong>{nombreNegocio}</strong>
            <small>Pre-cotizacion web</small>
          </span>
        </Link>
        <Link className="text-link" to="/login">
          Acceso administrativo
        </Link>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
    </div>
  )
}
