import { ArrowLeft, ClipboardList, FilePlus2, Phone } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { clientesService } from '../../services/resourceService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatCurrency, formatDate, formatPhone } from '../../utils/formatters'

function DetailItem({ label, value }) {
  return <div><dt>{label}</dt><dd>{value || '-'}</dd></div>
}

export function DetalleClientePage() {
  const { id } = useParams()
  const location = useLocation()
  const returnPath = location.state?.from || '/clientes'
  const [person, setPerson] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadPerson = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true)
    try {
      setPerson(await clientesService.retrieve(id))
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(loadPerson, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadPerson])

  useAutoRefresh(loadPerson)

  if (isLoading) {
    return <div className="page-stack page-stack--commercial"><PageHeader title="Detalle de persona" /><Card><LoadingState label="Cargando persona" /></Card></div>
  }

  if (!person) {
    return (
      <div className="page-stack page-stack--commercial">
        <PageHeader title="Detalle de persona" />
        <ErrorMessage action={<Button onClick={() => loadPerson()} variant="secondary">Reintentar</Button>}>{error || 'No se pudo cargar la persona solicitada.'}</ErrorMessage>
        <Link className="button button--secondary detail-link" to={returnPath}><ArrowLeft aria-hidden="true" size={18} /> Volver</Link>
      </div>
    )
  }

  const quotesColumns = [
    { key: 'id', header: 'Cotización', render: (item) => `#${item.id}` },
    { key: 'evento', header: 'Evento', render: (item) => item.tipo_evento },
    { key: 'fecha', header: 'Fecha tentativa', render: (item) => formatDate(item.fecha_tentativa) },
    { key: 'estado', header: 'Estado', render: (item) => <StatusBadge status={item.estado}>{item.estado_display}</StatusBadge> },
    { key: 'total', header: 'Total estimado', align: 'right', render: (item) => formatCurrency(item.total_estimado) },
    { key: 'creado', header: 'Creado', render: (item) => formatDate(item.creado_en) },
    { key: 'accion', header: 'Acceso', render: (item) => <Link className="button button--secondary" to={`/cotizaciones/${item.id}`}>Detalle</Link> },
  ]
  const contractsColumns = [
    { key: 'id', header: 'Contrato', render: (item) => `#${item.id}` },
    { key: 'evento', header: 'Evento', render: (item) => item.tipo_evento },
    { key: 'fecha', header: 'Fecha', render: (item) => formatDate(item.fecha_evento) },
    { key: 'contrato', header: 'Contrato', render: (item) => <StatusBadge status={item.estado_contrato}>{item.estado_contrato_display}</StatusBadge> },
    { key: 'pago', header: 'Pago', render: (item) => <StatusBadge status={item.estado_pago}>{item.estado_pago_display}</StatusBadge> },
    { key: 'valor', header: 'Valor final', align: 'right', render: (item) => formatCurrency(item.valor_final) },
    { key: 'saldo', header: 'Saldo', align: 'right', render: (item) => formatCurrency(item.saldo_pendiente) },
    { key: 'accion', header: 'Acceso', render: (item) => <Link className="button button--secondary" to={`/contratos/${item.id}`}>Detalle</Link> },
  ]

  return (
    <div className="page-stack page-stack--commercial">
      <PageHeader
        actions={
          <>
            <Link className="button button--secondary" to={returnPath}><ArrowLeft aria-hidden="true" size={18} /> Volver</Link>
            <Link className="button button--secondary" to={`/cotizaciones/nueva?cliente=${person.id}`}><ClipboardList aria-hidden="true" size={18} /> Nueva cotización</Link>
            <Link className="button button--primary" to={`/contratos/nuevo?cliente=${person.id}`}><FilePlus2 aria-hidden="true" size={18} /> Nuevo contrato</Link>
          </>
        }
        description="Identidad, origen y relación comercial verificable de esta persona."
        eyebrow="Comercial · Clientes & Interesados"
        title={person.nombre}
      />

      <ErrorMessage>{error}</ErrorMessage>

      <div className="person-detail-grid">
        <Card>
          <div className="detail-section">
            <div className="detail-section__header">
              <h2>Identidad</h2>
              <span className={`person-kind person-kind--${person.clasificacion}`}>{person.clasificacion_display}</span>
            </div>
            <dl className="detail-list">
              <DetailItem label="Nombre principal" value={person.nombre} />
              <DetailItem label="Teléfono" value={<a className="inline-contact" href={`tel:${person.telefono}`}><Phone aria-hidden="true" size={16} /> {formatPhone(person.telefono)}</a>} />
              <DetailItem label="Correo" value={person.correo || 'Sin correo'} />
              <DetailItem label="Origen" value={person.origen_display} />
              <DetailItem label="Creado" value={formatDate(person.creado_en)} />
              <DetailItem label="Actualizado" value={formatDate(person.actualizado_en)} />
            </dl>
          </div>
        </Card>

        <Card>
          <div className="detail-section">
            <div className="detail-section__header"><h2>Resumen de relación</h2></div>
            <div className="person-relation-summary">
              <div><strong>{person.resumen_relacion.cotizaciones}</strong><span>Cotizaciones</span></div>
              <div><strong>{person.resumen_relacion.contratos}</strong><span>Contratos</span></div>
            </div>
            <dl className="detail-list detail-list--compact">
              <DetailItem label="Primera interacción" value={formatDate(person.resumen_relacion.primera_interaccion)} />
              <DetailItem label="Interacción reciente" value={formatDate(person.resumen_relacion.ultima_interaccion)} />
            </dl>
          </div>
        </Card>
      </div>

      <Card>
        <div className="detail-section">
          <div className="detail-section__header"><h2>Nombres utilizados</h2></div>
          <div className="person-names">
            {person.nombres_utilizados.map((name) => (
              <div className="person-name-record" key={`${name.id ?? 'principal'}-${name.nombre}`}>
                <span><strong>{name.nombre}</strong>{name.es_principal ? <em>Principal</em> : null}</span>
                <small>{name.origen_display} · {formatDate(name.creado_en)}</small>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="detail-section">
          <div className="detail-section__header"><h2>Cotizaciones relacionadas</h2></div>
          <DataTable columns={quotesColumns} emptyMessage="Esta persona aún no tiene cotizaciones." mobileTitle={(item) => `Cotización #${item.id}`} rows={person.cotizaciones_relacionadas} />
        </div>
      </Card>

      <Card>
        <div className="detail-section">
          <div className="detail-section__header"><h2>Contratos relacionados</h2></div>
          <DataTable columns={contractsColumns} emptyMessage="Esta persona todavía no tiene contratos y se clasifica como interesada." mobileTitle={(item) => `Contrato #${item.id}`} rows={person.contratos_relacionados} />
        </div>
      </Card>

      <div className="person-detail-grid">
        <Card>
          <div className="detail-section">
            <div className="detail-section__header"><h2>Historial verificable</h2></div>
            <ol className="person-timeline">
              {person.historial.map((event, index) => (
                <li key={`${event.tipo}-${event.fecha}-${index}`}>
                  <span aria-hidden="true" />
                  <div>
                    {event.ruta ? <Link to={event.ruta}><strong>{event.titulo}</strong></Link> : <strong>{event.titulo}</strong>}
                    {event.detalle ? <p>{event.detalle}</p> : null}
                    <time>{formatDate(event.fecha)}</time>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Card>
        <Card>
          <div className="detail-section">
            <div className="detail-section__header"><h2>Observaciones</h2></div>
            <p className="plain-text">{person.observaciones || 'Sin observaciones registradas.'}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
