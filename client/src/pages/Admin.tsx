import { useEffect, useState } from 'react'
import { PaymentStatusBadge, ShippingProgress } from '../components/OrderStatus'
import {
  approveItem,
  getAdminOrders,
  getPendingItems,
  rejectItem,
  updateShippingStatus,
  type AdminOrder,
  type ItemSubmission,
  type ShippingStatus,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime } from '../lib/format'

const TABS = ['approvals', 'orders'] as const
type Tab = (typeof TABS)[number]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('approvals')

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="mb-8 flex gap-1 border-b border-royal/10">
        <button
          onClick={() => setTab('approvals')}
          className={`border-b-2 px-1 pb-3 text-[14px] font-semibold ${tab === 'approvals' ? 'border-gold text-royal' : 'border-transparent text-gray-500 hover:text-royal'}`}
        >
          Pending Approvals
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`ml-6 border-b-2 px-1 pb-3 text-[14px] font-semibold ${tab === 'orders' ? 'border-gold text-royal' : 'border-transparent text-gray-500 hover:text-royal'}`}
        >
          Orders
        </button>
      </div>

      {tab === 'approvals' ? <PendingApprovals /> : <OrdersManagement />}
    </div>
  )
}

function PendingApprovals() {
  const { token } = useAuth()
  const [items, setItems] = useState<ItemSubmission[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    if (!token) return
    getPendingItems(token)
      .then(setItems)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [token])

  async function handleApprove(id: string) {
    if (!token) return
    setBusyId(id)
    setError(null)
    try {
      await approveItem(id, token)
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: string) {
    if (!token) return
    const reason = window.prompt('Reason for rejecting this item:')
    if (!reason || !reason.trim()) return
    setBusyId(id)
    setError(null)
    try {
      await rejectItem(id, reason.trim(), token)
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-royal">Pending Approvals</h1>
      <p className="mb-8 text-sm text-gray-500">Review submitted lots before they go live for bidding.</p>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!items ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">Queue is empty</h4>
          <p className="text-sm">No items are waiting for review right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-royal/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] tracking-wider text-deepblue uppercase">
                    {item.category.name} · by {item.seller.name}
                  </div>
                  <h3 className="mt-1 font-display text-lg font-medium text-charcoal">{item.title}</h3>
                  <p className="mt-1.5 max-w-xl text-[13.5px] text-gray-500">{item.description}</p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={busyId === item.id}
                    className="rounded-lg bg-green px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-green/90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={busyId === item.id}
                    className="rounded-lg border border-red/40 px-4 py-2 text-[13px] font-semibold text-red transition hover:bg-red/5 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 border-t border-gray-100 pt-3 font-mono text-[12px] text-gray-500 sm:grid-cols-4">
                <span>
                  Starting bid: <b className="text-charcoal">{formatCurrency(item.proposedStartingBid!)}</b>
                </span>
                <span>
                  Increment: <b className="text-charcoal">{formatCurrency(item.proposedBidIncrement!)}</b>
                </span>
                <span>
                  Starts: <b className="text-charcoal">{formatDateTime(item.proposedStartTime!)}</b>
                </span>
                <span>
                  Ends: <b className="text-charcoal">{formatDateTime(item.proposedEndTime!)}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const SHIPPING_OPTIONS: { value: ShippingStatus; label: string }[] = [
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'inTransit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
]

function OrdersManagement() {
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
