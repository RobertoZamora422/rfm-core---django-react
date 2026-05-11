import { apiClient } from './apiClient'

export async function crearPreCotizacion(payload) {
  const { data } = await apiClient.post('/pre-cotizacion/', payload)
  return data
}
