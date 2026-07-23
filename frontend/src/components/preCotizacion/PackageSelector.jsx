import { Check, ChevronDown, MessageCircle, PackageCheck, Sparkles, X } from 'lucide-react'
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

function PackageCard({ action, isSelected, onConsult, paquete }) {
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
      {action?.url ? (
        <a
          aria-describedby={descriptionId}
          className="button whatsapp-link public-package-card__cta"
          href={action.url}
          onClick={() => onConsult(paquete.id)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <MessageCircle aria-hidden="true" size={17} />
          <span>{action.etiqueta}</span>
        </a>
      ) : (
        <Button className="public-package-card__cta" disabled type="button">
          WhatsApp no disponible
        </Button>
      )}
    </article>
  )
}

export function PackageSelector({
  catalog,
  onClearSelection,
  onConsult,
  selectedId,
  whatsappActions = [],
}) {
  const paquetes = catalog.paquetes ?? []
  const actionsByPackage = new Map(
    whatsappActions.map((action) => [String(action.paquete_id), action]),
  )
  const selected = paquetes.find((paquete) => String(paquete.id) === String(selectedId))
  const grouped = Object.entries(CATEGORY_LABELS)
    .map(([category, label]) => ({
      category,
      label,
      items: paquetes.filter((paquete) => paquete.categoria === category),
    }))
    .filter((group) => group.items.length)

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
                action={actionsByPackage.get(String(paquete.id))}
                isSelected={String(paquete.id) === String(selectedId)}
                key={paquete.id}
                onConsult={onConsult}
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
          <Button icon={X} onClick={onClearSelection} type="button" variant="ghost">
            Quitar preferencia
          </Button>
        </aside>
      ) : null}
    </div>
  )
}
