import { apiClient } from './apiClient'

export async function crearPreCotizacion(payload) {
  const { data } = await apiClient.post('/pre-cotizacion/', payload)
  return data
}

export async function listarTiposEventoPublicos() {
  const { data } = await apiClient.get('/public/tipos-evento/')
  return data
}

export async function listarPaquetesPublicos(params) {
  const { data } = await apiClient.get('/public/paquetes/', { params })
  return data
}

export async function obtenerConfiguracionPublica() {
  const { data } = await apiClient.get('/public/configuracion/')
  return data
}

export function buildWhatsappUrl(message, whatsappNumeroUrl) {
  const number = String(whatsappNumeroUrl ?? '').replace(/[^\d]/g, '')
  if (!number) return ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
