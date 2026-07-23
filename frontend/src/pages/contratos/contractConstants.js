export const ESTADOS_CONTRATO_FILTRO = [
  { value: '', label: 'Todos los estados' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'cancelado', label: 'Cancelado' },
]

export const ESTADOS_PAGO_FILTRO = [
  { value: '', label: 'Todos los pagos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'abonado', label: 'Abonado' },
  { value: 'pagado', label: 'Pagado' },
]

export const ESTADO_CONTRATO_LABELS = {
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
}

export const ESTADO_PAGO_LABELS = {
  pendiente: 'Pendiente',
  abonado: 'Abonado',
  pagado: 'Pagado',
}

export const TIPO_SERVICIO_LABELS = {
  alquiler: 'Alquiler del local',
  servicio_completo: 'Servicio completo',
}

export const TIPOS_SERVICIO_FILTRO = [
  { value: '', label: 'Todos los servicios' },
  { value: 'alquiler', label: TIPO_SERVICIO_LABELS.alquiler },
  { value: 'servicio_completo', label: TIPO_SERVICIO_LABELS.servicio_completo },
]

export function getTipoServicioLabel(value) {
  return TIPO_SERVICIO_LABELS[value] ?? 'Requiere revisión'
}

export function getEstadoContratoLabel(status) {
  return ESTADO_CONTRATO_LABELS[status] ?? status
}

export function getEstadoPagoLabel(status) {
  return ESTADO_PAGO_LABELS[status] ?? status
}
