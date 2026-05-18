import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../layouts/AdminLayout'
import { ClientesPage } from '../pages/admin/ClientesPage'
import { ConfiguracionPage } from '../pages/admin/ConfiguracionPage'
import { PaquetesPage } from '../pages/admin/PaquetesPage'
import { TiposEventoPage } from '../pages/admin/TiposEventoPage'
import { ContratosPage } from '../pages/contratos/ContratosPage'
import { DetalleContratoPage } from '../pages/contratos/DetalleContratoPage'
import { CotizacionesPage } from '../pages/cotizaciones/CotizacionesPage'
import { DetalleCotizacionPage } from '../pages/cotizaciones/DetalleCotizacionPage'
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
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route element={<Navigate replace to="/inicio" />} index />
          <Route element={<InicioPage />} path="/inicio" />
          <Route element={<PreCotizacionPage />} path="pre-cotizacion" />
          <Route element={<ClientesPage />} path="clientes" />
          <Route element={<TiposEventoPage />} path="tipos-evento" />
          <Route element={<PaquetesPage />} path="paquetes" />
          <Route element={<ConfiguracionPage />} path="configuracion" />
          <Route element={<CotizacionesPage />} path="cotizaciones" />
          <Route element={<DetalleCotizacionPage />} path="cotizaciones/:id" />
          <Route element={<ContratosPage />} path="contratos" />
          <Route element={<DetalleContratoPage />} path="contratos/:id" />
          <Route element={<CostosDirectosPage />} path="costos-directos" />
          <Route element={<GastosFijosPage />} path="gastos-fijos" />
          <Route element={<DashboardFinancieroPage />} path="dashboard-financiero" />
          <Route element={<ReportesPage />} path="reportes" />
        </Route>
      </Route>
      <Route element={<Navigate replace to="/inicio" />} path="*" />
    </Routes>
  )
}
