import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { LoadingState } from '../components/ui/LoadingState'
import { AdminLayout } from '../layouts/AdminLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { LoginPage } from '../pages/LoginPage'
import { PreCotizacionPage } from '../pages/PreCotizacionPage'
import { ProtectedRoute } from './ProtectedRoute'

const lazyPage = (loader, exportName) => lazy(
  () => loader().then((module) => ({ default: module[exportName] })),
)

const InicioPage = lazyPage(() => import('../pages/InicioPage'), 'InicioPage')
const PersonasPage = lazyPage(() => import('../pages/admin/PersonasPage'), 'PersonasPage')
const DetallePersonaPage = lazyPage(
  () => import('../pages/admin/DetallePersonaPage'),
  'DetallePersonaPage',
)
const ConfiguracionPage = lazyPage(
  () => import('../pages/admin/ConfiguracionPage'),
  'ConfiguracionPage',
)
const PaquetesPage = lazyPage(() => import('../pages/admin/PaquetesPage'), 'PaquetesPage')
const TiposEventoPage = lazyPage(
  () => import('../pages/admin/TiposEventoPage'),
  'TiposEventoPage',
)
const ContratosPage = lazyPage(
  () => import('../pages/contratos/ContratosPage'),
  'ContratosPage',
)
const DetalleContratoPage = lazyPage(
  () => import('../pages/contratos/DetalleContratoPage'),
  'DetalleContratoPage',
)
const EditarContratoPage = lazyPage(
  () => import('../pages/contratos/EditarContratoPage'),
  'EditarContratoPage',
)
const NuevoContratoPage = lazyPage(
  () => import('../pages/contratos/NuevoContratoPage'),
  'NuevoContratoPage',
)
const CotizacionesPage = lazyPage(
  () => import('../pages/cotizaciones/CotizacionesPage'),
  'CotizacionesPage',
)
const DetalleCotizacionPage = lazyPage(
  () => import('../pages/cotizaciones/DetalleCotizacionPage'),
  'DetalleCotizacionPage',
)
const EditarCotizacionPage = lazyPage(
  () => import('../pages/cotizaciones/EditarCotizacionPage'),
  'EditarCotizacionPage',
)
const NuevaCotizacionPage = lazyPage(
  () => import('../pages/cotizaciones/NuevaCotizacionPage'),
  'NuevaCotizacionPage',
)
const CostosDirectosPage = lazyPage(
  () => import('../pages/finanzas/CostosDirectosPage'),
  'CostosDirectosPage',
)
const DashboardFinancieroPage = lazyPage(
  () => import('../pages/finanzas/DashboardFinancieroPage'),
  'DashboardFinancieroPage',
)
const GastosPage = lazyPage(() => import('../pages/finanzas/GastosPage'), 'GastosPage')
const ReportesPage = lazyPage(
  () => import('../pages/finanzas/ReportesPage'),
  'ReportesPage',
)

function LazyRoute({ component: Page }) {
  return (
    <Suspense fallback={<LoadingState label="Cargando módulo" />}>
      <Page />
    </Suspense>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<PublicLayout />}>
        <Route element={<Navigate replace to="/pre-cotizacion" />} index />
        <Route element={<PreCotizacionPage />} path="/pre-cotizacion" />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route element={<Navigate replace to="/inicio" />} index />
          <Route element={<LazyRoute component={InicioPage} />} path="/inicio" />
          <Route element={<LazyRoute component={PersonasPage} />} path="personas" />
          <Route element={<LazyRoute component={DetallePersonaPage} />} path="personas/:id" />
          <Route element={<LazyRoute component={TiposEventoPage} />} path="tipos-evento" />
          <Route element={<LazyRoute component={PaquetesPage} />} path="paquetes" />
          <Route element={<LazyRoute component={ConfiguracionPage} />} path="configuracion" />
          <Route element={<LazyRoute component={CotizacionesPage} />} path="cotizaciones" />
          <Route element={<LazyRoute component={NuevaCotizacionPage} />} path="cotizaciones/nueva" />
          <Route element={<LazyRoute component={EditarCotizacionPage} />} path="cotizaciones/:id/editar" />
          <Route element={<LazyRoute component={DetalleCotizacionPage} />} path="cotizaciones/:id" />
          <Route element={<LazyRoute component={ContratosPage} />} path="contratos" />
          <Route element={<LazyRoute component={NuevoContratoPage} />} path="contratos/nuevo" />
          <Route element={<LazyRoute component={EditarContratoPage} />} path="contratos/:id/editar" />
          <Route element={<LazyRoute component={DetalleContratoPage} />} path="contratos/:id" />
          <Route element={<LazyRoute component={CostosDirectosPage} />} path="costos-directos" />
          <Route element={<LazyRoute component={GastosPage} />} path="gastos" />
          <Route element={<Navigate replace to="/gastos" />} path="gastos-fijos" />
          <Route element={<Navigate replace to="/dashboard-financiero" />} path="dashboard" />
          <Route element={<LazyRoute component={DashboardFinancieroPage} />} path="dashboard-financiero" />
          <Route element={<LazyRoute component={ReportesPage} />} path="reportes" />
        </Route>
      </Route>
      <Route path="*" element={<Navigate replace to="/pre-cotizacion" />} />
    </Routes>
  )
}
