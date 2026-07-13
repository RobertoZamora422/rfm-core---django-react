export function Button({
  children,
  className = '',
  icon: Icon,
  isLoading = false,
  loadingLabel = 'Procesando',
  type = 'button',
  variant = 'primary',
  ...props
}) {
  const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ')

  return (
    <button className={classes} type={type} {...props} disabled={isLoading || props.disabled}>
      {Icon ? <Icon aria-hidden="true" size={18} /> : null}
      <span>{isLoading ? loadingLabel : children}</span>
    </button>
  )
}
