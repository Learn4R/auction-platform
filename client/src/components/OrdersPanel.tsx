import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPayment, getMyProfile, getOrders, submitReview, verifyPayment, type MyProfile, type Order } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime } from '../lib/format'
import { loadRazorpayScript, openRazorpayCheckout } from '../lib/razorpay'
import { PaymentStatusBadge, ShippingProgress } from './OrderStatus'
import { ShippingAddressForm } from './ShippingAddressForm'
import { ShippingAddressSummary } from './ShippingAddressSummary'
import { StarRatingDisplay, StarRatingInput } from './StarRating'

function ReviewSection({ order, onSubmitted }: { order: Order; onSubmitted: (order: Order) => void }) {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (order.review) {
    return (
      <div className="mt-5 border-t border-gray-100 pt-4">
        <div className="mb-1.5 font-mono text-[10px] tracking-wider text-gray-500 uppercase">Your Review</div>
        <div className="flex items-center gap-2">
          <StarRatingDisplay rating={order.review.rating} />
          <span className="font-mono text-[11px] text-gray-500">{formatDateTime(order.review.createdAt)}</span>
        </div>
        {order.review.comment && <p className="mt-1.5 text-[13px] text-charcoal">{order.review.comment}</p>}
      </div>
    )
  }

  if (!open) {
    return (
      <div className="mt-5 border-t border-gray-100 pt-4">
        <button
          onClick={() => setOpen(true)}
          className="text-[13px] font-semibold text-royal hover:text-deepblue"
        >
          Leave a review →
        </button>
      </div>
    )
  }

  async function handleSubmit() {
    if (!token || rating < 1) return
    setBusy(true)
    setError(null)
    try {
      const review = await submitReview(order.id, { rating, comment: comment.trim() || undefined }, token)
      onSubmitted({ ...order, review })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <div className="mb-1.5 font-mono text-[10px] tracking-wider text-gray-500 uppercase">Leave a Review</div>
      <StarRatingInput value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment about your experience with this seller"
        rows={2}
        className="input mt-2.5 w-full resize-none text-[13.5px]"
      />
      {error && <p className="mt-1.5 text-[12.5px] text-red">{error}</p>}
      <div className="mt-2.5 flex gap-2.5">
        <button
          onClick={handleSubmit}
          disabled={busy || rating < 1}
          className="rounded-lg bg-royal px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
        >
          {busy ? 'Submitting…' : 'Submit Review'}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-lg border border-royal/20 px-4 py-2 text-[13px] font-semibold text-charcoal transition hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function OrdersPanel() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getOrders(token)
      .then(setOrders)
      .catch((err) => setError(err.message))
    getMyProfile(token)
      .then(setProfile)
      .catch(() => {})
  }, [token])

  function handleAddressSaved(updated: Order) {
    setOrders((prev) => (prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev))
  }

  async function handlePay(order: Order) {
    if (!token) return
    setPayingId(order.id)
    setPayError(null)
    try {
      await loadRazorpayScript()
      const payment = await createPayment(order.id, token)

      openRazorpayCheckout({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.razorpayOrderId,
        name: 'Mudra House',
        description: order.auction.item.title,
        theme: { color: '#173B70' },
        handler: async (response) => {
          try {
            const updated = await verifyPayment(order.id, response, token)
            setOrders((prev) => (prev ? prev.map((o) => (o.id === order.id ? updated : o)) : prev))
          } catch (err) {
            setPayError(err instanceof Error ? err.message : 'Payment verification failed')
          } finally {
            setPayingId(null)
          }
        },
        modal: { ondismiss: () => setPayingId(null) },
      })
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to start payment')
      setPayingId(null)
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-red">{error}</p>}
      {payError && <p className="mb-4 text-sm text-red">{payError}</p>}

      {!orders ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">No orders yet</h4>
          <p className="text-sm">Win an auction and it'll show up here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-royal/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] tracking-wider text-deepblue uppercase">
                    {order.auction.item.category.name}
                  </div>
                  <Link
                    to={`/items/${order.auction.item.id}`}
                    className="mt-1 block font-display text-lg font-medium text-charcoal hover:text-royal"
                  >
                    {order.auction.item.title}
                  </Link>
                  <div className="mt-1 font-mono text-[11px] text-gray-500">
                    Won {formatDateTime(order.createdAt)}
                  </div>
                </div>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 font-mono text-[13px]">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Winning Bid</div>
                  <div className="font-semibold text-charcoal">{formatCurrency(order.winningBid)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Buyer Premium (10%)</div>
                  <div className="font-semibold text-charcoal">{formatCurrency(order.buyerPremium)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Total</div>
                  <div className="font-semibold text-royal">{formatCurrency(order.totalAmount)}</div>
                </div>
              </div>

              {order.paymentStatus === 'paid' ? (
                <>
                  <ShippingAddressSummary order={order} />
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <div className="mb-3 font-mono text-[10px] tracking-wider text-gray-500 uppercase">
                      Shipping Status
                    </div>
                    <ShippingProgress status={order.shippingStatus} />
                  </div>
                  <ReviewSection
                    order={order}
                    onSubmitted={(updated) =>
                      setOrders((prev) => (prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev))
                    }
                  />
                </>
              ) : order.shippingAddressLine1 ? (
                <>
                  <ShippingAddressSummary order={order} />
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <button
                      onClick={() => handlePay(order)}
                      disabled={payingId === order.id}
                      className="rounded-lg bg-royal px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
                    >
                      {payingId === order.id ? 'Opening checkout…' : 'Pay Now'}
                    </button>
                  </div>
                </>
              ) : (
                <ShippingAddressForm order={order} defaultAddress={profile} onSaved={handleAddressSaved} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
