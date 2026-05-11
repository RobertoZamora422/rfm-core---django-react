import { Inbox } from 'lucide-react'

export function EmptyState({
  action,
  description = 'No existen registros para mostrar.',
  icon: Icon = Inbox,
  title = 'Sin datos',
}) {
  return (
    <div className="empty-state">
      <Icon aria-hidden="true" size={28} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  )
}
