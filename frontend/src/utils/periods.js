export const MONTH_OPTIONS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

export function getCurrentPeriodValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function periodToFilters(periodValue, fallback = getCurrentPeriodValue()) {
  const safeValue = /^\d{4}-(0[1-9]|1[0-2])$/.test(periodValue) ? periodValue : fallback
  const [anio, mes] = safeValue.split('-')
  return { mes: String(Number(mes)), anio }
}

export function filtersToPeriod({ anio, mes }) {
  if (!anio || !mes) return getCurrentPeriodValue()
  return `${anio}-${String(mes).padStart(2, '0')}`
}

export function shiftPeriod(periodValue, delta) {
  const { anio, mes } = periodToFilters(periodValue)
  const date = new Date(Number(anio), Number(mes) - 1 + delta, 1)
  return getCurrentPeriodValue(date)
}

export function getMonthLabel(value) {
  return MONTH_OPTIONS.find((month) => month.value === String(value))?.label ?? value
}

export function getPeriodLabel(periodValue) {
  const { anio, mes } = periodToFilters(periodValue)
  return `${getMonthLabel(mes)} ${anio}`
}
