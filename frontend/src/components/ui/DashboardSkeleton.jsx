function SkeletonBlock({ className = '' }) {
  return <span aria-hidden="true" className={['skeleton-block', className].filter(Boolean).join(' ')} />
}

export function DashboardSkeleton({ label = 'Cargando información', variant = 'default' }) {
  const metricCount = variant === 'financial' ? 6 : 4

  return (
    <div className="dashboard-skeleton" role="status">
      <span className="sr-only">{label}</span>
      <div className="dashboard-skeleton__metrics">
        {Array.from({ length: metricCount }, (_, index) => (
          <div className="dashboard-skeleton__metric" key={index}>
            <SkeletonBlock className="skeleton-block--label" />
            <SkeletonBlock className="skeleton-block--value" />
            <SkeletonBlock className="skeleton-block--line" />
          </div>
        ))}
      </div>
      <div className="dashboard-skeleton__panels">
        <div>
          <SkeletonBlock className="skeleton-block--title" />
          <SkeletonBlock className="skeleton-block--panel" />
        </div>
        <div>
          <SkeletonBlock className="skeleton-block--title" />
          <SkeletonBlock className="skeleton-block--panel" />
        </div>
      </div>
    </div>
  )
}
