import { apiClient } from './apiClient'

const PREQUOTE_RESULT_KEY = 'rfm_core_public_prequote_result'

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

export function savePreCotizacionResult(result) {
  window.sessionStorage.setItem(PREQUOTE_RESULT_KEY, JSON.stringify(result))
}

export function getPreCotizacionResult() {
  const value = window.sessionStorage.getItem(PREQUOTE_RESULT_KEY)
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function buildWhatsappUrl(message, whatsappNumeroUrl) {
  const number = String(whatsappNumeroUrl ?? '').replace(/[^\d]/g, '')
  if (!number) return ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
