export function SummaryStrip({ groups }) {
  return (
    <section className="summary-strip" aria-label="Resumen de los resultados mostrados">
      {groups.map((group) => (
        <div className="summary-strip__group" key={group.label}>
          <span className="summary-strip__label">{group.label}</span>
          <div className="summary-strip__items">
            {group.items.map((item) => (
              <span className={`summary-strip__item ${item.tone ? `summary-strip__item--${item.tone}` : ''}`} key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
