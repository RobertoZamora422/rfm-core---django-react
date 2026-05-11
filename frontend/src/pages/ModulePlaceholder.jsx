import { Settings2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'

export function ModulePlaceholder({ description, title }) {
  return (
    <div className="page-stack">
      <PageHeader description={description} title={title} />
      <Card>
        <EmptyState
          description="La interfaz funcional de este modulo se habilitara en su fase correspondiente."
          icon={Settings2}
          title="Modulo pendiente"
        />
      </Card>
    </div>
  )
}
