import { apiClient } from './apiClient'

export function createResourceService(endpoint) {
  return {
    async list(params) {
      const { data } = await apiClient.get(endpoint, { params })
      return data
    },

    async retrieve(id) {
      const { data } = await apiClient.get(`${endpoint}${id}/`)
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

export const cotizacionesService = {
  ...createResourceService('/cotizaciones/'),

  async cambiarEstado(id, estado) {
    const { data } = await apiClient.post(`/cotizaciones/${id}/cambiar-estado/`, {
      estado,
    })
    return data
  },

  async convertirContrato(id, payload) {
    const { data } = await apiClient.post(`/cotizaciones/${id}/convertir-contrato/`, payload)
    return data
  },
}

export const contratosService = {
  ...createResourceService('/contratos/'),

  async cancelar(id) {
    const { data } = await apiClient.post(`/contratos/${id}/cancelar/`)
    return data
  },
}
