import axios from 'axios'

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL

if (import.meta.env.PROD && !envApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL es obligatoria para compilar el frontend en produccion.')
}

const API_BASE_URL = envApiBaseUrl ?? 'http://127.0.0.1:8000/api'
const AUTH_TOKEN_KEY = 'rfm_core_auth_token'
const AUTH_USER_KEY = 'rfm_core_auth_user'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function getStoredAuth() {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  const userValue = window.localStorage.getItem(AUTH_USER_KEY)
  return {
    token,
    user: userValue ? JSON.parse(userValue) : null,
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
