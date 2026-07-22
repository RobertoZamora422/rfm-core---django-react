export function MetricCard({
  className = '',
  detail,
  footer,
  icon: Icon,
  label,
  tone = 'sage',
  value,
}) {
  const classes = ['metric-card', `metric-card--${tone}`, className].filter(Boolean).join(' ')

  return (
    <article aria-label={label} className={classes}>
      <div className="metric-card__header">
        <span className="metric-card__label">{label}</span>
        {Icon ? (
          <span className="metric-card__icon" aria-hidden="true">
            <Icon size={19} />
          </span>
        ) : null}
      </div>
      <strong className="metric-card__value">{value}</strong>
      {detail ? <p className="metric-card__detail">{detail}</p> : null}
      {footer ? <div className="metric-card__footer">{footer}</div> : null}
    </article>
  )
}
