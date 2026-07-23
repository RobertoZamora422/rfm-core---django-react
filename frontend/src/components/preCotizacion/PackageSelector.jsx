import { Check, ChevronDown, PackageCheck, Sparkles } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { Button } from '../ui/Button'

const CATEGORY_LABELS = {
  estandar: 'Estándar',
  premium: 'Premium',
  vip: 'VIP',
}

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

function PackageCard({ isSelected, onSelect, paquete }) {
  const principales = (paquete.beneficios ?? []).filter((item) => item.tipo === 'principal')
  const detalle = (paquete.beneficios ?? []).filter((item) => item.tipo !== 'principal')

  return (
    <article className={`public-package-card${isSelected ? ' public-package-card--selected' : ''}`}>
      <label className="public-package-card__select">
        <input checked={isSelected} name="paquete" onChange={onSelect} type="radio" value={paquete.id} />
        <span className="public-package-card__radio" aria-hidden="true"><Check size={14} /></span>
        <span>{isSelected ? 'Paquete seleccionado' : 'Seleccionar paquete'}</span>
      </label>
      <div className="public-package-card__heading">
        <div>
          <span className="public-package-card__category">{paquete.categoria_display}</span>
          <h4>{paquete.nombre}</h4>
        </div>
        {paquete.destacado ? (
          <span className="public-package-card__featured"><Sparkles size={14} /> Destacado</span>
        ) : paquete.etiqueta_comercial ? (
          <span className="public-package-card__tag">{paquete.etiqueta_comercial}</span>
        ) : null}
      </div>
      <p>{paquete.resumen_corto}</p>
      <div className="public-package-card__prices">
        <div><span>Por persona</span><strong>{formatCurrency(paquete.precio_por_persona)}</strong></div>
        <div><span>Total estimado</span><strong>{paquete.total_estimado ? formatCurrency(paquete.total_estimado) : 'Ingresa invitados'}</strong></div>
      </div>
      <BenefitList items={principales.slice(0, 4)} />
      {(principales.length > 4 || detalle.length) ? (
        <details className="public-package-card__details">
          <summary>Ver detalle completo <ChevronDown aria-hidden="true" size={16} /></summary>
          <BenefitList items={[...principales.slice(4), ...detalle]} />
        </details>
      ) : null}
    </article>
  )
}

export function PackageSelector({
  catalog,
  isGuided,
  onSelect,
  onToggleAll,
  selectedId,
  showAll,
}) {
  const paquetes = catalog.paquetes ?? []
  const recommendedIds = new Set(catalog.recomendados ?? [])
  const visible = isGuided && !showAll
    ? paquetes.filter((paquete) => recommendedIds.has(paquete.id))
    : paquetes
  const selected = paquetes.find((paquete) => String(paquete.id) === String(selectedId))
  const grouped = Object.entries(CATEGORY_LABELS)
    .map(([category, label]) => ({
      category,
      label,
      items: visible.filter((paquete) => paquete.categoria === category),
    }))
    .filter((group) => group.items.length)

  return (
    <div className="public-package-selector">
      {isGuided ? (
        <div className="public-package-guidance">
          <div>
            <span>Recomendación orientativa</span>
            <strong>{showAll ? 'Estás revisando los seis paquetes' : `Te sugerimos ${visible.length} opciones`}</strong>
            <p>Puedes elegir una recomendación o abrir todo el catálogo antes de continuar.</p>
          </div>
          <Button onClick={onToggleAll} type="button" variant="secondary">
            {showAll ? 'Ver recomendados' : 'Revisar todos'}
          </Button>
        </div>
      ) : null}

      {(catalog.incluidos_en_todos ?? []).length ? (
        <section className="public-common-benefits">
          <div>
            <PackageCheck aria-hidden="true" size={20} />
            <h4>Todos los paquetes incluyen</h4>
          </div>
          <ul>
            {catalog.incluidos_en_todos.map((item) => (
              <li key={item.id}><Check aria-hidden="true" size={14} /> {item.titulo}</li>
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
          <div><span>Tu selección</span><strong>{selected.nombre}</strong></div>
          <div><span>Por persona</span><strong>{formatCurrency(selected.precio_por_persona)}</strong></div>
          <div><span>Total estimado</span><strong>{selected.total_estimado ? formatCurrency(selected.total_estimado) : 'Pendiente de invitados'}</strong></div>
        </aside>
      ) : null}
    </div>
  )
}
