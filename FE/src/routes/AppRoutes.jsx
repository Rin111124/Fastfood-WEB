import { Navigate, Route, Routes } from 'react-router-dom'
import Login from '../components/Auth/Login'
import Signup from '../components/Auth/Signup'
import ProtectedRoute from '../components/ProtectedRoute'
import Dashboard from '../components/Dashboard'
import AdminLayout from '../layouts/AdminLayout'
import StaffLayout from '../layouts/StaffLayout'
import LandingPage from '../components/LandingPage'
import Landing from '../features/public/pages/Landing'
import MenuPage from '../components/Menupage'
import ProductDetailPage from '../components/ProductDetailPage'
import CartPage from '../components/CartPage'
import CustomerLanding from '../features/customer/pages/CustomerLanding'
import AdminDashboard from '../features/admin/pages/AdminDashboard'
import AdminUsers from '../features/admin/pages/AdminUsers'
import AdminFoods from '../features/admin/pages/AdminFoods'
import AdminOrders from '../features/admin/pages/AdminOrders'
import AdminPromotions from '../features/admin/pages/AdminPromotions'
import AdminReports from '../features/admin/pages/AdminReports'
import AdminSettings from '../features/admin/pages/AdminSettings'
import AdminInventory from '../features/admin/pages/AdminInventory'
import AdminLogs from '../features/admin/pages/AdminLogs'
import AdminShifts from '../features/admin/pages/AdminShifts'
import AdminNews from '../features/admin/pages/AdminNews'
import StaffDashboard from '../features/staff/pages/StaffDashboard'
import StaffOrders from '../features/staff/pages/StaffOrders'
import StaffMenu from '../features/staff/pages/StaffMenu'
import StaffSupport from '../features/staff/pages/StaffSupport'
import StaffInventory from '../features/staff/pages/StaffInventory'
import StaffPerformance from '../features/staff/pages/StaffPerformance'
import StaffShifts from '../features/staff/pages/StaffShifts'

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/landing" element={<Landing />} />
    <Route path="/menu" element={<MenuPage />} />
    <Route path="/menu/:productId" element={<ProductDetailPage />} />
    <Route path="/cart" element={<CartPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />

    <Route element={<ProtectedRoute allowRoles={['customer', 'staff', 'admin', 'shipper']} />}>
      <Route path="/dashboard" element={<Dashboard />} />
    </Route>

    <Route element={<ProtectedRoute allowRoles={['customer', 'admin']} />}>
      <Route path="/customer" element={<CustomerLanding />} />
    </Route>

    <Route element={<ProtectedRoute allowRoles={['admin']} />}>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="foods" element={<AdminFoods />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="promotions" element={<AdminPromotions />} />
        <Route path="news" element={<AdminNews />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="shifts" element={<AdminShifts />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute allowRoles={['staff', 'admin']} />}>
      <Route path="/staff" element={<StaffLayout />}>
        <Route index element={<StaffDashboard />} />
        <Route path="orders" element={<StaffOrders />} />
        <Route path="menu" element={<StaffMenu />} />
        <Route path="support" element={<StaffSupport />} />
        <Route path="inventory" element={<StaffInventory />} />
        <Route path="performance" element={<StaffPerformance />} />
        <Route path="shifts" element={<StaffShifts />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default AppRoutes
