import { FilterX } from 'lucide-react'
import { Button } from './Button'
import { Card } from './Card'

export function FiltersToolbar({ children, hasFilters, isLoading, onClear, resultCount }) {
  return (
    <Card className="filters-toolbar">
      <div className="filters-toolbar__heading">
        <div>
          <strong>Buscar y filtrar</strong>
          <span aria-live="polite">
            {isLoading ? 'Actualizando resultados…' : `${resultCount} ${resultCount === 1 ? 'resultado' : 'resultados'}`}
          </span>
        </div>
        {hasFilters ? (
          <Button icon={FilterX} onClick={onClear} variant="ghost">
            Limpiar filtros
          </Button>
        ) : null}
      </div>
      <div className="filters-grid filters-grid--automatic">{children}</div>
    </Card>
  )
}
