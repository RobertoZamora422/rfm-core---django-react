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

export const personasService = {
  ...createResourceService('/personas/'),

  async coincidencias(params) {
    const { data } = await apiClient.get('/personas/coincidencias/', { params })
    return data
  },

  async resumen(params) {
    const { data } = await apiClient.get('/personas/resumen/', { params })
    return data
  },
}
export const tiposEventoService = createResourceService('/tipos-evento/')
export const paquetesService = createResourceService('/paquetes/')
export const configuracionNegocioService = createResourceService('/configuracion-negocio/')

export const inicioService = {
  async resumen() {
    const { data } = await apiClient.get('/inicio-resumen/')
    return data
  },
}

export const cotizacionesService = {
  ...createResourceService('/cotizaciones/'),

  async cambiarEstado(id, estado) {
    const { data } = await apiClient.post(`/cotizaciones/${id}/cambiar-estado/`, {
      estado,
    })
    return data
  },

  async resumen(params) {
    const { data } = await apiClient.get('/cotizaciones/resumen/', { params })
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

  async resumen(params) {
    const { data } = await apiClient.get('/contratos/resumen/', { params })
    return data
  },
}

export const costosDirectosService = {
  ...createResourceService('/costos-directos/'),

  async resumen(params) {
    const { data } = await apiClient.get('/costos-directos/resumen/', { params })
    return data
  },
}

export const gastosFijosService = {
  ...createResourceService('/gastos-fijos/'),

  async resumen(params) {
    const { data } = await apiClient.get('/gastos-fijos/resumen/', { params })
    return data
  },
}

export const dashboardFinancieroService = {
  async resumen(params) {
    const { data } = await apiClient.get('/dashboard-financiero/', { params })
    return data
  },
}

export const reportesService = {
  async comercial(params) {
    const { data } = await apiClient.get('/reportes/comercial/', { params })
    return data
  },

  async financiero(params) {
    const { data } = await apiClient.get('/reportes/financiero/', { params })
    return data
  },

  async eventos(params) {
    const { data } = await apiClient.get('/reportes/eventos/', { params })
    return data
  },

  async paquetes(params) {
    const { data } = await apiClient.get('/reportes/paquetes/', { params })
    return data
  },
}
