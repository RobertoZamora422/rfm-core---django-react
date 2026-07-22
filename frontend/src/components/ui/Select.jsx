export function Select({ children, error, icon: Icon, id, label, ...props }) {
  const control = (
    <select
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={Boolean(error)}
      className={Icon ? 'field__control field__control--with-leading-icon' : 'field__control'}
      id={id}
      {...props}
    >
      {children}
    </select>
  )

  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">
        {label}
        {props.required ? <span className="field__required" aria-hidden="true"> *</span> : null}
      </span>
      {Icon ? (
        <span className="field__control-wrap">
          <Icon aria-hidden="true" className="field__control-icon" size={18} />
          {control}
        </span>
      ) : (
        control
      )}
      {error ? (
        <span className="field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
