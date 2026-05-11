const STATUS_VARIANTS = {
  abonado: 'warning',
  cancelado: 'neutral-dark',
  confirmada: 'success',
  confirmado: 'success',
  contactada: 'notice',
  convertida: 'strong-success',
  descartada: 'neutral',
  nueva: 'info',
  pagado: 'success',
  pendiente: 'warning',
}

export function StatusBadge({ children, status }) {
  const variant = STATUS_VARIANTS[status] ?? 'neutral'

  return <span className={`status-badge status-badge--${variant}`}>{children ?? status}</span>
}
