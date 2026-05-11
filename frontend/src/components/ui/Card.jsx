export function Card({ children, className = '' }) {
  return <section className={['card', className].filter(Boolean).join(' ')}>{children}</section>
}
