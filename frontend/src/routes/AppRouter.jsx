import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../layouts/AdminLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { ClientesPage } from '../pages/admin/ClientesPage'
import { DetalleClientePage } from '../pages/admin/DetalleClientePage'
import { ConfiguracionPage } from '../pages/admin/ConfiguracionPage'
import { PaquetesPage } from '../pages/admin/PaquetesPage'
import { TiposEventoPage } from '../pages/admin/TiposEventoPage'
import { ContratosPage } from '../pages/contratos/ContratosPage'
import { DetalleContratoPage } from '../pages/contratos/DetalleContratoPage'
import { EditarContratoPage } from '../pages/contratos/EditarContratoPage'
import { NuevoContratoPage } from '../pages/contratos/NuevoContratoPage'
import { CotizacionesPage } from '../pages/cotizaciones/CotizacionesPage'
import { DetalleCotizacionPage } from '../pages/cotizaciones/DetalleCotizacionPage'
import { EditarCotizacionPage } from '../pages/cotizaciones/EditarCotizacionPage'
import { NuevaCotizacionPage } from '../pages/cotizaciones/NuevaCotizacionPage'
import { CostosDirectosPage } from '../pages/finanzas/CostosDirectosPage'
import { DashboardFinancieroPage } from '../pages/finanzas/DashboardFinancieroPage'
import { GastosFijosPage } from '../pages/finanzas/GastosFijosPage'
import { ReportesPage } from '../pages/finanzas/ReportesPage'
import { InicioPage } from '../pages/InicioPage'
import { LoginPage } from '../pages/LoginPage'
import { PreCotizacionPage } from '../pages/PreCotizacionPage'
import { ProtectedRoute } from './ProtectedRoute'

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
          <Route element={<InicioPage />} path="/inicio" />
          <Route element={<ClientesPage />} path="clientes" />
          <Route element={<DetalleClientePage />} path="clientes/:id" />
          <Route element={<TiposEventoPage />} path="tipos-evento" />
          <Route element={<PaquetesPage />} path="paquetes" />
          <Route element={<ConfiguracionPage />} path="configuracion" />
          <Route element={<CotizacionesPage />} path="cotizaciones" />
          <Route element={<NuevaCotizacionPage />} path="cotizaciones/nueva" />
          <Route element={<EditarCotizacionPage />} path="cotizaciones/:id/editar" />
          <Route element={<DetalleCotizacionPage />} path="cotizaciones/:id" />
          <Route element={<ContratosPage />} path="contratos" />
          <Route element={<NuevoContratoPage />} path="contratos/nuevo" />
          <Route element={<EditarContratoPage />} path="contratos/:id/editar" />
          <Route element={<DetalleContratoPage />} path="contratos/:id" />
          <Route element={<CostosDirectosPage />} path="costos-directos" />
          <Route element={<GastosFijosPage />} path="gastos-fijos" />
          <Route element={<DashboardFinancieroPage />} path="dashboard-financiero" />
          <Route element={<ReportesPage />} path="reportes" />
        </Route>
      </Route>
      <Route element={<Navigate replace to="/pre-cotizacion" />} path="*" />
    </Routes>
  )
}
