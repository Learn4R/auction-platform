import { Navigate } from 'react-router-dom'
import { OrdersPanel } from '../components/OrdersPanel'
import { useAuth } from '../lib/auth'

export default function Orders() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="mb-2 font-display text-3xl text-royal">My Orders</h1>
      <p className="mb-8 text-sm text-gray-500">Lots you've won, with payment and shipping status.</p>
      <OrdersPanel />
    </div>
  )
}
