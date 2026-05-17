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

export function getEstadoContratoLabel(status) {
  return ESTADO_CONTRATO_LABELS[status] ?? status
}

export function getEstadoPagoLabel(status) {
  return ESTADO_PAGO_LABELS[status] ?? status
}
