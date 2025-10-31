import { Navigate, Route, Routes } from 'react-router-dom'
import Login from '../components/Auth/Login'
import Signup from '../components/Auth/Signup'
import Dashboard from '../components/Dashboard'
import ProtectedRoute from '../components/ProtectedRoute'
import AdminLayout from '../layouts/AdminLayout'
import StaffLayout from '../layouts/StaffLayout'
import Landing from '../pages/Landing'
import CustomerLanding from '../pages/customer/CustomerLanding'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminUsers from '../pages/admin/AdminUsers'
import AdminFoods from '../pages/admin/AdminFoods'
import AdminOrders from '../pages/admin/AdminOrders'
import AdminPromotions from '../pages/admin/AdminPromotions'
import AdminReports from '../pages/admin/AdminReports'
import AdminSettings from '../pages/admin/AdminSettings'
import AdminInventory from '../pages/admin/AdminInventory'
import AdminLogs from '../pages/admin/AdminLogs'
import AdminShifts from '../pages/admin/AdminShifts'
import StaffDashboard from '../pages/staff/StaffDashboard'
import StaffOrders from '../pages/staff/StaffOrders'
import StaffMenu from '../pages/staff/StaffMenu'
import StaffSupport from '../pages/staff/StaffSupport'
import StaffInventory from '../pages/staff/StaffInventory'
import StaffPerformance from '../pages/staff/StaffPerformance'
import StaffShifts from '../pages/staff/StaffShifts'

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<CustomerLanding />} />

    <Route element={<ProtectedRoute allowRoles={['customer', 'staff', 'admin', 'shipper']} />}>
      <Route path="/dashboard" element={<Dashboard />} />
    </Route>
    <Route path="/landing" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />

    <Route element={<ProtectedRoute allowRoles={['admin']} />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/foods" element={<AdminFoods />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/promotions" element={<AdminPromotions />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
        <Route path="/admin/shifts" element={<AdminShifts />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute allowRoles={['staff', 'admin']} />}>
      <Route element={<StaffLayout />}>
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/staff/orders" element={<StaffOrders />} />
        <Route path="/staff/menu" element={<StaffMenu />} />
        <Route path="/staff/support" element={<StaffSupport />} />
        <Route path="/staff/inventory" element={<StaffInventory />} />
        <Route path="/staff/performance" element={<StaffPerformance />} />
        <Route path="/staff/shifts" element={<StaffShifts />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default AppRoutes
