import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  HelpCircle,
  Info,
  MessageCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import {
  buildWhatsappUrl,
  clearPreCotizacionResult,
  getPreCotizacionResult,
} from '../services/preCotizacionService'
import { formatCurrency, formatDate } from '../utils/formatters'

const serviceLabels = {
  alquiler: 'Alquiler del local',
  servicio_completo: 'Servicio completo',
  no_seguro: 'Comparación de modalidades',
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function formatCurrencyIfPresent(value) {
  return hasValue(value) ? formatCurrency(value) : null
}

function getResultFromRoute(location) {
  return location.state?.result ?? getPreCotizacionResult()
}

function SummaryList({ cotizacion }) {
  const items = [
    ['Nombre', cotizacion.cliente_nombre],
    ['Teléfono', cotizacion.cliente_telefono],
    ['Tipo de evento', cotizacion.tipo_evento_nombre],
    [
      'Fecha tentativa',
      hasValue(cotizacion.fecha_tentativa) ? formatDate(cotizacion.fecha_tentativa) : null,
    ],
    ['Número de invitados', cotizacion.numero_invitados],
  ].filter(([, value]) => hasValue(value))

  return (
    <dl className="result-summary">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function CalculationList({ items }) {
  const visibleItems = items.filter(([, value]) => hasValue(value))

  if (!visibleItems.length) return null

  return (
    <dl className="calculation-list">
      {visibleItems.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ResultHeading({ headingRef, icon: Icon, kicker, title }) {
  return (
    <div className="result-heading">
      <span className="result-heading__icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <div>
        <span className="public-summary-card__eyebrow">{kicker}</span>
        <h1 ref={headingRef} tabIndex="-1">
          {title}
        </h1>
      </div>
    </div>
  )
}

function ResultOverview({ cotizacion, headingRef, icon, kicker, title }) {
  return (
    <Card className="public-card public-result-overview">
      <ResultHeading
        headingRef={headingRef}
        icon={icon}
        kicker={kicker}
        title={title}
      />
      <SummaryList cotizacion={cotizacion} />
    </Card>
  )
}

function EstimateNotice() {
  return (
    <div className="public-info-box public-info-box--result">
      <Info aria-hidden="true" size={18} />
      <p>
        Este valor es una estimación inicial y puede variar según la disponibilidad, los
        servicios seleccionados y los requerimientos específicos del evento. La disponibilidad
        de la fecha debe ser confirmada por Rancho Flor María.
      </p>
    </div>
  )
}

function WhatsAppAction({ configError, isConfigLoading, message, whatsappNumeroUrl }) {
  if (isConfigLoading) {
    return (
      <p className="muted-text" role="status">
        Cargando configuración de WhatsApp…
      </p>
    )
  }

  const url = buildWhatsappUrl(message, whatsappNumeroUrl)

  if (configError || !url) {
    return (
      <p className="warning-message" role="alert">
        El canal de WhatsApp no está disponible en este momento. Inténtalo nuevamente más tarde.
      </p>
    )
  }

  return (
    <a
      className="button whatsapp-link"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <MessageCircle aria-hidden="true" size={18} />
      <span>Continuar por WhatsApp</span>
    </a>
  )
}

function RestartAction() {
  return (
    <Link
      className="button button--secondary public-restart-link"
      onClick={clearPreCotizacionResult}
      to="/pre-cotizacion"
    >
      <RotateCcw aria-hidden="true" size={18} />
      <span>Realizar otra pre-cotización</span>
    </Link>
  )
}

function buildBaseMessage(cotizacion, serviceLabel, nombreNegocio) {
  const lines = [
    `Hola, vengo de la pre-cotización web de ${nombreNegocio || 'Rancho Flor María'}.`,
    'Me gustaría recibir más información.',
    hasValue(cotizacion.cliente_nombre) ? `Nombre: ${cotizacion.cliente_nombre}` : null,
    hasValue(cotizacion.tipo_evento_nombre)
      ? `Evento: ${cotizacion.tipo_evento_nombre}`
      : null,
    hasValue(cotizacion.fecha_tentativa)
      ? `Fecha tentativa: ${formatDate(cotizacion.fecha_tentativa)}`
      : null,
    hasValue(cotizacion.numero_invitados)
      ? `Invitados: ${cotizacion.numero_invitados}`
      : null,
    serviceLabel ? `Modalidad de interés: ${serviceLabel}` : null,
  ]

  return lines.filter(Boolean).join('\n')
}

function ValueHighlight({ label = 'Valor estimado', value }) {
  return (
    <div className="result-total" aria-live="polite">
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  )
}

function ResultActions({ configError, configuracion, isConfigLoading, message }) {
  return (
    <div className="result-actions">
      <WhatsAppAction
        configError={configError}
        isConfigLoading={isConfigLoading}
        message={message}
        whatsappNumeroUrl={configuracion?.whatsapp_numero_url}
      />
      <RestartAction />
    </div>
  )
}

function AlquilerResult({ calculo, configContext, cotizacion, headingRef }) {
  const message = [
    buildBaseMessage(
      cotizacion,
      serviceLabels.alquiler,
      configContext.configuracion?.nombre_negocio,
    ),
    hasValue(calculo.total_estimado)
      ? `Valor estimado: ${formatCurrency(calculo.total_estimado)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="result-layout">
      <ResultOverview
        cotizacion={cotizacion}
        headingRef={headingRef}
        icon={Building2}
        kicker="Resultado de tu solicitud"
        title="Alquiler del local"
      />

      <Card className="public-card public-result-card">
        <ValueHighlight value={calculo.total_estimado} />
        <CalculationList
          items={[
            ['Tarifa base del alquiler', formatCurrencyIfPresent(calculo.tarifa_base_alquiler)],
            ['Invitados incluidos', calculo.invitados_incluidos_alquiler],
            ['Invitados adicionales', calculo.invitados_adicionales],
            [
              'Costo por invitado adicional',
              formatCurrencyIfPresent(calculo.costo_invitado_adicional),
            ],
            [
              'Subtotal por invitados adicionales',
              formatCurrencyIfPresent(calculo.costo_adicional),
            ],
          ]}
        />
        <EstimateNotice />
        <ResultActions message={message} {...configContext} />
      </Card>
    </div>
  )
}

function ServicePackageCard({ isSelected, onSelect, paquete }) {
  return (
    <label className={isSelected ? 'package-option package-option--selected' : 'package-option'}>
      <input
        checked={isSelected}
        name="paquete_interes"
        onChange={onSelect}
        type="radio"
        value={paquete.id}
      />
      <span className="package-option__copy">
        <strong>{paquete.nombre}</strong>
        {paquete.descripcion ? <small>{paquete.descripcion}</small> : null}
      </span>
      <span className="package-option__price">
        <small>Precio por persona</small>
        <strong>{formatCurrency(paquete.precio_por_persona)}</strong>
      </span>
      <span className="package-option__total">
        <small>Valor estimado</small>
        <strong>{formatCurrency(paquete.total_estimado)}</strong>
      </span>
    </label>
  )
}

function ServicioCompletoResult({ calculo, configContext, cotizacion, headingRef }) {
  const paquetes = calculo.paquetes ?? []
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const selectedPackage = paquetes.find((paquete) => String(paquete.id) === selectedPackageId)
  const displayedTotal =
    selectedPackage?.total_estimado ?? calculo.total_estimado_minimo ?? calculo.total_estimado
  const message = [
    buildBaseMessage(
      cotizacion,
      serviceLabels.servicio_completo,
      configContext.configuracion?.nombre_negocio,
    ),
    selectedPackage?.nombre ? `Paquete de interés: ${selectedPackage.nombre}` : null,
    hasValue(displayedTotal) ? `Valor estimado: ${formatCurrency(displayedTotal)}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="result-layout">
      <ResultOverview
        cotizacion={cotizacion}
        headingRef={headingRef}
        icon={Sparkles}
        kicker="Resultado de tu solicitud"
        title="Servicio completo"
      />

      <Card className="public-card public-result-card">
        <ValueHighlight
          label={selectedPackage ? 'Valor estimado' : 'Valor estimado desde'}
          value={displayedTotal}
        />
        <div className="detail-section">
          <div className="public-result-section-heading">
            <h2>Paquetes activos disponibles</h2>
            <p>Selecciona uno para incluirlo en tu consulta por WhatsApp.</p>
          </div>
          {paquetes.length ? (
            <div className="package-options">
              {paquetes.map((paquete) => (
                <ServicePackageCard
                  isSelected={String(paquete.id) === selectedPackageId}
                  key={paquete.id}
                  onSelect={(event) => setSelectedPackageId(event.target.value)}
                  paquete={paquete}
                />
              ))}
            </div>
          ) : (
            <p className="warning-message" role="status">
              No hay paquetes activos disponibles para mostrar.
            </p>
          )}
        </div>
        <EstimateNotice />
        <ResultActions message={message} {...configContext} />
      </Card>
    </div>
  )
}

function ComparacionResult({ calculo, configContext, cotizacion, headingRef }) {
  const alquiler = calculo.alquiler
  const servicioCompleto = calculo.servicio_completo
  const paquetes = servicioCompleto?.paquetes ?? []
  const message = [
    buildBaseMessage(
      cotizacion,
      serviceLabels.no_seguro,
      configContext.configuracion?.nombre_negocio,
    ),
    hasValue(alquiler?.total_estimado)
      ? `Alquiler del local: ${formatCurrency(alquiler.total_estimado)}`
      : null,
    ...paquetes.map((paquete) =>
      hasValue(paquete.total_estimado)
        ? `${paquete.nombre}: ${formatCurrency(paquete.total_estimado)}`
        : null,
    ),
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="result-layout">
      <ResultOverview
        cotizacion={cotizacion}
        headingRef={headingRef}
        icon={HelpCircle}
        kicker="Comparación de modalidades"
        title="Conoce tus alternativas"
      />

      <Card className="public-card public-result-card">
        <div className="comparison-public-grid" aria-live="polite">
          <article className="comparison-public-card">
            <div className="comparison-public-card__heading">
              <span aria-hidden="true">
                <Building2 size={20} />
              </span>
              <h2>Alquiler del local</h2>
            </div>
            <div className="comparison-public-card__total">
              <small>Valor estimado</small>
              <strong>{formatCurrency(alquiler.total_estimado)}</strong>
            </div>
            <CalculationList
              items={[
                ['Tarifa base', formatCurrencyIfPresent(alquiler.tarifa_base_alquiler)],
                ['Invitados incluidos', alquiler.invitados_incluidos_alquiler],
                ['Invitados adicionales', alquiler.invitados_adicionales],
                ['Subtotal adicional', formatCurrencyIfPresent(alquiler.costo_adicional)],
              ]}
            />
          </article>

          <article className="comparison-public-card">
            <div className="comparison-public-card__heading">
              <span aria-hidden="true">
                <Sparkles size={20} />
              </span>
              <h2>Servicio completo</h2>
            </div>
            {hasValue(servicioCompleto?.total_estimado_minimo) ? (
              <div className="comparison-public-card__total">
                <small>Valor estimado desde</small>
                <strong>{formatCurrency(servicioCompleto.total_estimado_minimo)}</strong>
              </div>
            ) : null}
            <div className="comparison-package-list">
              {paquetes.map((paquete) => (
                <span key={paquete.id}>
                  <small>{paquete.nombre}</small>
                  <strong>{formatCurrency(paquete.total_estimado)}</strong>
                </span>
              ))}
            </div>
          </article>
        </div>
        <EstimateNotice />
        <ResultActions message={message} {...configContext} />
      </Card>
    </div>
  )
}

function ResultPageFrame({ children }) {
  return (
    <section className="public-precotizacion-page public-result-page">
      <div className="public-result-page__topline">
        <Link className="public-back-link" to="/pre-cotizacion">
          <ArrowLeft aria-hidden="true" size={17} />
          <span>Volver al formulario</span>
        </Link>
        <span>Pre-cotización generada</span>
      </div>
      {children}
    </section>
  )
}

export function PreCotizacionResultPage({ mode }) {
  const location = useLocation()
  const result = useMemo(() => getResultFromRoute(location), [location])
  const headingRef = useRef(null)
  const outletContext = useOutletContext()
  const cotizacion = result?.cotizacion
  const calculo = result?.calculo

  useEffect(() => {
    if (!cotizacion || !calculo) return undefined

    const animationFrame = window.requestAnimationFrame(() => {
      headingRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [calculo, cotizacion, mode])

  if (!cotizacion || !calculo) {
    return (
      <ResultPageFrame>
        <Card className="public-card public-empty-result-card">
          <EmptyState
            action={
              <Link className="button button--primary" to="/pre-cotizacion">
                <ArrowLeft aria-hidden="true" size={18} />
                <span>Completar pre-cotización</span>
              </Link>
            }
            description="Primero completa el formulario público para generar una estimación con la información activa del negocio."
            title="No hay resultado disponible"
          />
        </Card>
      </ResultPageFrame>
    )
  }

  const alquilerCalculo = calculo.tipo_servicio === 'no_seguro' ? calculo.alquiler : calculo
  const servicioCalculo =
    calculo.tipo_servicio === 'no_seguro' ? calculo.servicio_completo : calculo
  const configContext = {
    configuracion: outletContext.configuracion,
    configError: outletContext.configError,
    isConfigLoading: outletContext.isConfigLoading,
  }

  if (mode === 'alquiler') {
    return (
      <ResultPageFrame>
        <AlquilerResult
          calculo={alquilerCalculo}
          configContext={configContext}
          cotizacion={cotizacion}
          headingRef={headingRef}
        />
      </ResultPageFrame>
    )
  }

  if (mode === 'servicio_completo') {
    return (
      <ResultPageFrame>
        <ServicioCompletoResult
          calculo={servicioCalculo}
          configContext={configContext}
          cotizacion={cotizacion}
          headingRef={headingRef}
        />
      </ResultPageFrame>
    )
  }

  if (!calculo.alquiler || !calculo.servicio_completo) {
    return (
      <ResultPageFrame>
        <Card className="public-card public-empty-result-card">
          <EmptyState
            action={
              <Link className="button button--primary" to="/pre-cotizacion">
                <ArrowLeft aria-hidden="true" size={18} />
                <span>Comparar modalidades</span>
              </Link>
            }
            description="Para ver la comparación, elige Aún no estoy seguro en el formulario público."
            title="Comparación no disponible"
          />
        </Card>
      </ResultPageFrame>
    )
  }

  return (
    <ResultPageFrame>
      <ComparacionResult
        calculo={calculo}
        configContext={configContext}
        cotizacion={cotizacion}
        headingRef={headingRef}
      />
    </ResultPageFrame>
  )
}
