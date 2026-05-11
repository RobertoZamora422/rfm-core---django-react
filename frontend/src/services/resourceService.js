import { apiClient } from './apiClient'

export function createResourceService(endpoint) {
  return {
    async list(params) {
      const { data } = await apiClient.get(endpoint, { params })
      return data
    },

    async create(payload) {
      const { data } = await apiClient.post(endpoint, payload)
      return data
    },

    async update(id, payload) {
      const { data } = await apiClient.patch(`${endpoint}${id}/`, payload)
      return data
    },

    async remove(id) {
      await apiClient.delete(`${endpoint}${id}/`)
    },
  }
}

export const clientesService = createResourceService('/clientes/')
export const tiposEventoService = createResourceService('/tipos-evento/')
export const paquetesService = createResourceService('/paquetes/')
export const configuracionNegocioService = createResourceService('/configuracion-negocio/')
