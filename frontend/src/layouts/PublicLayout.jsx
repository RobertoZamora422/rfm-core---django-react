import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import logotipoRancho from '../assets/logotipo-rancho.svg'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { obtenerConfiguracionPublica } from '../services/preCotizacionService'

export function PublicLayout() {
  const [configuracion, setConfiguracion] = useState(null)
  const [configError, setConfigError] = useState(false)
  const requestIdRef = useRef(0)

  const loadConfiguracion = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    try {
      const data = await obtenerConfiguracionPublica()
      if (requestId === requestIdRef.current) {
        setConfiguracion(data ?? {})
        setConfigError(false)
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setConfiguracion({})
        setConfigError(true)
      }
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadConfiguracion, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadConfiguracion])

  useAutoRefresh(loadConfiguracion)

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header__inner">
          <Link aria-label="Rancho Flor María, ir a pre-cotización" className="public-brand" to="/pre-cotizacion">
            <img alt="Rancho Flor María" src={logotipoRancho} />
          </Link>
          <span className="public-header__badge">Pre-cotización en línea</span>
        </div>
      </header>
      <main className="public-main" id="main-content">
        <Outlet
          context={{
            configuracion,
            configError,
            isConfigLoading: configuracion === null,
          }}
        />
      </main>
      <footer className="public-footer">
        <p>© {new Date().getFullYear()} Rancho Flor María</p>
        <span>Momentos especiales, espacios inolvidables.</span>
      </footer>
    </div>
  )
}
