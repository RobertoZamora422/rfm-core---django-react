export function KpiCard({ label, value, detail }) {
  return (
    <article className="kpi-card">
      <span className="kpi-card__label">{label}</span>
      <strong className="kpi-card__value">{value}</strong>
      {detail ? <span className="kpi-card__detail">{detail}</span> : null}
    </article>
  )
}
