import {
  BarChart3,
  BriefcaseBusiness,
  CalendarPlus,
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
    title: 'Operacion',
    items: [
      { label: 'Inicio', path: '/inicio', icon: Home },
      { label: 'Pre-cotizacion', path: '/pre-cotizacion', icon: CalendarPlus },
      { label: 'Cotizaciones', path: '/cotizaciones', icon: ClipboardList },
      { label: 'Contratos', path: '/contratos', icon: BriefcaseBusiness },
    ],
  },
  {
    title: 'Administracion',
    items: [
      { label: 'Clientes', path: '/clientes', icon: Users },
      { label: 'Tipos de evento', path: '/tipos-evento', icon: Tags },
      { label: 'Paquetes', path: '/paquetes', icon: Package },
      { label: 'Configuracion', path: '/configuracion', icon: Settings },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { label: 'Costos directos', path: '/costos-directos', icon: Receipt },
      { label: 'Gastos fijos', path: '/gastos-fijos', icon: WalletCards },
      { label: 'Dashboard financiero', path: '/dashboard-financiero', icon: BarChart3 },
      { label: 'Reportes', path: '/reportes', icon: FileBarChart },
    ],
  },
]
