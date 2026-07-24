import {
  CalendarDays,
  Check,
  Compass,
  Gift,
  MessageCircle,
  PartyPopper,
  RefreshCw,
  TreePine,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { Card } from '../ui/Card'
import { LoadingState } from '../ui/LoadingState'
import { PackageSelector } from './PackageSelector'

const serviceLabels = {
  alquiler: 'Solo alquiler',
  servicio_completo: 'Servicio completo',
  no_estoy_seguro: 'No estoy seguro',
}

function WhatsappLink({ action, className = '', label }) {
  if (!action?.url) {
    return (
      <p className="warning-message" role="status">
        El canal de WhatsApp no está disponible en este momento.
      </p>
    )
  }
  return (
    <a
      className={`button whatsapp-link ${className}`.trim()}
      href={action.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <MessageCircle aria-hidden="true" size={18} />
      <span>{label ?? action.etiqueta}</span>
    </a>
  )
}

function WhatsappCta({ action }) {
  return (
    <aside className="public-whatsapp-cta">
      <span className="public-whatsapp-cta__icon" aria-hidden="true">
        <MessageCircle size={22} />
      </span>
      <div>
        <h4>¿Necesitas ayuda para elegir?</h4>
        <p>
          Escríbenos por WhatsApp y te orientamos según tu tipo de evento, invitados y
          presupuesto.
        </p>
      </div>
      <WhatsappLink action={action} label="Continuar por WhatsApp" />
    </aside>
  )
}

function ResultSummaryBanner({ cotizacion }) {
  const serviceIcons = {
    alquiler: TreePine,
    servicio_completo: UtensilsCrossed,
    no_estoy_seguro: Compass,
  }
  const items = [
    {
      icon: PartyPopper,
      label: 'Tipo de evento',
      value: cotizacion.tipo_evento_nombre,
    },
    {
      icon: CalendarDays,
      label: 'Fecha tentativa',
      value: formatDate(cotizacion.fecha_tentativa),
    },
    {
      icon: UsersRound,
      label: 'Cantidad',
      value: `${cotizacion.numero_invitados} invitados`,
    },
    {
      icon: serviceIcons[cotizacion.tipo_servicio] ?? Compass,
      label: 'Modalidad elegida',
      value: serviceLabels[cotizacion.tipo_servicio],
    },
  ]

  return (
    <div aria-label="Resumen del evento" className="public-event-summary" role="group">
      {items.map((item) => (
        <div key={item.label}>
          <item.icon aria-hidden="true" size={20} />
          <div className="public-event-summary__copy">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function BenefitList({ items }) {
  if (!items?.length) return null
  return (
    <ul className="public-commercial-list">
      {items.map((item, index) => (
        <li key={item.id ?? item.titulo ?? index}>
          <Check aria-hidden="true" size={16} />
          <span>
            <strong>{item.titulo}</strong>
            {item.detalle ? <small>{item.detalle}</small> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BenefitsPanel({ items, title }) {
  const principales = (items ?? []).filter((item) => item.tipo === 'principal')
  if (!principales.length) return null
  return (
    <section className="public-benefits-panel">
      <div className="public-benefits-panel__heading">
        <Gift aria-hidden="true" size={20} />
        <h4>{title}</h4>
      </div>
      <BenefitList items={principales} />
    </section>
  )
}

function RentalBreakdown({ calculo }) {
  const hasAdditionalGuests = Number(calculo.invitados_adicionales) > 0
  return (
    <section className="public-calculation-panel">
      <h4>Detalle de tu estimación</h4>
      <dl className="calculation-list">
        <div>
          <dt>Uso del local</dt>
          <dd>{formatCurrency(calculo.tarifa_base_alquiler)}</dd>
        </div>
        <div>
          <dt>Invitados contemplados</dt>
          <dd>{calculo.invitados_incluidos_alquiler}</dd>
        </div>
        {hasAdditionalGuests ? (
          <>
            <div>
              <dt>Invitados adicionales</dt>
              <dd>{calculo.invitados_adicionales}</dd>
            </div>
            <div>
              <dt>Valor por invitado adicional</dt>
              <dd>{formatCurrency(calculo.costo_invitado_adicional)}</dd>
            </div>
            <div>
              <dt>Subtotal adicional</dt>
              <dd>{formatCurrency(calculo.costo_adicional)}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </section>
  )
}

function AlquilerResult({ calculo, whatsapp }) {
  return (
    <div className="public-result-mode public-rental-result">
      <div className="public-result-hero">
        <div>
          <span className="public-result-eyebrow">Solo alquiler</span>
          <h3>Esta opción es ideal para ti</h3>
          <p>
            ¿Ya tienes tu propio equipo o planeas organizar el evento por tu cuenta? Entonces
            Rancho Flor María puede ser el escenario de tu celebración.
          </p>
        </div>
        <div className="result-total">
          <span>Tu estimación</span>
          <strong>{formatCurrency(calculo.total_estimado)}</strong>
        </div>
      </div>

      <div className="public-rental-grid">
        <BenefitsPanel
          items={calculo.beneficios_principales}
          title="Beneficios incluidos"
        />
        <RentalBreakdown calculo={calculo} />
      </div>
      <WhatsappLink action={whatsapp?.principal} label="Continuar por WhatsApp" />
    </div>
  )
}

function ServicioCompletoResult({
  calculo,
  isSavingPreference,
  onClearPackage,
  onPackageSelect,
  preferenceError,
  selectedPackageId,
  whatsapp,
}) {
  return (
    <div className="public-result-mode public-service-result">
      <div className="public-result-section-heading">
        <span className="public-result-eyebrow">Servicio completo</span>
        <h3>Nosotros nos encargamos, tú solo disfrutas</h3>
        <p>Explora nuestros paquetes o cuéntanos tu idea.</p>
      </div>
      {preferenceError ? <p className="warning-message" role="alert">{preferenceError}</p> : null}
      <PackageSelector
        catalog={calculo}
        isSaving={isSavingPreference}
        onClearSelection={onClearPackage}
        onSelect={onPackageSelect}
        selectedId={selectedPackageId}
      />
      <WhatsappCta action={whatsapp?.principal} />
    </div>
  )
}

function formatRange(desde, hasta) {
  return desde === hasta
    ? formatCurrency(desde)
    : `${formatCurrency(desde)} – ${formatCurrency(hasta)}`
}

function NoEstoySeguroResult({ calculo, whatsapp }) {
  const alquiler = calculo.alquiler ?? {}
  const servicio = calculo.servicio_completo ?? {}
  return (
    <div className="public-result-mode public-comparison-result">
      <div className="public-result-section-heading">
        <span className="public-result-eyebrow">Explora con libertad</span>
        <h3>Cualquier camino es posible para tu evento</h3>
        <p>Conversa con nosotros y empecemos a personalizar tu propuesta.</p>
      </div>

      <article className="comparison-public-card comparison-public-card--rental">
        <div className="comparison-public-card__heading">
          <span aria-hidden="true"><TreePine size={20} /></span>
          <h4>Solo alquiler</h4>
        </div>
        <p>
          Para quienes cuentan con su propio equipo o proveedores, o simplemente desean
          organizar el evento por su cuenta.
        </p>
        <div className="comparison-public-card__total">
          <small>Tu estimación</small>
          <strong>{formatCurrency(alquiler.total_estimado)}</strong>
        </div>
        <RentalBreakdown calculo={alquiler} />
      </article>

      <BenefitsPanel
        items={alquiler.beneficios_principales}
        title="Beneficios comunes"
      />

      <article className="comparison-public-card comparison-public-card--service">
        <div className="comparison-public-card__heading">
          <span aria-hidden="true"><UtensilsCrossed size={20} /></span>
          <h4>Servicio completo</h4>
        </div>
        <div className="comparison-category-list">
          {(servicio.categorias ?? []).map((categoria) => (
            <article key={categoria.categoria}>
              <div>
                <strong>{categoria.categoria_display}</strong>
                {categoria.resumen ? <small>{categoria.resumen}</small> : null}
              </div>
              <span>
                {formatRange(
                  categoria.precio_por_persona_desde,
                  categoria.precio_por_persona_hasta,
                )} / persona
              </span>
            </article>
          ))}
        </div>
      </article>

      <WhatsappCta action={whatsapp?.principal} />
    </div>
  )
}

export function PreCotizacionResult({
  headingRef,
  isSavingPreference,
  isStale,
  isSubmitting,
  onClearPackage,
  onPackageConsult,
  preferenceError,
  result,
  selectedPackageId,
}) {
  if (!result && !isSubmitting) return null

  return (
    <section className="public-result-section" aria-labelledby="public-result-title">
      <Card className="public-result-card" aria-busy={isSubmitting}>
        {isSubmitting ? (
          <div className="public-result-loading" role="status">
            <LoadingState label="Preparando tus opciones y estimación" />
            <p>Estamos consultando los valores y beneficios vigentes.</p>
          </div>
        ) : isStale ? (
          <div className="public-result-stale" role="status">
            <RefreshCw aria-hidden="true" size={25} />
            <div>
              <h2 id="public-result-title" ref={headingRef} tabIndex="-1">
                Tus opciones necesitan actualizarse
              </h2>
              <p>
                Cambiaste información del evento. Confirma nuevamente para ver los valores
                actualizados.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="public-result-card__heading">
              <div>
                <span className="public-result-eyebrow">
                  Pre-cotización #{result.cotizacion.id}
                </span>
                <h2 id="public-result-title" ref={headingRef} tabIndex="-1">
                  Tu evento, en un vistazo
                </h2>
              </div>
            </header>
            <ResultSummaryBanner cotizacion={result.cotizacion} />
            {result.calculo.tipo_servicio === 'alquiler' ? (
              <AlquilerResult calculo={result.calculo} whatsapp={result.whatsapp} />
            ) : result.calculo.tipo_servicio === 'servicio_completo' ? (
              <ServicioCompletoResult
                calculo={result.calculo}
                isSavingPreference={isSavingPreference}
                onClearPackage={onClearPackage}
                onPackageSelect={onPackageConsult}
                preferenceError={preferenceError}
                selectedPackageId={selectedPackageId}
                whatsapp={result.whatsapp}
              />
            ) : (
              <NoEstoySeguroResult calculo={result.calculo} whatsapp={result.whatsapp} />
            )}
          </>
        )}
      </Card>
    </section>
  )
}
