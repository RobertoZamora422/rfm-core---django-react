import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiClient,
  clearStoredAuth,
  setAuthToken,
  setStoredAuth,
} from '../services/apiClient'
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
      <span data-testid="auth-token">{auth.token ?? 'sin token'}</span>
      <span data-testid="auth-user">{auth.user?.username ?? 'sin usuario'}</span>
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

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

describe('AuthProvider', () => {
  beforeEach(() => {
    clearStoredAuth()
    setAuthToken(null)
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
    expect(await screen.findByTestId('auth-user')).toHaveTextContent('admin')

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))
    await waitFor(() => expect(screen.getByText('sin sesión')).toBeInTheDocument())
    expect(screen.getByTestId('auth-token')).toHaveTextContent('sin token')
    expect(screen.getByTestId('auth-user')).toHaveTextContent('sin usuario')
    expect(window.localStorage.getItem('rfm_core_auth_token')).toBeNull()
    expect(window.localStorage.getItem('rfm_core_auth_user')).toBeNull()
    expect(apiClient.defaults.headers.common.Authorization).toBeUndefined()
  })

  it('ignora una validación de sesión que se resuelve después del logout', async () => {
    const meDeferred = createDeferred()
    const logoutDeferred = createDeferred()
    const storedUser = { id: 1, username: 'admin', is_staff: true }

    setStoredAuth({ token: 'token-activo', user: storedUser })
    setAuthToken('token-activo')
    meRequest.mockReturnValue(meDeferred.promise)
    logoutRequest.mockReturnValue(logoutDeferred.promise)

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-user')).toHaveTextContent('admin')
    await waitFor(() => expect(meRequest).toHaveBeenCalledOnce())

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))

    await waitFor(() => expect(screen.getByText('sin sesión')).toBeInTheDocument())
    expect(screen.getByTestId('auth-token')).toHaveTextContent('sin token')
    expect(screen.getByTestId('auth-user')).toHaveTextContent('sin usuario')
    expect(window.localStorage.getItem('rfm_core_auth_token')).toBeNull()
    expect(apiClient.defaults.headers.common.Authorization).toBeUndefined()

    await act(async () => {
      meDeferred.resolve({ ...storedUser, username: 'respuesta-antigua' })
      await meDeferred.promise
    })

    expect(screen.getByText('sin sesión')).toBeInTheDocument()
    expect(screen.getByTestId('auth-token')).toHaveTextContent('sin token')
    expect(screen.getByTestId('auth-user')).toHaveTextContent('sin usuario')
    expect(screen.queryByText('respuesta-antigua')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('rfm_core_auth_token')).toBeNull()
    expect(window.localStorage.getItem('rfm_core_auth_user')).toBeNull()
    expect(apiClient.defaults.headers.common.Authorization).toBeUndefined()

    await act(async () => {
      logoutDeferred.resolve()
      await logoutDeferred.promise
    })
  })
})
