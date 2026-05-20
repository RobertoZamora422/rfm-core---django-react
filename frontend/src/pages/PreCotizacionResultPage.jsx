import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Building2, HelpCircle, MessageCircle, Sparkles } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import {
  buildWhatsappUrl,
  getPreCotizacionResult,
  obtenerConfiguracionPublica,
} from '../services/preCotizacionService'
import { formatCurrency, formatDate } from '../utils/formatters'

const serviceLabels = {
  alquiler: 'Alquiler del local',
  servicio_completo: 'Servicio completo',
  no_seguro: 'Aun no estoy seguro',
}

function getResultFromRoute(location) {
  return location.state?.result ?? getPreCotizacionResult()
}

function SummaryList({ cotizacion }) {
  const items = [
    ['Nombre', cotizacion.cliente_nombre],
    ['Telefono', cotizacion.cliente_telefono],
    ['Tipo de evento', cotizacion.tipo_evento_nombre],
    ['Fecha tentativa', formatDate(cotizacion.fecha_tentativa)],
    ['Numero de invitados', cotizacion.numero_invitados],
  ]

  return (
    <dl className="result-summary">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || '-'}</dd>
        </div>
      ))}
    </dl>
  )
}

function WhatsAppAction({ isConfigLoading, message, whatsappNumeroUrl }) {
  if (isConfigLoading) {
    return <p className="muted-text">Cargando configuracion de WhatsApp...</p>
  }

  const url = buildWhatsappUrl(message, whatsappNumeroUrl)

  if (!url) {
    return (
      <p className="warning-message">
        El WhatsApp del negocio no esta configurado. Un administrador puede actualizarlo en
        Configuracion.
      </p>
    )
  }

  return (
    <a className="button button--primary whatsapp-link" href={url} rel="noreferrer" target="_blank">
      <MessageCircle aria-hidden="true" size={18} />
      <span>Continuar por WhatsApp</span>
    </a>
  )
}

