export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '-'

  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value))
}

export function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}
