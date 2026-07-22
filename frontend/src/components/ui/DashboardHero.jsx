export function DashboardHero({
  actions,
  children,
  description,
  eyebrow,
  eyebrowDetail,
  icon: Icon,
  iconAlt = '',
  iconImage,
  title,
}) {
  return (
    <header className="dashboard-hero">
      <div className="dashboard-hero__main">
        <div className="dashboard-hero__heading">
          {iconImage ? (
            <span className="dashboard-hero__icon dashboard-hero__icon--brand">
              <img alt={iconAlt} src={iconImage} />
            </span>
          ) : Icon ? (
            <span className="dashboard-hero__icon" aria-hidden="true">
              <Icon size={24} />
            </span>
          ) : null}
          <div>
            {eyebrow ? (
              <span className="dashboard-hero__eyebrow">
                {eyebrow}
                {eyebrowDetail ? (
                  <>
                    {' '}
                    <strong className="dashboard-hero__eyebrow-detail">{eyebrowDetail}</strong>
                  </>
                ) : null}
              </span>
            ) : null}
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
