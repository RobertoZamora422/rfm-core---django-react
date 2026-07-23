import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearStoredAuth } from '../services/apiClient'
import { useAuth } from './useAuth'
import { AuthProvider } from './AuthProvider'

const { loginRequest, logoutRequest, meRequest } = vi.hoisted(() => ({
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  meRequest: vi.fn(),
}))

vi.mock('../services/authService', () => ({
  loginRequest,
  logoutRequest,
  meRequest,
}))

function AuthHarness() {
  const auth = useAuth()
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      await auth.login({ username: 'admin', password: 'test' })
    } catch {
      setError('error')
    }
  }

  return (
    <>
      <span>{auth.isAuthenticated ? auth.user.username : 'sin sesión'}</span>
      <span>{error}</span>
      <button type="button" onClick={handleLogin}>
        Entrar
      </button>
      <button type="button" onClick={auth.logout}>
        Salir
      </button>
    </>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    clearStoredAuth()
    loginRequest.mockReset()
    logoutRequest.mockReset()
    meRequest.mockReset()
  })

  it('inicia sesión y siempre permite cerrarla localmente aunque falle la red', async () => {
    loginRequest.mockResolvedValue({
      auth: { token: 'token-activo' },
      user: { id: 1, username: 'admin', is_staff: true },
    })
    meRequest.mockResolvedValue({ id: 1, username: 'admin', is_staff: true })
    logoutRequest.mockRejectedValue(new Error('sin red'))

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('admin')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))
    await waitFor(() => expect(screen.getByText('sin sesión')).toBeInTheDocument())
    expect(window.localStorage.getItem('rfm_core_auth_token')).toBeNull()
  })
})
