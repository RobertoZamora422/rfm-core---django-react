import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

export function Pagination({ onPageChange, page, pageSize = 12, total }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginación" className="pagination">
      <span>{total} registros · Página {page} de {totalPages}</span>
      <div>
        <Button disabled={page <= 1} icon={ChevronLeft} onClick={() => onPageChange(page - 1)} variant="secondary">
          Anterior
        </Button>
        <Button disabled={page >= totalPages} icon={ChevronRight} onClick={() => onPageChange(page + 1)} variant="secondary">
          Siguiente
        </Button>
      </div>
    </nav>
  )
}
