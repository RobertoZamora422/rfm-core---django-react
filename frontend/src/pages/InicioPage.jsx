import { Link } from 'react-router-dom'
import { ClipboardList, FileBarChart, PlusCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'

const quickActions = [
  {
    label: 'Registrar pre-cotizacion',
    path: '/pre-cotizacion',
    icon: PlusCircle,
  },
  {
    label: 'Revisar cotizaciones',
    path: '/cotizaciones',
    icon: ClipboardList,
  },
  {
    label: 'Ver dashboard financiero',
    path: '/dashboard-financiero',
    icon: FileBarChart,
  },
]

export function InicioPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Centro operativo para seguimiento comercial y administrativo."
        title="Inicio administrativo"
      />

      <section className="quick-actions" aria-label="Acciones principales">
        {quickActions.map((action) => (
          <Link className="quick-action" key={action.path} to={action.path}>
            <action.icon aria-hidden="true" size={20} />
            <span>{action.label}</span>
          </Link>
        ))}
      </section>

      <Card>
        <EmptyState
          action={<span className="pill">Endpoint pendiente</span>}
          description="El resumen operativo se conectara al backend cuando se implemente el endpoint agregado de inicio."
          title="Resumen operativo pendiente"
        />
      </Card>
    </div>
  )
}
