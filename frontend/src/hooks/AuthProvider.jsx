import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AUTH_EXPIRED_EVENT,
  clearStoredAuth,
  getStoredAuth,
  setAuthToken,
  setStoredAuth,
} from '../services/apiClient'
import { loginRequest, logoutRequest, meRequest } from '../services/authService'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const storedAuth = getStoredAuth()
  const [user, setUser] = useState(storedAuth.user)
  const [token, setToken] = useState(storedAuth.token)
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(storedAuth.token))

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  useEffect(() => {
    const handleExpiredSession = () => {
      setToken(null)
      setUser(null)
      setIsCheckingSession(false)
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession)
  }, [])

  useEffect(() => {
    if (!token) {
      return
    }

    let isActive = true

    meRequest()
      .then((currentUser) => {
        if (!isActive) return
        setUser(currentUser)
        setStoredAuth({ token, user: currentUser })
      })
      .catch(() => {
        if (!isActive) return
        clearStoredAuth()
        setAuthToken(null)
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (isActive) {
          setIsCheckingSession(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [token])

  const login = useCallback(async ({ username, password }) => {
    const response = await loginRequest({ username, password })
    setStoredAuth({
      token: response.auth.token,
      user: response.user,
    })
    setAuthToken(response.auth.token)
    setToken(response.auth.token)
    setUser(response.user)
    return response.user
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setAuthToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user && token),
      isCheckingSession,
      login,
      logout,
      token,
      user,
    }),
    [isCheckingSession, login, logout, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
