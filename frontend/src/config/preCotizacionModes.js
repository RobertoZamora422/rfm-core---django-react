import { HandPlatter, Signpost, TreeDeciduous } from 'lucide-react'

export const PRE_COTIZACION_MODES = Object.freeze({
  alquiler: Object.freeze({
    icon: TreeDeciduous,
    label: 'Solo alquiler',
    value: 'alquiler',
  }),
  servicio_completo: Object.freeze({
    icon: HandPlatter,
    label: 'Servicio completo',
    value: 'servicio_completo',
  }),
  no_estoy_seguro: Object.freeze({
    icon: Signpost,
    label: 'No estoy seguro',
    value: 'no_estoy_seguro',
  }),
})

export const PRE_COTIZACION_MODE_OPTIONS = Object.freeze(
  Object.values(PRE_COTIZACION_MODES),
)

export function getPreCotizacionMode(value) {
  return PRE_COTIZACION_MODES[value] ?? PRE_COTIZACION_MODES.no_estoy_seguro
}
