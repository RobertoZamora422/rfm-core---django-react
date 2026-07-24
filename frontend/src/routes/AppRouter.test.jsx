import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../hooks/AuthContext'
import { AppRouter } from './AppRouter'

const {
  listarTiposEventoPublicos,
  obtenerConfiguracionPublica,
} = vi.hoisted(() => ({
  listarTiposEventoPublicos: vi.fn(),
  obtenerConfiguracionPublica: vi.fn(),
}))

vi.mock('../services/preCotizacionService', () => ({
  crearPreCotizacion: vi.fn(),
  guardarPreferenciaPreCotizacion: vi.fn(),
  listarTiposEventoPublicos,
  obtenerConfiguracionPublica,
}))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

function renderRouter(initialEntry) {
  return render(
    <AuthContext.Provider
      value={{
        isAuthenticated: false,
        isCheckingSession: false,
        login: vi.fn(),
        logout: vi.fn(),
        token: null,
        user: null,
      }}
    >
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppRouter />
        <LocationProbe />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AppRouter', () => {
  beforeEach(() => {
    listarTiposEventoPublicos.mockReset()
    obtenerConfiguracionPublica.mockReset()
    listarTiposEventoPublicos.mockResolvedValue([
      { id: 1, nombre: 'Boda', capacidad_maxima: 200 },
    ])
    obtenerConfiguracionPublica.mockResolvedValue({
      fecha_minima_cotizacion: '2026-07-24',
      whatsapp_disponible: true,
    })
  })

  it('redirige cualquier ruta inexistente directamente a la pre-cotización pública', async () => {
    renderRouter('/una-ruta-inexistente')

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/pre-cotizacion')
    })
    expect(
      screen.getByRole('heading', { name: 'PLANIFICA TU EVENTO' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Ruta no encontrada')).not.toBeInTheDocument()
  })

  it('mantiene protegida una ruta administrativa válida', async () => {
    renderRouter('/inicio')

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login')
    })
    expect(
      screen.getByRole('heading', { name: 'Acceso administrativo' }),
    ).toBeInTheDocument()
  })
})
