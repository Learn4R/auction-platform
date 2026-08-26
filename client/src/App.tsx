import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireRole } from './components/RequireRole'
import AdminLayout from './pages/admin/AdminLayout'
import AdminApprovals from './pages/admin/Approvals'
import AdminCategories from './pages/admin/Categories'
import AdminDashboard from './pages/admin/Dashboard'
import AdminOrders from './pages/admin/Orders'
import AdminSellers from './pages/admin/Sellers'
import AdminSettings from './pages/admin/Settings'
import Browse from './pages/Browse'
import Home from './pages/Home'
import ItemDetail from './pages/ItemDetail'
import Login from './pages/Login'
import MyListings from './pages/MyListings'
import Orders from './pages/Orders'
import Sell from './pages/Sell'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="browse" element={<Browse />} />
        <Route path="items/:id" element={<ItemDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="orders" element={<Orders />} />
        <Route
          path="sell"
          element={
            <RequireRole role="seller">
              <Sell />
            </RequireRole>
          }
        />
        <Route
          path="my-listings"
          element={
            <RequireRole role="seller">
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
          <Route path="orders" element={<AdminOrders />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="sellers" element={<AdminSellers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
