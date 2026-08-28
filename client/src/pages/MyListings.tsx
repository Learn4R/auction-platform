import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ItemStatusBadge } from '../components/ItemStatusBadge'
import { PayoutStatusBadge } from '../components/OrderStatus'
import {
  getMyItems,
  getSellerDashboardSummary,
  getSellerPayouts,
  type ItemSubmission,
  type SellerDashboardSummary,
  type SellerPayout,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime } from '../lib/format'

export default function MyListings() {
  const { token } = useAuth()
  const [summary, setSummary] = useState<SellerDashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getSellerDashboardSummary(token)
      .then(setSummary)
      .catch((err) => setError(err.message))
  }, [token])

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 font-display text-3xl text-royal">Seller Dashboard</h1>
          <p className="text-sm text-gray-500">Your application status, performance, listings, and payouts in one place.</p>
        </div>
        <Link
          to="/sell"
          className="rounded-lg bg-royal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-deepblue"
        >
          + Sell an Item
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!summary ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <StatusBanner summary={summary} />
          {summary.sellerStatus === 'approved' && (
            <>
              <KpiCards summary={summary} />
              <ListingsSection />
              <PayoutsSection />
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatusBanner({ summary }: { summary: SellerDashboardSummary }) {
  if (summary.sellerStatus === 'approved') return null

  if (summary.sellerStatus === 'pending') {
    return (
      <div className="mb-8 rounded-xl border border-gold/40 bg-gold/5 p-5 text-[14px] text-[#8a6e18]">
        <b>Your seller application is under review.</b> We'll let you know as soon as a decision is made.
      </div>
    )
  }

  if (summary.sellerStatus === 'rejected') {
    return (
      <div className="mb-8 rounded-xl border border-red/30 bg-red/5 p-5 text-[14px] text-red">
        <b>Your seller application was rejected.</b>
        {summary.application?.rejectionReason && <p className="mt-1">{summary.application.rejectionReason}</p>}
        <Link to="/sell" className="mt-2 inline-block font-semibold underline">
          Reapply →
        </Link>
      </div>
    )
  }

  return (
    <div className="mb-8 rounded-xl border border-royal/10 bg-white p-5 text-[14px] text-charcoal">
      <b>You haven't applied to sell yet.</b> Apply to sell to start listing items for auction.
      <Link to="/sell" className="mt-2 block font-semibold text-royal underline">
        Apply to Sell →
      </Link>
    </div>
  )
}

function KpiCards({ summary }: { summary: SellerDashboardSummary }) {
  const cards = [
    { label: 'Active Auctions', value: summary.activeAuctions },
    { label: 'Sold Items', value: summary.soldItems },
    { label: 'Unsold Items', value: summary.unsoldItems },
    { label: 'Earnings', value: formatCurrency(summary.earnings) },
    { label: 'Pending Payout', value: formatCurrency(summary.pendingPayout) },
  ]

  return (
    <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gold/40 bg-white p-4">
          <div className="font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">{card.label}</div>
          <div className="mt-1 font-mono text-xl font-semibold text-royal">{card.value}</div>
        </div>
      ))}
    </div>
  )
}

function ListingsSection() {
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
    <div className="mb-14">
      <div className="mb-8">
        <h2 className="mb-2 font-display text-2xl text-royal">My Listings</h2>
        <p className="text-sm text-gray-500">Track the review status of every item you've submitted.</p>
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
    <div>
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
