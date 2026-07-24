import { Check, ChevronDown, PackageCheck, Sparkles, X } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { Button } from '../ui/Button'

function BenefitList({ items }) {
  if (!items.length) return null
  return (
    <ul className="public-package-card__benefits">
      {items.map((item, index) => (
        <li key={item.id ?? index}>
          <Check aria-hidden="true" size={15} />
          <span>
            <strong>{item.titulo}</strong>
            {item.detalle ? <small>{item.detalle}</small> : null}
            {item.minimo_invitados ? (
              <small>Desde {item.minimo_invitados} invitados.</small>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

function PackageCard({ isSaving, isSelected, onSelect, paquete }) {
  const principales = (paquete.beneficios ?? []).filter((item) => item.tipo === 'principal')
  const detalle = (paquete.beneficios ?? []).filter((item) => item.tipo !== 'principal')
  const descriptionId = `paquete-${paquete.id}-description`

  return (
    <article className={`public-package-card${isSelected ? ' public-package-card--selected' : ''}`}>
      <div className="public-package-card__heading">
        <div>
          <span className="public-package-card__category">{paquete.categoria_display}</span>
          <h4>{paquete.nombre}</h4>
        </div>
        {isSelected ? (
          <span className="public-package-card__selected-label">
            <Check size={14} /> Preferencia guardada
          </span>
        ) : paquete.destacado ? (
          <span className="public-package-card__featured"><Sparkles size={14} /> Destacado</span>
        ) : paquete.etiqueta_comercial ? (
          <span className="public-package-card__tag">{paquete.etiqueta_comercial}</span>
        ) : null}
      </div>
      <p id={descriptionId}>{paquete.resumen_corto}</p>
      <div className="public-package-card__prices">
        <div><span>Por persona</span><strong>{formatCurrency(paquete.precio_por_persona)}</strong></div>
        <div><span>Total estimado</span><strong>{formatCurrency(paquete.total_estimado)}</strong></div>
      </div>
      <BenefitList items={principales.slice(0, 4)} />
      {(principales.length > 4 || detalle.length) ? (
        <details className="public-package-card__details">
          <summary>Ver detalle completo <ChevronDown aria-hidden="true" size={16} /></summary>
          <BenefitList items={[...principales.slice(4), ...detalle]} />
        </details>
      ) : null}
      <Button
        aria-describedby={descriptionId}
        className="public-package-card__cta"
        disabled={isSaving}
        icon={isSelected ? X : Check}
        isLoading={isSaving && isSelected}
        loadingLabel="Guardando preferencia…"
        onClick={() => onSelect(isSelected ? null : paquete.id)}
        type="button"
        variant={isSelected ? 'secondary' : 'primary'}
      >
        {isSelected ? 'Quitar preferencia' : 'Elegir este paquete'}
      </Button>
    </article>
  )
}

export function PackageSelector({
  catalog,
  isSaving = false,
  onClearSelection,
  onSelect,
  selectedId,
}) {
  const paquetes = catalog.paquetes ?? []
  const selected = paquetes.find((paquete) => String(paquete.id) === String(selectedId))
  const grouped = paquetes.reduce((groups, paquete) => {
    const existing = groups.find((group) => group.category === paquete.categoria)
    if (existing) {
      existing.items.push(paquete)
    } else {
      groups.push({
        category: paquete.categoria,
        label: paquete.categoria_display || paquete.categoria,
        items: [paquete],
      })
    }
    return groups
  }, [])

  return (
    <div className="public-package-selector">
      {(catalog.incluidos_en_todos ?? []).length ? (
        <section className="public-common-benefits">
          <div>
            <PackageCheck aria-hidden="true" size={20} />
            <h4>Todos los paquetes incluyen</h4>
          </div>
          <ul>
            {catalog.incluidos_en_todos.map((item) => (
              <li key={item.id}>
                <Check aria-hidden="true" size={14} />
                <span>
                  <strong>{item.titulo}</strong>
                  {item.detalle ? <small>{item.detalle}</small> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {grouped.map((group) => (
        <section className="public-package-category" key={group.category}>
          <div className="public-package-category__heading">
            <span>{group.label}</span>
            <small>{group.items.length} {group.items.length === 1 ? 'opción' : 'opciones'}</small>
          </div>
          <div className="public-package-grid">
            {group.items.map((paquete) => (
              <PackageCard
                isSaving={isSaving}
                isSelected={String(paquete.id) === String(selectedId)}
                key={paquete.id}
                onSelect={onSelect}
                paquete={paquete}
              />
            ))}
          </div>
        </section>
      ))}

      {selected ? (
        <aside className="public-selected-package" aria-live="polite">
          <PackageCheck aria-hidden="true" size={20} />
          <div><span>Paquete de interés</span><strong>{selected.nombre}</strong></div>
          <div><span>Por persona</span><strong>{formatCurrency(selected.precio_por_persona)}</strong></div>
          <div><span>Total estimado</span><strong>{formatCurrency(selected.total_estimado)}</strong></div>
          <Button disabled={isSaving} icon={X} onClick={onClearSelection} type="button" variant="ghost">
            Quitar preferencia
          </Button>
        </aside>
      ) : null}
    </div>
  )
}