function buildBaseMessage(cotizacion, serviceLabel, nombreNegocio) {
  const negocio = nombreNegocio || 'el negocio'

  return [
    `Hola, vengo de la pre-cotizacion web de ${negocio}.`,
    'Me gustaria recibir mas informacion.',
    `Nombre: ${cotizacion.cliente_nombre}`,
    `Evento: ${cotizacion.tipo_evento_nombre}`,
    `Fecha tentativa: ${formatDate(cotizacion.fecha_tentativa)}`,
    `Invitados: ${cotizacion.numero_invitados}`,
    serviceLabel ? `Servicio de interes: ${serviceLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function AlquilerResult({ calculo, configuracion, cotizacion }) {
  const message = buildBaseMessage(
    cotizacion,
    serviceLabels.alquiler,
    configuracion?.nombre_negocio,
  )

  return (
    <div className="result-layout">
      <Card className="public-card">
        <div className="result-heading">
          <Building2 aria-hidden="true" size={24} />
          <div>
            <span className="app-kicker">Resultado referencial</span>
            <h1>Alquiler del local</h1>
          </div>
        </div>
        <SummaryList cotizacion={cotizacion} />
      </Card>

      <Card className="public-card">
        <div className="result-total">
          <span>Total referencial</span>
          <strong>{formatCurrency(calculo.total_estimado)}</strong>
        </div>
        <dl className="calculation-list">
          <div>
            <dt>Tarifa base del alquiler</dt>
            <dd>{formatCurrency(calculo.tarifa_base_alquiler)}</dd>
          </div>
          <div>
            <dt>Invitados incluidos</dt>
            <dd>{calculo.invitados_incluidos_alquiler}</dd>
          </div>
          <div>
            <dt>Costo por invitado adicional</dt>
            <dd>{formatCurrency(calculo.costo_invitado_adicional)}</dd>
          </div>
          <div>
            <dt>Invitados adicionales</dt>
            <dd>{calculo.invitados_adicionales}</dd>
          </div>
        </dl>
        <p className="notice-message">
          Este valor es una referencia inicial. La cotizacion final puede variar segun
          disponibilidad, detalles del evento y servicios acordados.
        </p>
        <div className="result-actions">
          <WhatsAppAction
            isConfigLoading={configuracion === null}
            message={message}
            whatsappNumeroUrl={configuracion?.whatsapp_numero_url}
          />
          <Link className="button button--secondary" to="/pre-cotizacion">
            Comparar con servicio completo
          </Link>
        </div>
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
      <span>
        <strong>{paquete.nombre}</strong>
        <small>{paquete.descripcion || 'Paquete activo disponible.'}</small>
      </span>
      <span className="package-option__price">
        <small>Precio por persona</small>
        <strong>{formatCurrency(paquete.precio_por_persona)}</strong>
      </span>
      <span className="package-option__total">
        <small>Total referencial</small>
        <strong>{formatCurrency(paquete.total_estimado)}</strong>
      </span>
    </label>
  )
}

function ServicioCompletoResult({ calculo, configuracion, cotizacion }) {
  const paquetes = calculo.paquetes ?? []
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const selectedPackage = paquetes.find((paquete) => String(paquete.id) === selectedPackageId)
  const message = [
    buildBaseMessage(
      cotizacion,
      serviceLabels.servicio_completo,
      configuracion?.nombre_negocio,
    ),
    `Paquete de interes: ${selectedPackage?.nombre ?? 'Por definir'}`,
    `Valor referencial mostrado: ${formatCurrency(
      selectedPackage?.total_estimado ?? calculo.total_estimado,
    )}`,
  ].join('\n')

  return (
    <div className="result-layout">
      <Card className="public-card">
        <div className="result-heading">
          <Sparkles aria-hidden="true" size={24} />
          <div>
            <span className="app-kicker">Resultado referencial</span>
            <h1>Servicio completo</h1>
          </div>
        </div>
        <SummaryList cotizacion={cotizacion} />
      </Card>

      <Card className="public-card">
        <div className="detail-section">
          <div>
            <h2>Paquetes activos disponibles</h2>
            <p className="muted-text">
              Cada total referencial se calcula desde backend con precio por persona por numero
              de invitados.
            </p>
          </div>
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
        </div>
        <p className="notice-message">
          Este valor es una referencia inicial. La cotizacion final puede variar segun
          disponibilidad, detalles del evento y servicios acordados.
        </p>
        <div className="result-actions">
          <WhatsAppAction
            isConfigLoading={configuracion === null}
            message={message}
            whatsappNumeroUrl={configuracion?.whatsapp_numero_url}
          />
        </div>
      </Card>
    </div>
  )
}

function ComparacionResult({ calculo, configuracion, cotizacion }) {
  const alquiler = calculo.alquiler
  const servicioCompleto = calculo.servicio_completo
  const paquetes = servicioCompleto?.paquetes ?? []
  const message = buildBaseMessage(cotizacion, null, configuracion?.nombre_negocio)

  return (
    <div className="result-layout">
      <Card className="public-card">
        <div className="result-heading">
          <HelpCircle aria-hidden="true" size={24} />
          <div>
            <span className="app-kicker">Comparacion referencial</span>
            <h1>Elige con mas contexto</h1>
          </div>
        </div>
        <SummaryList cotizacion={cotizacion} />
      </Card>

      <Card className="public-card">
        <div className="comparison-public-grid">
          <article className="comparison-public-card">
            <div>
              <Building2 aria-hidden="true" size={22} />
              <h2>Alquiler del local</h2>
            </div>
            <strong>{formatCurrency(alquiler.total_estimado)}</strong>
            <p>
              Modalidad orientada a usar el espacio y coordinar aparte los servicios
              adicionales que el evento necesite.
            </p>
          </article>
          <article className="comparison-public-card">
            <div>
              <Sparkles aria-hidden="true" size={22} />
              <h2>Servicio completo</h2>
            </div>
            <div className="comparison-package-list">
              {paquetes.map((paquete) => (
                <span key={paquete.id}>
                  {paquete.nombre}: {formatCurrency(paquete.total_estimado)}
                </span>
              ))}
            </div>
            <p>
              Modalidad pensada para revisar paquetes activos con valor por persona y
              acompanamiento mas completo del evento.
            </p>
          </article>
        </div>
        <p className="notice-message">
          La cotizacion final puede variar segun disponibilidad, detalles del evento y
          servicios acordados.
        </p>
        <div className="result-actions">
          <WhatsAppAction
            isConfigLoading={configuracion === null}
            message={message}
            whatsappNumeroUrl={configuracion?.whatsapp_numero_url}
          />
        </div>
      </Card>
    </div>
  )
}

export function PreCotizacionResultPage({ mode }) {
  const location = useLocation()
  const result = useMemo(() => getResultFromRoute(location), [location])
  const [configuracion, setConfiguracion] = useState(null)
  const cotizacion = result?.cotizacion
  const calculo = result?.calculo

  useEffect(() => {
    let isMounted = true

    obtenerConfiguracionPublica()
      .then((data) => {
        if (isMounted) {
          setConfiguracion(data)
        }
      })
      .catch(() => {
        if (isMounted) {
          setConfiguracion({})
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (!cotizacion || !calculo) {
    return (
      <Card className="public-card">
        <EmptyState
          action={
            <Link className="button button--primary" to="/pre-cotizacion">
              <ArrowLeft aria-hidden="true" size={18} />
              <span>Completar pre-cotizacion</span>
            </Link>
          }
          description="Primero completa el formulario publico para generar una referencia desde backend."
          title="No hay resultado disponible"
        />
      </Card>
    )
  }

  const alquilerCalculo = calculo.tipo_servicio === 'no_seguro' ? calculo.alquiler : calculo
  const servicioCalculo =
    calculo.tipo_servicio === 'no_seguro' ? calculo.servicio_completo : calculo

  if (mode === 'alquiler') {
    return (
      <AlquilerResult
        calculo={alquilerCalculo}
        configuracion={configuracion}
        cotizacion={cotizacion}
      />
    )
  }

  if (mode === 'servicio_completo') {
    return (
      <ServicioCompletoResult
        calculo={servicioCalculo}
        configuracion={configuracion}
        cotizacion={cotizacion}
      />
    )
  }

  if (!calculo.alquiler || !calculo.servicio_completo) {
    return (
      <Card className="public-card">
        <EmptyState
          action={
            <Link className="button button--primary" to="/pre-cotizacion">
              <ArrowLeft aria-hidden="true" size={18} />
              <span>Comparar modalidades</span>
            </Link>
          }
          description="Para ver la comparacion, elige Aun no estoy seguro en el formulario publico."
          title="Comparacion no disponible"
        />
      </Card>
    )
  }

  return (
    <ComparacionResult
      calculo={calculo}
      configuracion={configuracion}
      cotizacion={cotizacion}
    />
  )
}
