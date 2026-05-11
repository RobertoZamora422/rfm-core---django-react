export function Input({ error, helpText, id, label, ...props }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <input
        aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
        aria-invalid={Boolean(error)}
        className="field__control"
        id={id}
        {...props}
      />
      {helpText && !error ? (
        <span className="field__help" id={`${id}-help`}>
          {helpText}
        </span>
      ) : null}
      {error ? (
        <span className="field__error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  )
}
