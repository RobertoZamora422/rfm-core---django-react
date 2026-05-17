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
import { InicioPage } from '../pages/InicioPage'
import { LoginPage } from '../pages/LoginPage'
import { ModulePlaceholder } from '../pages/ModulePlaceholder'
import { PreCotizacionPage } from '../pages/PreCotizacionPage'
import { ProtectedRoute } from './ProtectedRoute'

const moduleRoutes = [
  {
    path: 'costos-directos',
    title: 'Costos directos',
    description: 'Registro de costos asociados a contratos y eventos.',
  },
  {
    path: 'gastos-fijos',
    title: 'Gastos fijos',
    description: 'Administracion de gastos mensuales del negocio.',
  },
  {
    path: 'dashboard-financiero',
    title: 'Dashboard financiero',
    description: 'Analisis de rentabilidad calculado desde backend.',
  },
  {
    path: 'reportes',
    title: 'Reportes',
    description: 'Reportes comerciales, financieros, de eventos y paquetes.',
  },
]

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
          {moduleRoutes.map((route) => (
            <Route
              element={<ModulePlaceholder description={route.description} title={route.title} />}
              key={route.path}
              path={route.path}
            />
          ))}
        </Route>
      </Route>
      <Route element={<Navigate replace to="/inicio" />} path="*" />
    </Routes>
  )
}
