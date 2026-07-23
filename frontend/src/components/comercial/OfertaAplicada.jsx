import { formatCurrency } from '../../utils/formatters'

const ITEM_TITLES = {
  principal: 'Beneficios principales',
  detalle: 'Detalles adicionales',
  condicion: 'Condiciones',
}

function BenefitGroup({ items, type }) {
  const visible = items.filter((item) => item.tipo === type)
  if (!visible.length) return null

  return (
    <section className="offer-snapshot__group">
      <h4>{ITEM_TITLES[type]}</h4>
      <ul>
        {visible.map((item, index) => (
          <li key={item.id ?? `${type}-${index}`}>
            <strong>{item.titulo}</strong>
            {item.detalle ? <span>{item.detalle}</span> : null}
            {item.minimo_invitados ? (
              <small>Aplica desde {item.minimo_invitados} invitados.</small>
            ) : null}
            {item.maximo_invitados ? (
              <small>Aplica hasta {item.maximo_invitados} invitados.</small>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function OfertaAplicada({ record }) {
  const snapshot = record?.oferta_snapshot ?? {}
  const paquete = snapshot.paquete ?? {}
  const alquiler = snapshot.alquiler ?? {}
  const beneficios = paquete.beneficios ?? []
  const comunes = paquete.incluidos_en_todos ?? []

  if (!Object.keys(snapshot).length) {
    return <p className="muted-text">No existe una instantánea histórica para este registro.</p>
  }

  return (
    <div className="offer-snapshot">
      {record.oferta_requiere_revision ? (
        <div className="warning-message" role="status">
          Esta oferta histórica necesita revisión porque los datos anteriores no permiten
          determinar todos sus términos sin inventarlos.
        </div>
      ) : null}

      {snapshot.tipo_servicio === 'alquiler' ? (
        <dl className="detail-list">
          <div><dt>Oferta</dt><dd>Alquiler del local</dd></div>
          <div><dt>Tarifa base aplicada</dt><dd>{alquiler.parametros_disponibles ? formatCurrency(alquiler.tarifa_base) : 'No disponible históricamente'}</dd></div>
          <div><dt>Invitados incluidos</dt><dd>{alquiler.parametros_disponibles ? alquiler.invitados_incluidos : 'No disponible históricamente'}</dd></div>
          <div><dt>Costo por invitado adicional</dt><dd>{alquiler.parametros_disponibles ? formatCurrency(alquiler.costo_invitado_adicional) : 'No disponible históricamente'}</dd></div>
        </dl>
      ) : (
        <>
          <div className="offer-snapshot__summary">
            <div>
              <span>Paquete aplicado</span>
              <strong>{paquete.nombre || record.paquete_nombre}</strong>
            </div>
            <div>
              <span>Precio por persona</span>
              <strong>{paquete.precio_por_persona ? formatCurrency(paquete.precio_por_persona) : 'No disponible'}</strong>
            </div>
          </div>
          {comunes.length ? (
            <section className="offer-snapshot__group offer-snapshot__group--common">
              <h4>Incluido en todos los paquetes</h4>
              <ul>
                {comunes.map((item, index) => (
                  <li key={item.id ?? `comun-${index}`}>
                    <strong>{item.titulo}</strong>
                    {item.detalle ? <span>{item.detalle}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {['principal', 'detalle', 'condicion'].map((type) => (
            <BenefitGroup items={beneficios} key={type} type={type} />
          ))}
        </>
      )}
    </div>
  )
}
