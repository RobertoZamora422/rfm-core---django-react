export function Card({ children, className = '', ...props }) {
  return (
    <section className={['card', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </section>
  )
}
