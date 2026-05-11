export const ESTADO_LABELS = {
  nueva: 'Nueva',
  contactada: 'Contactada',
  confirmada: 'Confirmada',
  convertida: 'Convertida',
  descartada: 'Descartada',
}

export const ESTADOS_FILTRO = [
  { value: '', label: 'Todos los estados' },
  { value: 'nueva', label: ESTADO_LABELS.nueva },
  { value: 'contactada', label: ESTADO_LABELS.contactada },
  { value: 'confirmada', label: ESTADO_LABELS.confirmada },
  { value: 'convertida', label: ESTADO_LABELS.convertida },
  { value: 'descartada', label: ESTADO_LABELS.descartada },
]

export const ESTADOS_CAMBIO = [
  { value: 'nueva', label: ESTADO_LABELS.nueva },
  { value: 'contactada', label: ESTADO_LABELS.contactada },
  { value: 'confirmada', label: ESTADO_LABELS.confirmada },
  { value: 'descartada', label: ESTADO_LABELS.descartada },
]

export const TIPO_SERVICIO_LABELS = {
  alquiler: 'Alquiler',
  servicio_completo: 'Servicio completo',
}

export function getEstadoLabel(estado) {
  return ESTADO_LABELS[estado] ?? estado
}

export function canConvertQuote(cotizacion) {
  return cotizacion?.estado === 'confirmada' && !cotizacion?.contrato_id
}

export function canChangeQuoteStatus(cotizacion) {
  return cotizacion?.estado !== 'convertida'
}
