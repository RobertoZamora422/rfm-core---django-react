export function Input({ error, helpText, icon: Icon, id, label, ...props }) {
  const describedBy = error ? `${id}-error` : helpText ? `${id}-help` : undefined
  const control = (
    <input
      aria-describedby={describedBy}
      aria-invalid={Boolean(error)}
      className={Icon ? 'field__control field__control--with-leading-icon' : 'field__control'}
      id={id}
      {...props}
    />
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
      {helpText && !error ? (
        <span className="field__help" id={`${id}-help`}>
          {helpText}
        </span>
      ) : null}
      {error ? (
        <span className="field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
