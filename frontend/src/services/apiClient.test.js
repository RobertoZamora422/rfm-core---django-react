import { beforeEach, describe, expect, it } from 'vitest'
import {
  apiClient,
  clearStoredAuth,
  getStoredAuth,
  setStoredAuth,
} from './apiClient'

describe('almacenamiento de autenticación', () => {
  beforeEach(() => {
    clearStoredAuth()
  })

  it('recupera una sesión válida', () => {
    const user = { id: 1, username: 'admin', is_staff: true }
    setStoredAuth({ token: 'token-seguro', user })

    expect(getStoredAuth()).toEqual({ token: 'token-seguro', user })
  })

  it('descarta una sesión local corrupta sin bloquear la aplicación', () => {
    window.localStorage.setItem('rfm_core_auth_token', 'token-inservible')
    window.localStorage.setItem('rfm_core_auth_user', '{json-invalido')

    expect(getStoredAuth()).toEqual({ token: null, user: null })
    expect(window.localStorage.getItem('rfm_core_auth_token')).toBeNull()
    expect(window.localStorage.getItem('rfm_core_auth_user')).toBeNull()
  })

  it('configura un timeout para evitar solicitudes indefinidas', () => {
    expect(apiClient.defaults.timeout).toBeGreaterThan(0)
    expect(apiClient.defaults.timeout).toBe(15000)
  })
})
