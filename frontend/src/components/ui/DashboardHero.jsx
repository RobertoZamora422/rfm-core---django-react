export function DashboardHero({ actions, children, description, eyebrow, icon: Icon, title }) {
  return (
    <header className="dashboard-hero">
      <div className="dashboard-hero__main">
        <div className="dashboard-hero__heading">
          {Icon ? (
            <span className="dashboard-hero__icon" aria-hidden="true">
              <Icon size={24} />
            </span>
          ) : null}
          <div>
            {eyebrow ? <span className="dashboard-hero__eyebrow">{eyebrow}</span> : null}
            <h1>{title}</h1>
          </div>
        </div>
        {description ? <p>{description}</p> : null}
        {actions ? <div className="dashboard-hero__actions">{actions}</div> : null}
      </div>
      {children ? <div className="dashboard-hero__aside">{children}</div> : null}
    </header>
  )
}
