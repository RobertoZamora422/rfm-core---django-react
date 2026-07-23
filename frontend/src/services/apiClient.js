import axios from 'axios'

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL

if (import.meta.env.PROD && !envApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL es obligatoria para compilar el frontend en produccion.')
}

const API_BASE_URL = envApiBaseUrl ?? 'http://127.0.0.1:8000/api'
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000)
const API_TIMEOUT_MS = (
  Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 15000
)
const AUTH_TOKEN_KEY = 'rfm_core_auth_token'
const AUTH_USER_KEY = 'rfm_core_auth_user'
export const DATA_CHANGED_EVENT = 'rfm:data-changed'
export const AUTH_EXPIRED_EVENT = 'rfm:auth-expired'

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete'])

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function getStoredAuth() {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  const userValue = window.localStorage.getItem(AUTH_USER_KEY)

  if (!userValue) {
    return { token, user: null }
  }

  try {
    return {
      token,
      user: JSON.parse(userValue),
    }
  } catch {
    clearStoredAuth()
    return { token: null, user: null }
  }
}

export function setStoredAuth({ token, user }) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
}

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Token ${token}`
    return
  }

  delete apiClient.defaults.headers.common.Authorization
}

apiClient.interceptors.request.use((config) => {
  const { token } = getStoredAuth()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase()

    if (MUTATION_METHODS.has(method)) {
      const detail = {
        method,
        url: response.config.url ?? '',
        timestamp: Date.now(),
      }

      window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail }))

      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(DATA_CHANGED_EVENT)
        channel.postMessage(detail)
        channel.close()
      }
    }

    return response
  },
  (error) => {
    if (error?.response?.status === 401 && getStoredAuth().token) {
      clearStoredAuth()
      setAuthToken(null)
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)
