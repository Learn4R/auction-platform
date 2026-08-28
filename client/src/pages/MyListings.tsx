import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ItemStatusBadge } from '../components/ItemStatusBadge'
import { PayoutStatusBadge } from '../components/OrderStatus'
import { getMyItems, getSellerPayouts, type ItemSubmission, type SellerPayout } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime } from '../lib/format'

export default function MyListings() {
  const { token } = useAuth()
  const [items, setItems] = useState<ItemSubmission[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getMyItems(token)
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [token])

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 font-display text-3xl text-royal">My Listings</h1>
          <p className="text-sm text-gray-500">Track the review status of every item you've submitted.</p>
        </div>
        <Link
          to="/sell"
          className="rounded-lg bg-royal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-deepblue"
        >
          + Sell an Item
        </Link>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {!items ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">No listings yet</h4>
          <p className="text-sm">Submit your first item to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-royal/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] tracking-wider text-deepblue uppercase">
                    {item.category.name}
                  </div>
                  <h3 className="mt-1 font-display text-lg font-medium text-charcoal">{item.title}</h3>
                </div>
                <ItemStatusBadge status={item.status} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[12px] text-gray-500 sm:grid-cols-4">
                <span>
                  Starting bid:{' '}
                  <b className="text-charcoal">
                    {item.proposedStartingBid ? formatCurrency(item.proposedStartingBid) : '—'}
                  </b>
                </span>
                <span>
                  Increment:{' '}
                  <b className="text-charcoal">
                    {item.proposedBidIncrement ? formatCurrency(item.proposedBidIncrement) : '—'}
                  </b>
                </span>
                <span>Starts: <b className="text-charcoal">{item.proposedStartTime ? formatDateTime(item.proposedStartTime) : '—'}</b></span>
                <span>Ends: <b className="text-charcoal">{item.proposedEndTime ? formatDateTime(item.proposedEndTime) : '—'}</b></span>
              </div>

              {item.status === 'rejected' && item.rejectionReason && (
                <div className="mt-3 rounded-lg border border-red/20 bg-red/5 p-3 text-[13px] text-red">
                  <b>Reason:</b> {item.rejectionReason}
                </div>
              )}

              {item.status === 'approved' && (
                <Link
                  to={`/items/${item.id}`}
                  className="mt-3 inline-block text-[13px] font-semibold text-royal hover:text-deepblue"
                >
                  View live listing →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <PayoutsSection />
    </div>
  )
}

function PayoutsSection() {
  const { token } = useAuth()
  const [payouts, setPayouts] = useState<SellerPayout[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getSellerPayouts(token)
      .then(setPayouts)
      .catch((err) => setError(err.message))
  }, [token])

  return (
    <div className="mt-14">
      <div className="mb-8">
        <h2 className="mb-2 font-display text-2xl text-royal">My Payouts</h2>
        <p className="text-sm text-gray-500">Commission and net payout for each sold item, once the buyer pays.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {!payouts ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : payouts.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">No payouts yet</h4>
          <p className="text-sm">Payouts appear here once a buyer pays for one of your sold items.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {payouts.map((payout) => (
            <div key={payout.id} className="rounded-xl border border-royal/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-medium text-charcoal">
                    {payout.order.auction.item.title}
                  </h3>
                  <div className="mt-1 font-mono text-[11px] text-gray-500">
                    Created {formatDateTime(payout.createdAt)}
                  </div>
                </div>
                <PayoutStatusBadge status={payout.status} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 font-mono text-[13px]">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Gross (Winning Bid)</div>
                  <div className="font-semibold text-charcoal">{formatCurrency(payout.grossAmount)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Commission Deducted</div>
                  <div className="font-semibold text-red">−{formatCurrency(payout.commissionAmount)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Net Payout</div>
                  <div className="font-semibold text-royal">{formatCurrency(payout.netAmount)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
