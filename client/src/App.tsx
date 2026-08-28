import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireRole } from './components/RequireRole'
import AdminLayout from './pages/admin/AdminLayout'
import AdminApprovals from './pages/admin/Approvals'
import AdminAuditLog from './pages/admin/AuditLog'
import AdminCategories from './pages/admin/Categories'
import AdminDashboard from './pages/admin/Dashboard'
import AdminLegal from './pages/admin/Legal'
import AdminOrders from './pages/admin/Orders'
import AdminPayouts from './pages/admin/Payouts'
import AdminSellerApplications from './pages/admin/SellerApplications'
import AdminSellers from './pages/admin/Sellers'
import AdminSettings from './pages/admin/Settings'
import Archive from './pages/Archive'
import Browse from './pages/Browse'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import HowItWorks from './pages/HowItWorks'
import ItemDetail from './pages/ItemDetail'
import Legal from './pages/Legal'
import Login from './pages/Login'
import MyListings from './pages/MyListings'
import Orders from './pages/Orders'
import Sell from './pages/Sell'
import Signup from './pages/Signup'
import Upcoming from './pages/Upcoming'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="browse" element={<Browse />} />
        <Route path="upcoming" element={<Upcoming />} />
        <Route path="archive" element={<Archive />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="items/:id" element={<ItemDetail />} />
        <Route path="legal/:slug" element={<Legal />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="orders" element={<Orders />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="sell"
          element={
            <RequireRole role={['buyer', 'seller', 'admin']}>
              <Sell />
            </RequireRole>
          }
        />
        <Route
          path="my-listings"
          element={
            <RequireRole role={['buyer', 'seller', 'admin']}>
              <MyListings />
            </RequireRole>
          }
        />
        <Route
          path="admin"
          element={
            <RequireRole role="admin">
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="seller-applications" element={<AdminSellerApplications />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="payouts" element={<AdminPayouts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="sellers" element={<AdminSellers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
          <Route path="legal" element={<AdminLegal />} />
          <Route path="legal/:slug" element={<AdminLegal />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
