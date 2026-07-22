export function DashboardSectionHeader({ action, eyebrow, subtitle, title, titleId }) {
  return (
    <header className="dashboard-section-header">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2 id={titleId}>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <div className="dashboard-section-header__action">{action}</div> : null}
    </header>
  )
}
