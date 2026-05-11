import { AlertCircle } from 'lucide-react'

export function ErrorMessage({ children }) {
  if (!children) return null

  return (
    <div className="error-message" role="alert">
      <AlertCircle aria-hidden="true" size={18} />
      <span>{children}</span>
    </div>
  )
}
