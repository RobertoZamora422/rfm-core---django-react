import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../layouts/AdminLayout'
import { InicioPage } from '../pages/InicioPage'
import { LoginPage } from '../pages/LoginPage'
import { ModulePlaceholder } from '../pages/ModulePlaceholder'
import { ProtectedRoute } from './ProtectedRoute'

const moduleRoutes = [
  {
    path: 'pre-cotizacion',
    title: 'Pre-cotizacion',
    description: 'Registro inicial de solicitudes comerciales.',
  },
  {
    path: 'cotizaciones',
    title: 'Cotizaciones',
    description: 'Gestion comercial de oportunidades por estado.',
  },
  {
    path: 'cotizaciones/:id',
    title: 'Detalle de cotizacion',
    description: 'Consulta y acciones sobre una cotizacion especifica.',
  },
  {
    path: 'contratos',
    title: 'Contratos',
    description: 'Administracion de contratos reales del negocio.',
  },
  {
    path: 'contratos/:id',
    title: 'Detalle de contrato',
    description: 'Consulta de contrato, pagos y costos asociados.',
  },
  {
    path: 'clientes',
    title: 'Clientes',
    description: 'Administracion de clientes e interesados.',
  },
  {
    path: 'tipos-evento',
    title: 'Tipos de evento',
    description: 'Catalogo de eventos gestionados por el negocio.',
  },
  {
    path: 'paquetes',
    title: 'Paquetes',
    description: 'Catalogo de paquetes y tipos de servicio.',
  },
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
  {
    path: 'configuracion',
    title: 'Configuracion',
    description: 'Parametros generales del negocio.',
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
