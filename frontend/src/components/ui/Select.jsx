export function Select({ children, error, id, label, ...props }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <select
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="field__control"
        id={id}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <span className="field__error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  )
}
