import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  FileBarChart,
  Home,
  Package,
  Receipt,
  Settings,
  Tags,
  Users,
  WalletCards,
} from 'lucide-react'

export const navigationSections = [
  {
    title: 'Principal',
    items: [
      { label: 'Inicio', path: '/inicio', icon: Home },
      { label: 'Dashboard financiero', path: '/dashboard-financiero', icon: BarChart3 },
    ],
  },
  {
    title: 'Comercial',
    items: [
      { label: 'Cotizaciones', path: '/cotizaciones', icon: ClipboardList },
      { label: 'Contratos', path: '/contratos', icon: BriefcaseBusiness },
      { label: 'Paquetes', path: '/paquetes', icon: Package },
      { label: 'Tipos de evento', path: '/tipos-evento', icon: Tags },
      { label: 'Clientes', path: '/clientes', icon: Users },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { label: 'Costos directos', path: '/costos-directos', icon: Receipt },
      { label: 'Gastos fijos', path: '/gastos-fijos', icon: WalletCards },
      { label: 'Reportes', path: '/reportes', icon: FileBarChart },
    ],
  },
  {
    title: 'Sistema',
    items: [{ label: 'Configuración', path: '/configuracion', icon: Settings }],
  },
]
