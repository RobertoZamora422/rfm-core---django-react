import {
  Building2,
  Check,
  CheckCircle2,
  Info,
  MessageCircle,
  RefreshCw,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { PackageSelector } from './PackageSelector'
import { Card } from '../ui/Card'
import { LoadingState } from '../ui/LoadingState'

const serviceLabels = {
  alquiler: 'Alquiler del local',
  servicio_completo: 'Servicio completo',
  no_estoy_seguro: 'No estoy seguro',
}

function WhatsappLink({ action, className = '' }) {
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
      <span>{action.etiqueta}</span>
    </a>
  )
}

function ResultMeta({ cotizacion }) {
  const items = [
    ['Evento', cotizacion.tipo_evento_nombre],
    ['Fecha', formatDate(cotizacion.fecha_tentativa)],
    ['Invitados', cotizacion.numero_invitados],
    ['Modalidad', serviceLabels[cotizacion.tipo_servicio]],
  ]
  return (
    <dl className="public-result-meta">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function EstimateNotice() {
  return (
    <div className="public-info-box public-info-box--result">
      <Info aria-hidden="true" size={18} />
      <p>
        Esta es una estimación inicial. La disponibilidad, la fecha y las condiciones finales
        deben ser confirmadas directamente con Rancho Flor María.
      </p>
    </div>
  )
}

function TextList({ items }) {
  if (!items?.length) return null
  return (
    <ul className="public-commercial-list">
      {items.map((item, index) => (
        <li key={item.titulo ?? item ?? index}>
          <Check aria-hidden="true" size={16} />
          {typeof item === 'string' ? (
            <span>{item}</span>
          ) : (
            <span>
              <strong>{item.titulo}</strong>
              {item.detalle ? <small>{item.detalle}</small> : null}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function AlquilerResult({ calculo, whatsapp }) {
  const presentacion = calculo.presentacion ?? {}
  return (
    <div className="public-result-mode public-rental-result">
      <div className="public-result-hero">
        <div>
          <span className="public-result-eyebrow">Solo alquiler</span>
          <h3>Tu espacio, tu forma de organizar</h3>
          <p>Una alternativa para celebrar con tu propio equipo y proveedores.</p>
        </div>
        <div className="result-total">
          <span>Valor estimado</span>
          <strong>{formatCurrency(calculo.total_estimado)}</strong>
        </div>
      </div>

      <div className="public-rental-grid">
        <section>
          <h4>Puede ser ideal si…</h4>
          <TextList items={presentacion.recomendado_para} />
        </section>
        <section>
          <h4>Lo contemplado en esta estimación</h4>
          <TextList items={presentacion.incluidos} />
          <dl className="calculation-list">
            <div><dt>Invitados contemplados</dt><dd>{calculo.invitados_incluidos_alquiler}</dd></div>
            <div><dt>Invitados adicionales</dt><dd>{calculo.invitados_adicionales}</dd></div>
            {calculo.invitados_adicionales > 0 ? (
              <>
                <div><dt>Valor por invitado adicional</dt><dd>{formatCurrency(calculo.costo_invitado_adicional)}</dd></div>
                <div><dt>Subtotal adicional</dt><dd>{formatCurrency(calculo.costo_adicional)}</dd></div>
              </>
            ) : null}
          </dl>
        </section>
      </div>

      <div className="public-result-conditions">
        <h4>Condiciones importantes</h4>
        <TextList items={presentacion.condiciones} />
      </div>
      <WhatsappLink action={whatsapp?.principal} />
    </div>
  )
}

function ServicioCompletoResult({
  calculo,
  onClearPackage,
  onPackageConsult,
  preferenceError,
  selectedPackageId,
  whatsapp,
}) {
  return (
    <div className="public-result-mode public-service-result">
      <div className="public-result-section-heading">
        <span className="public-result-eyebrow">Servicio completo</span>
        <h3>Opciones pensadas para disfrutar el evento</h3>
        <p>
          Revisa todas las alternativas. Elegir un paquete es opcional y solo expresa tu
          preferencia para continuar la conversación.
        </p>
      </div>
      {preferenceError ? <p className="warning-message" role="alert">{preferenceError}</p> : null}
      <PackageSelector
        catalog={calculo}
        onClearSelection={onClearPackage}
        onConsult={onPackageConsult}
        selectedId={selectedPackageId}
        whatsappActions={whatsapp?.paquetes}
      />
      <div className="public-general-help">
        <p>¿Todavía estás comparando? Podemos orientarte según tu evento y prioridades.</p>
        <WhatsappLink action={whatsapp?.principal} />
      </div>
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
  const presentacionAlquiler = alquiler.presentacion ?? {}
  return (
    <div className="public-result-mode">
      <div className="public-result-section-heading">
        <span className="public-result-eyebrow">Comparación breve</span>
        <h3>Dos caminos posibles para tu evento</h3>
        <p>Puedes conversar con nosotros sobre cualquiera de las dos opciones sin decidir ahora.</p>
      </div>
      <div className="comparison-public-grid comparison-public-grid--wide">
        <article className="comparison-public-card">
          <div className="comparison-public-card__heading">
            <span aria-hidden="true"><Building2 size={20} /></span>
            <div>
              <small>Más libertad para organizar</small>
              <h4>Solo alquiler</h4>
            </div>
          </div>
          <p>Para quienes ya cuentan con proveedores o desean gestionar el evento por su cuenta.</p>
          <div className="comparison-public-card__total">
            <small>Estimación según tus invitados</small>
            <strong>{formatCurrency(alquiler.total_estimado)}</strong>
          </div>
          <TextList items={presentacionAlquiler.incluidos} />
          <p className="comparison-public-card__notice">
            Disponibilidad y fecha sujetas a confirmación.
          </p>
          <WhatsappLink action={whatsapp?.alternativas?.alquiler} />
        </article>

        <article className="comparison-public-card">
          <div className="comparison-public-card__heading">
            <span aria-hidden="true"><Sparkles size={20} /></span>
            <div>
              <small>Una propuesta integral</small>
              <h4>Servicio completo</h4>
            </div>
          </div>
          {(servicio.incluidos_en_todos ?? []).length ? (
            <div>
              <h5>Beneficios comunes</h5>
              <TextList items={servicio.incluidos_en_todos.slice(0, 4)} />
            </div>
          ) : null}
          <div className="comparison-category-list">
            {(servicio.categorias ?? []).map((categoria) => (
              <article key={categoria.categoria}>
                <div>
                  <strong>{categoria.categoria_display}</strong>
                  <small>{categoria.resumen}</small>
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
          <WhatsappLink action={whatsapp?.alternativas?.servicio_completo} />
        </article>
      </div>
    </div>
  )
}

export function PreCotizacionResult({
  headingRef,
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
            <p>Estamos consultando los valores y condiciones vigentes del negocio.</p>
          </div>
        ) : isStale ? (
          <div className="public-result-stale" role="status">
            <RefreshCw aria-hidden="true" size={25} />
            <div>
              <h2 id="public-result-title" ref={headingRef} tabIndex="-1">
                Tus opciones necesitan actualizarse
              </h2>
              <p>
                Cambiaste información del evento. Confirma nuevamente para evitar mostrar
                valores anteriores como vigentes.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="public-result-card__heading">
              <div>
                <span className="public-result-eyebrow">
                  <CheckCircle2 aria-hidden="true" size={16} /> Solicitud registrada #{result.cotizacion.id}
                </span>
                <h2 id="public-result-title" ref={headingRef} tabIndex="-1">
                  Estas son tus opciones
                </h2>
                <p>Úsalas como referencia inicial y continúa la conversación por WhatsApp.</p>
              </div>
              <UsersRound aria-hidden="true" size={34} />
            </header>
            <ResultMeta cotizacion={result.cotizacion} />
            {result.calculo.tipo_servicio === 'alquiler' ? (
              <AlquilerResult calculo={result.calculo} whatsapp={result.whatsapp} />
            ) : result.calculo.tipo_servicio === 'servicio_completo' ? (
              <ServicioCompletoResult
                calculo={result.calculo}
                onClearPackage={onClearPackage}
                onPackageConsult={onPackageConsult}
                preferenceError={preferenceError}
                selectedPackageId={selectedPackageId}
                whatsapp={result.whatsapp}
              />
            ) : (
              <NoEstoySeguroResult calculo={result.calculo} whatsapp={result.whatsapp} />
            )}
            <EstimateNotice />
          </>
        )}
      </Card>
    </section>
  )
}
