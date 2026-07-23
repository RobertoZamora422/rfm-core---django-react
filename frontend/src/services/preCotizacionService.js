import { apiClient } from './apiClient'

export async function crearPreCotizacion(payload) {
  const { data } = await apiClient.post('/pre-cotizacion/', payload)
  return data
}

export async function guardarPreferenciaPreCotizacion(payload) {
  const { data } = await apiClient.post('/pre-cotizacion/preferencia/', payload)
  return data
}

export async function listarTiposEventoPublicos() {
  const { data } = await apiClient.get('/public/tipos-evento/')
  return data
}

export async function obtenerConfiguracionPublica() {
  const { data } = await apiClient.get('/public/configuracion/')
  return data
}
