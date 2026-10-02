import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import KitchenLayout from './layouts/KitchenLayout'
import ProtectedRoute from './components/shared/ProtectedRoute'
import RoleGuard from './components/shared/RoleGuard'
import { ThemeProvider } from './context/ThemeContext'
import { CalendarProvider } from './context/CalendarContext'

import Dashboard     from './pages/admin/Dashboard'
import Categories    from './pages/admin/Categories'
import Dishes        from './pages/admin/Dishes'
import Extras        from './pages/admin/Extras'
import Orders        from './pages/admin/Orders'
import Reservations  from './pages/admin/Reservations'
import Delivery      from './pages/admin/Delivery'
import CashCuts      from './pages/admin/CashCuts'
import Promotions    from './pages/admin/Promotions'
import Reviews       from './pages/admin/Reviews'
import Ingredients   from './pages/admin/Ingredients'
import Stock         from './pages/admin/Stock'
import Suppliers     from './pages/admin/Suppliers'
import Areas         from './pages/admin/Areas'
import Settings      from './pages/admin/Settings'
import LandingPersonalizar from './pages/admin/LandingPersonalizar'
import Audit         from './pages/admin/Audit'
import UsersRoles    from './pages/admin/UsersRoles'
import Permissions   from './pages/admin/Permissions'
import Sales         from './pages/admin/finances/Sales'
import Payments      from './pages/admin/finances/Payments'
import Reports       from './pages/admin/finances/Reports'
import Costs         from './pages/admin/finances/Costs'
import KitchenView   from './pages/kitchen/KitchenView'
import Login         from './pages/auth/Login'
import ForcePasswordChange from './pages/auth/ForcePasswordChange'
import WaiterView    from './pages/waiter/WaiterView'
import DeliveryView  from './pages/delivery/DeliveryView'
import DriverOrderView from './pages/delivery/DriverOrderView'
import Landing       from './pages/Landing'
import Experiencias  from './pages/Experiencias'
import MenuPage      from './pages/MenuPage'

import InactivityHandler from './components/shared/InactivityHandler'

const VistaGerente = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-theme-bg text-theme-text">
    <h1 className="text-2xl font-bold">Vista de Gerente</h1>
    <p className="text-theme-text-muted mt-2">Consulta de reportes y costos (Próximamente)</p>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <InactivityHandler>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cambiar-password-obligatorio" element={<ForcePasswordChange />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['admin', 'super_admin', 'gerente']}>
                    <CalendarProvider>
                      <AdminLayout />
                    </CalendarProvider>
                  </RoleGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"     element={<Dashboard />} />
              <Route path="categories"    element={<Categories />} />
              <Route path="dishes"        element={<Dishes />} />
              <Route path="extras"        element={<Extras />} />
              <Route path="orders"        element={<Orders />} />
              <Route path="reservations"  element={<Reservations />} />
              <Route path="delivery"      element={<Delivery />} />
              <Route path="cortes"        element={<CashCuts />} />
              <Route path="cash-cuts"     element={<Navigate to="/admin/cortes" replace />} />
              <Route path="promotions"    element={<Promotions />} />
              <Route path="reviews"       element={<Reviews />} />
              <Route path="ingredients"   element={<Ingredients />} />
              <Route path="stock"         element={<Stock />} />
              <Route path="suppliers"     element={<Suppliers />} />
              <Route path="areas"         element={<RoleGuard allowedRoles={['admin', 'super_admin']}><Areas /></RoleGuard>} />
              <Route path="settings"      element={<RoleGuard allowedRoles={['admin', 'super_admin']}><Settings /></RoleGuard>} />
              <Route path="landing"       element={<RoleGuard allowedRoles={['admin', 'super_admin']}><LandingPersonalizar /></RoleGuard>} />
              <Route path="audit"         element={<Audit />} />
              <Route path="users-roles"   element={<RoleGuard allowedRoles={['admin', 'super_admin']}><UsersRoles /></RoleGuard>} />
              <Route path="permissions"     element={<RoleGuard allowedRoles={['admin', 'super_admin']}><Permissions /></RoleGuard>} />
              <Route path="finances/sales"    element={<Sales />} />
              <Route path="finances/payments" element={<Payments />} />
              <Route path="finances/reports"  element={<Reports />} />
              <Route path="finances/costs"    element={<Costs />} />
            </Route>

            <Route
              path="/cocina"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['cocina', 'admin', 'super_admin']}>
                    <KitchenLayout />
                  </RoleGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<KitchenView />} />
            </Route>

            <Route
              path="/gerente"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['gerente', 'admin', 'super_admin']}>
                    <VistaGerente />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/mesero"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['mesero', 'admin', 'super_admin']}>
                    <WaiterView />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/repartidor"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['repartidor', 'admin', 'super_admin']}>
                    <DeliveryView />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/repartidor/pedido/:id"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['repartidor', 'admin', 'super_admin']}>
                    <DriverOrderView />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route path="/menu" element={<MenuPage />} />
            <Route path="/experiencias" element={<Experiencias />} />
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </InactivityHandler>
    </BrowserRouter>
  )
}