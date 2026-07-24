import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const sessionVersionRef = useRef(0)
  const activeTokenRef = useRef(storedAuth.token)

  const invalidateSession = useCallback(() => {
    sessionVersionRef.current += 1
    activeTokenRef.current = null
    clearStoredAuth()
    setAuthToken(null)
    setToken(null)
    setUser(null)
    setIsCheckingSession(false)
  }, [])

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  useEffect(() => {
    const handleExpiredSession = () => {
      invalidateSession()
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession)
  }, [invalidateSession])

  useEffect(() => {
    if (!token || activeTokenRef.current !== token) {
      return
    }

    let isActive = true
    const requestVersion = sessionVersionRef.current
    const canCommit = () => (
      isActive
      && sessionVersionRef.current === requestVersion
      && activeTokenRef.current === token
    )

    meRequest()
      .then((currentUser) => {
        if (!canCommit()) return
        setUser(currentUser)
        setStoredAuth({ token, user: currentUser })
      })
      .catch(() => {
        if (!canCommit()) return
        invalidateSession()
      })
      .finally(() => {
        if (canCommit()) {
          setIsCheckingSession(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [invalidateSession, token])

  const login = useCallback(async ({ username, password }) => {
    const operationVersion = sessionVersionRef.current + 1
    sessionVersionRef.current = operationVersion
    activeTokenRef.current = null
    const response = await loginRequest({ username, password })

    if (sessionVersionRef.current !== operationVersion) {
      throw new Error('La operación de autenticación fue invalidada.')
    }

    activeTokenRef.current = response.auth.token
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
    const logoutPromise = logoutRequest()
    invalidateSession()

    try {
      await logoutPromise
    } catch {
      // El cierre local debe funcionar aunque el servidor ya no esté disponible.
    }
  }, [invalidateSession])

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
