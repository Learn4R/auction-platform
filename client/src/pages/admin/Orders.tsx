import { useEffect, useState, type FormEvent } from 'react'
import { PaymentStatusBadge, ShippingProgress } from '../../components/OrderStatus'
import { ShippingAddressSummary } from '../../components/ShippingAddressSummary'
import { getAdminOrders, issueRefund, updateShippingStatus, type AdminOrder, type ShippingStatus } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatCurrency, formatDateTime } from '../../lib/format'

const SHIPPING_OPTIONS: { value: ShippingStatus; label: string }[] = [
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'inTransit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
]

function RefundModal({
  order,
  onClose,
  onRefunded,
}: {
  order: AdminOrder
  onClose: () => void
  onRefunded: (order: AdminOrder) => void
}) {
  const { token } = useAuth()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token || !reason.trim()) return
    setBusy(true)
    setError(null)
    try {
      const updated = await issueRefund(order.id, reason.trim(), token)
      onRefunded(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue refund')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 font-display text-lg text-royal">Issue Refund</h3>
        <p className="mb-4 text-[13px] text-gray-500">
          {order.auction.item.title} — {formatCurrency(order.totalAmount)} to {order.buyer.name}
        </p>
        <form onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Why is this order being refunded?"
              className="input resize-none text-[13.5px] font-normal"
            />
          </label>

          {error && <p className="mt-2.5 text-[12.5px] text-red">{error}</p>}

          <div className="mt-4 flex gap-2.5">
            <button
              type="submit"
              disabled={busy || !reason.trim()}
              className="rounded-lg bg-royal px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
            >
              {busy ? 'Refunding…' : 'Confirm Refund'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-royal/20 px-4 py-2.5 text-[13.5px] font-semibold text-charcoal transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Orders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [refundingOrder, setRefundingOrder] = useState<AdminOrder | null>(null)

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

  function handleRefunded(updated: AdminOrder) {
    setOrders((prev) => (prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev))
    setRefundingOrder(null)
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
                <div className="mt-4 flex flex-wrap items-start gap-6 border-t border-gray-100 pt-4">
                  <div className="min-w-[220px] flex-1">
                    <ShippingAddressSummary order={order} compact />
                  </div>
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
                  <button
                    onClick={() => setRefundingOrder(order)}
                    className="rounded-lg border border-red/30 px-3.5 py-2 text-[12.5px] font-semibold text-red transition hover:bg-red/5"
                  >
                    Issue Refund
                  </button>
                </div>
              )}

              {order.paymentStatus === 'refunded' && (
                <div className="mt-4 border-t border-gray-100 pt-4 text-[12.5px] text-gray-500">
                  <div className="mb-1 font-mono text-[10px] tracking-wider text-gray-500 uppercase">
                    Refunded {order.refundedAt && formatDateTime(order.refundedAt)}
                  </div>
                  {order.refundReason && <p className="text-charcoal">{order.refundReason}</p>}
                  {order.razorpayRefundId && (
                    <p className="mt-1 font-mono text-[11px] text-gray-400">Razorpay refund: {order.razorpayRefundId}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {refundingOrder && (
        <RefundModal order={refundingOrder} onClose={() => setRefundingOrder(null)} onRefunded={handleRefunded} />
      )}
    </div>
  )
}
