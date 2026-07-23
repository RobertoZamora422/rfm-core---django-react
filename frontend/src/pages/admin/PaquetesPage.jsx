import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import { ResourcePage } from '../../components/admin/ResourcePage'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Textarea } from '../../components/ui/Textarea'
import {
  beneficiosPaquetesService,
  paquetesService,
} from '../../services/resourceService'
import { formatCurrency } from '../../utils/formatters'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { useFocusFirstError } from '../../hooks/useFocusFirstError'

const CATEGORY_LABELS = {
  estandar: 'Estándar',
  premium: 'Premium',
  vip: 'VIP',
}

const BENEFIT_TYPES = [
  { value: 'principal', label: 'Beneficio principal' },
  { value: 'detalle', label: 'Detalle adicional' },
  { value: 'condicion', label: 'Condición' },
]

function emptyBenefit(type = 'principal') {
  return {
    tipo: type,
    titulo: '',
    detalle: '',
    minimo_invitados: '',
    maximo_invitados: '',
    activo: true,
  }
}

function normalizeBenefits(items) {
  return items.map((item, index) => ({
    ...(item.id ? { id: item.id } : {}),
    tipo: item.tipo,
    titulo: item.titulo.trim(),
    detalle: item.detalle.trim(),
    orden: index + 1,
    minimo_invitados: item.minimo_invitados ? Number(item.minimo_invitados) : null,
    maximo_invitados: item.maximo_invitados ? Number(item.maximo_invitados) : null,
    activo: item.activo ?? true,
  }))
}

function BenefitsEditor({ items, onChange }) {
  const updateItem = (index, field, value) => {
    onChange(items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )))
  }

  const moveItem = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= items.length) return
    const next = [...items]
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    onChange(next)
  }

  return (
    <div className="benefit-editor">
      {items.map((item, index) => (
        <fieldset className="benefit-editor__item" key={item.id ?? `nuevo-${index}`}>
          <legend>Ítem {index + 1}</legend>
          <div className="benefit-editor__toolbar">
            <Button aria-label="Subir ítem" disabled={index === 0} icon={ArrowUp} onClick={() => moveItem(index, -1)} type="button" variant="ghost" />
            <Button aria-label="Bajar ítem" disabled={index === items.length - 1} icon={ArrowDown} onClick={() => moveItem(index, 1)} type="button" variant="ghost" />
            <Button aria-label="Eliminar ítem" icon={Trash2} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} type="button" variant="ghost" />
          </div>
          <div className="form-grid">
            <Select label="Tipo de ítem" name={`beneficio-tipo-${index}`} onChange={(event) => updateItem(index, 'tipo', event.target.value)} value={item.tipo}>
              {BENEFIT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </Select>
            <Input label="Título" name={`beneficio-titulo-${index}`} onChange={(event) => updateItem(index, 'titulo', event.target.value)} required value={item.titulo} />
          </div>
          <Textarea label="Detalle" name={`beneficio-detalle-${index}`} onChange={(event) => updateItem(index, 'detalle', event.target.value)} value={item.detalle} />
          {item.tipo === 'condicion' ? (
            <div className="form-grid">
              <Input label="Desde invitados" min="1" name={`beneficio-min-${index}`} onChange={(event) => updateItem(index, 'minimo_invitados', event.target.value)} type="number" value={item.minimo_invitados ?? ''} />
              <Input label="Hasta invitados (opcional)" min="1" name={`beneficio-max-${index}`} onChange={(event) => updateItem(index, 'maximo_invitados', event.target.value)} type="number" value={item.maximo_invitados ?? ''} />
            </div>
          ) : null}
        </fieldset>
      ))}
      <Button icon={Plus} onClick={() => onChange([...items, emptyBenefit()])} type="button" variant="secondary">
        Añadir ítem
      </Button>
    </div>
  )
}

const columns = [
  {
    key: 'nombre',
    header: 'Paquete',
    render: (item) => (
      <div className="stacked-cell">
        <strong>{item.nombre}</strong>
        <span className="line-clamp">{item.resumen_corto || 'Sin resumen comercial'}</span>
      </div>
    ),
  },
  {
    key: 'categoria',
    header: 'Categoría',
    render: (item) => (
      <div className="stacked-cell">
        <strong>{CATEGORY_LABELS[item.categoria] ?? item.categoria}</strong>
        <span>Orden {item.orden}</span>
      </div>
    ),
  },
  {
    key: 'precio_por_persona',
    header: 'Precio por persona',
    render: (item) => formatCurrency(item.precio_por_persona),
    align: 'right',
  },
  {
    key: 'beneficios',
    header: 'Contenido',
    render: (item) => `${item.beneficios?.length ?? 0} ítems`,
  },
  {
    key: 'activo',
    header: 'Estado',
    render: (item) => (
      <StatusBadge status={item.activo ? 'activo' : 'inactivo'}>
        {item.activo ? 'Activo' : 'Inactivo'}
      </StatusBadge>
    ),
  },
]

