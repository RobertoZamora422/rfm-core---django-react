import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'
const AUTH_TOKEN_KEY = 'rfm_core_auth_token'
const AUTH_USER_KEY = 'rfm_core_auth_user'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function getStoredAuth() {
  const token = window.sessionStorage.getItem(AUTH_TOKEN_KEY)
  const userValue = window.sessionStorage.getItem(AUTH_USER_KEY)
  return {
    token,
    user: userValue ? JSON.parse(userValue) : null,
  }
}

export function setStoredAuth({ token, user }) {
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token)
  window.sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearStoredAuth() {
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY)
  window.sessionStorage.removeItem(AUTH_USER_KEY)
}

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Basic ${token}`
    return
  }

  delete apiClient.defaults.headers.common.Authorization
}

apiClient.interceptors.request.use((config) => {
  const { token } = getStoredAuth()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Basic ${token}`
  }
  return config
})
