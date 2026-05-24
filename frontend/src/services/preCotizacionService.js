import { apiClient } from './apiClient'

const PREQUOTE_RESULT_KEY = 'rfm_core_public_prequote_result'
const PREQUOTE_RESULT_TTL_MS = 24 * 60 * 60 * 1000

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
  const payload = JSON.stringify({
    result,
    savedAt: Date.now(),
  })
  window.sessionStorage.setItem(PREQUOTE_RESULT_KEY, payload)
  window.localStorage.setItem(PREQUOTE_RESULT_KEY, payload)
}

export function getPreCotizacionResult() {
  const value =
    window.sessionStorage.getItem(PREQUOTE_RESULT_KEY) ||
    window.localStorage.getItem(PREQUOTE_RESULT_KEY)
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    if (parsed?.result && parsed?.savedAt) {
      if (Date.now() - parsed.savedAt > PREQUOTE_RESULT_TTL_MS) {
        window.sessionStorage.removeItem(PREQUOTE_RESULT_KEY)
        window.localStorage.removeItem(PREQUOTE_RESULT_KEY)
        return null
      }
      return parsed.result
    }
    return parsed
  } catch {
    return null
  }
}

export function buildWhatsappUrl(message, whatsappNumeroUrl) {
  const number = String(whatsappNumeroUrl ?? '').replace(/[^\d]/g, '')
  if (!number) return ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