function PaqueteForm({ errors, initialValues, isSubmitting, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    nombre: initialValues?.nombre ?? '',
    categoria: initialValues?.categoria ?? 'estandar',
    orden: initialValues?.orden ?? 1,
    precio_por_persona: initialValues?.precio_por_persona ?? '',
    resumen_corto: initialValues?.resumen_corto ?? '',
    etiqueta_comercial: initialValues?.etiqueta_comercial ?? '',
    destacado: initialValues?.destacado ?? false,
    beneficios: initialValues?.beneficios ?? [emptyBenefit()],
  })
  useFocusFirstError(errors)

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      ...form,
      orden: Number(form.orden),
      beneficios: normalizeBenefits(form.beneficios),
    })
  }

  return (
    <form className="resource-form resource-form--wide" onSubmit={handleSubmit}>
      <div className="form-grid">
        <Input autoFocus error={errors.nombre} id="paquete-nombre" label="Nombre" name="nombre" onChange={handleChange} required value={form.nombre} />
        <Select error={errors.categoria} id="paquete-categoria" label="Categoría" name="categoria" onChange={handleChange} value={form.categoria}>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Input error={errors.orden} id="paquete-orden" label="Orden en la categoría" min="0" name="orden" onChange={handleChange} required type="number" value={form.orden} />
        <Input error={errors.precio_por_persona} id="paquete-precio" inputMode="decimal" label="Precio por persona (USD)" min="0.01" name="precio_por_persona" onChange={handleChange} required step="0.01" type="number" value={form.precio_por_persona} />
      </div>
      <Input error={errors.resumen_corto} id="paquete-resumen" label="Resumen corto" maxLength="240" name="resumen_corto" onChange={handleChange} required value={form.resumen_corto} />
      <Input error={errors.etiqueta_comercial} id="paquete-etiqueta" label="Etiqueta comercial" name="etiqueta_comercial" onChange={handleChange} placeholder="Ej. Más elegido" value={form.etiqueta_comercial} />
      <label className="checkbox-field" htmlFor="paquete-destacado">
        <input checked={form.destacado} id="paquete-destacado" name="destacado" onChange={handleChange} type="checkbox" />
        <span><strong>Paquete destacado</strong><small>Se resaltará visualmente sin depender solo del color.</small></span>
      </label>
      <div className="form-section">
        <div className="form-section__heading">
          <h3>Beneficios y condiciones</h3>
          <p>Ordena los beneficios principales, detalles y reglas por invitados.</p>
        </div>
        <BenefitsEditor items={form.beneficios} onChange={(beneficios) => setForm((current) => ({ ...current, beneficios }))} />
      </div>
      <div className="notice-message">
        Los elementos incluidos en todos los paquetes se administran en el bloque independiente de la página.
      </div>
      <div className="form-actions">
        <Button onClick={onCancel} variant="secondary">Cancelar</Button>
        <Button isLoading={isSubmitting} type="submit">Guardar</Button>
      </div>
    </form>
  )
}

function CommonBenefitsManager() {
  const [items, setItems] = useState([])
  const [deletedIds, setDeletedIds] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true
    beneficiosPaquetesService.list({ alcance: 'comunes' })
      .then((data) => {
        if (active) setItems(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch((loadError) => {
        if (active) setError(getApiErrorMessage(loadError))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  const handleItemsChange = (nextItems) => {
    const nextIds = new Set(nextItems.map((item) => item.id).filter(Boolean))
    const removed = items.filter((item) => item.id && !nextIds.has(item.id)).map((item) => item.id)
    setDeletedIds((current) => [...new Set([...current, ...removed])])
    setItems(nextItems)
    setMessage('')
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await Promise.all(deletedIds.map((id) => beneficiosPaquetesService.remove(id)))
      const saved = []
      for (const item of normalizeBenefits(items)) {
        const payload = { ...item, paquete: null }
        saved.push(
          item.id
            ? await beneficiosPaquetesService.update(item.id, payload)
            : await beneficiosPaquetesService.create(payload),
        )
      }
      setItems(saved)
      setDeletedIds([])
      setMessage('Los elementos comunes se actualizaron una sola vez para todo el catálogo.')
    } catch (saveError) {
      setError(getApiErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="common-benefits-card">
      <div className="common-benefits-card__heading">
        <div>
          <span>Contenido transversal</span>
          <h2>Incluido en todos los paquetes</h2>
          <p>Se administra aquí y se presenta una sola vez en la experiencia pública.</p>
        </div>
        <Button disabled={isLoading} icon={Save} isLoading={isSaving} onClick={handleSave}>Guardar comunes</Button>
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {message ? <div className="success-message" role="status">{message}</div> : null}
      {isLoading ? <p className="muted-text">Cargando elementos comunes…</p> : (
        <BenefitsEditor items={items} onChange={handleItemsChange} />
      )}
    </Card>
  )
}

export function PaquetesPage() {
  return (
    <ResourcePage
      beforeList={<CommonBenefitsManager />}
      columns={columns}
      createLabel="Crear paquete"
      description="Organiza la oferta de servicio completo por categoría, beneficios y condiciones."
      emptyMessage="Crea el primer paquete de servicio completo."
      filterDefinitions={[
        {
          key: 'buscar',
          label: 'Buscar paquete o beneficio',
          placeholder: 'Ej. DJ, premium o decoración',
          type: 'search',
        },
        {
          key: 'categoria',
          label: 'Categoría',
          type: 'select',
          options: [
            { value: '', label: 'Todas las categorías' },
            ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
          ],
        },
        {
          key: 'activo',
          label: 'Disponibilidad',
          type: 'select',
          options: [
            { value: '', label: 'Todos' },
            { value: 'true', label: 'Activos' },
            { value: 'false', label: 'Inactivos' },
          ],
        },
      ]}
      FormComponent={PaqueteForm}
      itemLabel="Paquete"
      mobileTitle={(item) => item.nombre}
      service={paquetesService}
      statusConfig={{
        field: 'activo',
        activateLabel: 'Activar',
        deactivateLabel: 'Desactivar',
        activateTitle: 'Activar paquete',
        deactivateTitle: 'Desactivar paquete',
        activateDescription: 'El paquete volverá a estar disponible para nuevas cotizaciones y contratos.',
        deactivateDescription: 'El paquete dejará de aparecer en nuevos registros. Las instantáneas históricas se conservarán.',
        activatedText: 'activado y disponible para nuevos registros',
        deactivatedText: 'desactivado sin afectar el historial',
      }}
      title="Paquetes"
    />
  )
}
