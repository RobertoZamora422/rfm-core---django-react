import { AlertCircle } from 'lucide-react'

export function ErrorMessage({ action, children }) {
  if (!children) return null

  return (
    <div className="error-message" role="alert">
      <AlertCircle aria-hidden="true" size={18} />
      <span>{children}</span>
      {action ? <div className="error-message__action">{action}</div> : null}
    </div>
  )
}
