import { apiClient, clearStoredAuth } from './apiClient'

export async function loginRequest(credentials) {
  const { data } = await apiClient.post('/auth/login/', credentials)
  return data
}

export async function logoutRequest() {
  try {
    await apiClient.post('/auth/logout/')
  } finally {
    clearStoredAuth()
  }
}

export async function meRequest() {
  const { data } = await apiClient.get('/auth/me/')
  return data
}
