import { useEffect, useState } from 'react'
import { PaymentStatusBadge, ShippingProgress } from '../../components/OrderStatus'
import { getAdminOrders, updateShippingStatus, type AdminOrder, type ShippingStatus } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatCurrency, formatDateTime } from '../../lib/format'

const SHIPPING_OPTIONS: { value: ShippingStatus; label: string }[] = [
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'inTransit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
]

export default function Orders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getAdminOrders(token)
      .then(setOrders)
      .catch((err) => setError(err.message))
  }, [token])

  async function handleShippingChange(orderId: string, status: ShippingStatus) {
    if (!token) return
    setBusyId(orderId)
    setError(null)
    try {
      const updated = await updateShippingStatus(orderId, status, token)
      setOrders((prev) => (prev ? prev.map((o) => (o.id === orderId ? updated : o)) : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shipping status')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-royal">Orders</h1>
      <p className="mb-8 text-sm text-gray-500">Track payment and move paid orders through shipping.</p>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!orders ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">No orders yet</h4>
          <p className="text-sm">Orders appear here once an auction ends with a winner.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-royal/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] tracking-wider text-deepblue uppercase">
                    {order.buyer.name}
                  </div>
                  <h3 className="mt-1 font-display text-lg font-medium text-charcoal">{order.auction.item.title}</h3>
                  <div className="mt-1 font-mono text-[11px] text-gray-500">{formatDateTime(order.createdAt)}</div>
                </div>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-4 border-t border-gray-100 pt-3 font-mono text-[12px]">
                <span>
                  Bid: <b className="text-charcoal">{formatCurrency(order.winningBid)}</b>
                </span>
                <span>
                  Premium: <b className="text-charcoal">{formatCurrency(order.buyerPremium)}</b>
                </span>
                <span>
                  Total: <b className="text-royal">{formatCurrency(order.totalAmount)}</b>
                </span>
              </div>

              {order.paymentStatus === 'paid' && (
                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
                  <div className="min-w-[240px] flex-1">
                    <ShippingProgress status={order.shippingStatus} />
                  </div>
                  <select
                    value={order.shippingStatus}
                    disabled={busyId === order.id}
                    onChange={(e) => handleShippingChange(order.id, e.target.value as ShippingStatus)}
                    className="input text-[13px]"
                  >
                    {SHIPPING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
