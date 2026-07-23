import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../hooks/AuthContext'
import { ProtectedRoute } from './ProtectedRoute'

function renderRoute(authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/inicio']}>
        <Routes>
          <Route element={<p>Acceso</p>} path="/login" />
          <Route element={<ProtectedRoute />}>
            <Route element={<p>Panel privado</p>} path="/inicio" />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('redirige al login cuando no existe sesión', () => {
    renderRoute({
      isAuthenticated: false,
      isCheckingSession: false,
      login: vi.fn(),
      logout: vi.fn(),
      token: null,
      user: null,
    })

    expect(screen.getByText('Acceso')).toBeInTheDocument()
    expect(screen.queryByText('Panel privado')).not.toBeInTheDocument()
  })

  it('muestra la ruta privada a un usuario autenticado', () => {
    renderRoute({
      isAuthenticated: true,
      isCheckingSession: false,
      login: vi.fn(),
      logout: vi.fn(),
      token: 'token',
      user: { username: 'admin' },
    })

    expect(screen.getByText('Panel privado')).toBeInTheDocument()
  })

  it('anuncia que está validando una sesión persistida', () => {
    renderRoute({
      isAuthenticated: false,
      isCheckingSession: true,
      login: vi.fn(),
      logout: vi.fn(),
      token: 'token',
      user: null,
    })

    expect(screen.getByText('Validando sesion')).toBeInTheDocument()
  })
})
