import { useState } from 'react'
import {
  Building2,
  CalendarDays,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Info,
  MessageCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { buildWhatsappUrl } from '../../services/preCotizacionService'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { LoadingState } from '../ui/LoadingState'

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

function EstimateNotice() {
  return (
    <div className="public-info-box public-info-box--result">
      <Info aria-hidden="true" size={18} />
      <p>
        Este valor es una estimación inicial y puede variar según la disponibilidad, los
        servicios seleccionados y los requerimientos específicos del evento. La fecha debe ser
        confirmada por Rancho Flor María.
      </p>
    </div>
  )
}

function EmptySummary({ configError, isConfigLoading }) {
  return (
    <>
      <div className="public-summary-empty">
        <span className="public-summary-illustration" aria-hidden="true">
          <CalendarDays size={62} strokeWidth={1.35} />
          <Calculator size={34} strokeWidth={1.55} />
        </span>
        {isConfigLoading ? (
          <LoadingState label="Cargando configuración del negocio" />
        ) : configError ? (
          <p>No fue posible obtener la configuración del negocio en este momento.</p>
        ) : (
          <p>Completa los datos del evento para visualizar aquí el valor estimado.</p>
        )}
      </div>

      <div className="public-summary-checklist">
        <p>Cuando calcules verás aquí:</p>
        <ul>
          <li>
            <CheckCircle2 aria-hidden="true" size={16} />
            <span>Detalles del evento</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" size={16} />
            <span>Desglose disponible</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" size={16} />
            <span>Servicios o paquetes incluidos</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" size={16} />
            <span>Valor estimado total</span>
          </li>
        </ul>
      </div>

      <EstimateNotice />
    </>
  )
}

function ResultMeta({ cotizacion }) {
  const items = [
    ['Evento', cotizacion.tipo_evento_nombre],
    [
      'Fecha',
      hasValue(cotizacion.fecha_tentativa) ? formatDate(cotizacion.fecha_tentativa) : null,
    ],
    ['Invitados', cotizacion.numero_invitados],
    ['Modalidad', serviceLabels[cotizacion.tipo_servicio]],
  ].filter(([, value]) => hasValue(value))

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

function ValueHighlight({ label = 'Valor estimado', value }) {
  return (
    <div className="result-total">
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  )
}

function AlquilerBreakdown({ calculo }) {
  return (
    <div className="public-result-mode">
      <ValueHighlight value={calculo.total_estimado} />
      <CalculationList
        items={[
          ['Tarifa base', formatCurrencyIfPresent(calculo.tarifa_base_alquiler)],
          ['Invitados incluidos', calculo.invitados_incluidos_alquiler],
          ['Invitados adicionales', calculo.invitados_adicionales],
          [
            'Costo por invitado adicional',
            formatCurrencyIfPresent(calculo.costo_invitado_adicional),
          ],
          ['Subtotal adicional', formatCurrencyIfPresent(calculo.costo_adicional)],
        ]}
      />
    </div>
  )
}

function ServicePackageOption({ isSelected, onSelect, paquete }) {
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
        <small>Por persona</small>
        <strong>{formatCurrency(paquete.precio_por_persona)}</strong>
      </span>
      <span className="package-option__total">
        <small>Valor estimado</small>
        <strong>{formatCurrency(paquete.total_estimado)}</strong>
      </span>
    </label>
  )
}

function ServicioCompletoBreakdown({ calculo, onPackageSelect, selectedPackageId }) {
  const paquetes = calculo.paquetes ?? []
  const selectedPackage = paquetes.find((paquete) => String(paquete.id) === selectedPackageId)
  const displayedTotal =
    selectedPackage?.total_estimado ?? calculo.total_estimado_minimo ?? calculo.total_estimado

  return (
    <div className="public-result-mode">
      <ValueHighlight
        label={selectedPackage ? 'Valor estimado' : 'Valor estimado desde'}
        value={displayedTotal}
      />
      <div className="public-result-section-heading">
        <h3>Paquetes activos disponibles</h3>
        <p>Selecciona uno para incluirlo en tu consulta por WhatsApp.</p>
      </div>
      {paquetes.length ? (
        <div className="package-options">
          {paquetes.map((paquete) => (
            <ServicePackageOption
              isSelected={String(paquete.id) === selectedPackageId}
              key={paquete.id}
              onSelect={onPackageSelect}
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
  )
}

function ComparisonBreakdown({ calculo }) {
  const alquiler = calculo.alquiler
  const servicioCompleto = calculo.servicio_completo
  const paquetes = servicioCompleto?.paquetes ?? []

  return (
    <div className="comparison-public-grid">
      <article className="comparison-public-card">
        <div className="comparison-public-card__heading">
          <span aria-hidden="true">
            <Building2 size={19} />
          </span>
          <h3>Alquiler del local</h3>
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
            <Sparkles size={19} />
          </span>
          <h3>Servicio completo</h3>
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
  )
}

function buildBaseMessage(cotizacion, nombreNegocio) {
  return [
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
    serviceLabels[cotizacion.tipo_servicio]
      ? `Modalidad de interés: ${serviceLabels[cotizacion.tipo_servicio]}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildResultMessage(result, nombreNegocio, selectedPackage) {
  const { calculo, cotizacion } = result
  const lines = [buildBaseMessage(cotizacion, nombreNegocio)]

  if (calculo.tipo_servicio === 'alquiler') {
    lines.push(
      hasValue(calculo.total_estimado)
        ? `Valor estimado: ${formatCurrency(calculo.total_estimado)}`
        : null,
    )
  }

  if (calculo.tipo_servicio === 'servicio_completo') {
    lines.push(
      selectedPackage?.nombre ? `Paquete de interés: ${selectedPackage.nombre}` : null,
      hasValue(selectedPackage?.total_estimado ?? calculo.total_estimado_minimo)
        ? `Valor estimado: ${formatCurrency(
            selectedPackage?.total_estimado ?? calculo.total_estimado_minimo,
          )}`
        : null,
    )
  }

  if (calculo.tipo_servicio === 'no_seguro') {
    lines.push(
      hasValue(calculo.alquiler?.total_estimado)
        ? `Alquiler del local: ${formatCurrency(calculo.alquiler.total_estimado)}`
        : null,
      ...(calculo.servicio_completo?.paquetes ?? []).map((paquete) =>
        hasValue(paquete.total_estimado)
          ? `${paquete.nombre}: ${formatCurrency(paquete.total_estimado)}`
          : null,
      ),
    )
  }

  return lines.filter(Boolean).join('\n')
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
      <span>Consultar por WhatsApp</span>
    </a>
  )
}

function ResultContent({ calculo, onPackageSelect, selectedPackageId }) {
  if (calculo.tipo_servicio === 'alquiler') {
    return <AlquilerBreakdown calculo={calculo} />
  }

  if (calculo.tipo_servicio === 'servicio_completo') {
    return (
      <ServicioCompletoBreakdown
        calculo={calculo}
        onPackageSelect={onPackageSelect}
        selectedPackageId={selectedPackageId}
      />
    )
  }

  return <ComparisonBreakdown calculo={calculo} />
}

export function PreCotizacionSummary({
  configuracion,
  configError,
  headingRef,
  isConfigLoading,
  isSubmitting,
  onReset,
  result,
}) {
  const [packageSelection, setPackageSelection] = useState({
    packageId: '',
    resultId: null,
  })

  const paquetes = result?.calculo?.paquetes ?? []
  const resultId = result?.cotizacion?.id ?? null
  const selectedPackageId =
    packageSelection.resultId === resultId ? packageSelection.packageId : ''
  const selectedPackage = paquetes.find(
    (paquete) => String(paquete.id) === selectedPackageId,
  )
  const message = result
    ? buildResultMessage(result, configuracion?.nombre_negocio, selectedPackage)
    : ''

  return (
    <aside className="public-summary-column" aria-label="Estimación de tu evento">
      <Card className="public-summary-card" aria-busy={isSubmitting}>
        <div className="public-summary-card__heading">
          <span className="public-card-heading__icon" aria-hidden="true">
            <ClipboardList size={21} />
          </span>
          <h2 className="public-summary-card__title" ref={headingRef} tabIndex="-1">
            {result ? 'Resultado generado' : 'Tu estimación'}
          </h2>
        </div>

        <div className="public-summary-card__body" aria-live="polite">
          {isSubmitting ? (
            <div className="public-summary-calculating">
              <LoadingState label="Calculando tu pre-cotización" />
              <p>Estamos consultando los valores activos del negocio.</p>
            </div>
          ) : result ? (
            <div className="public-summary-result">
              <div className="public-result-status">
                <CheckCircle2 aria-hidden="true" size={18} />
                <span>Estimación generada correctamente</span>
              </div>
              <ResultMeta cotizacion={result.cotizacion} />
              <ResultContent
                calculo={result.calculo}
                onPackageSelect={(event) =>
                  setPackageSelection({
                    packageId: event.target.value,
                    resultId,
                  })
                }
                selectedPackageId={selectedPackageId}
              />
              <EstimateNotice />
              <div className="result-actions">
                <WhatsAppAction
                  configError={configError}
                  isConfigLoading={isConfigLoading}
                  message={message}
                  whatsappNumeroUrl={configuracion?.whatsapp_numero_url}
                />
                <Button
                  className="public-restart-link"
                  icon={RefreshCw}
                  onClick={onReset}
                  type="button"
                  variant="secondary"
                >
                  Realizar otra pre-cotización
                </Button>
              </div>
            </div>
          ) : (
            <EmptySummary configError={configError} isConfigLoading={isConfigLoading} />
          )}
        </div>
      </Card>
    </aside>
  )
}
