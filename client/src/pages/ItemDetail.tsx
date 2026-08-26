import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Emblem } from '../components/Emblem'
import { StatusBadge } from '../components/StatusBadge'
import { getItem, type ItemDetail as ItemDetailType } from '../lib/api'
import { formatCountdown, formatCurrency, formatDateTime } from '../lib/format'

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<ItemDetailType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setItem(null)
    setError(null)
    getItem(id).catch((err) => setError(err.message)).then((result) => {
      if (result) setItem(result)
    })
  }, [id])

  if (error) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-20 text-center">
        <h1 className="mb-3 font-display text-2xl text-royal">Lot not found</h1>
        <p className="mb-6 text-sm text-gray-500">{error}</p>
        <Link to="/browse" className="text-sm font-semibold text-royal hover:text-deepblue">
          ← Back to Browse
        </Link>
      </div>
    )
  }

  if (!item) {
    return <div className="mx-auto max-w-[1240px] px-6 py-20 text-sm text-gray-500">Loading…</div>
  }

  const { auction } = item
  const price = auction?.currentBid ?? auction?.startingBid
  const priceLabel = auction?.currentBid ? 'Current Bid' : 'Starting Bid'
  const nextMin = auction ? Number(price) + Number(auction.bidIncrement) : null

  return (
    <div className="bg-white pb-20">
      <div className="mx-auto max-w-[1240px] px-6 pt-6">
        <div className="mb-2 font-mono text-[11px] text-gray-500">
          <Link to="/" className="hover:text-royal">
            Home
          </Link>{' '}
          / <Link to="/browse" className="hover:text-royal">Auctions</Link> / {item.title}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-11 px-6 pt-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex aspect-[1.3/1] items-center justify-center overflow-hidden rounded-xl border border-royal/10 bg-gradient-to-br from-[#F6F3EC] to-ivory">
            <Emblem className="h-3/5 w-3/5" />
          </div>

          <div className="mt-6">
            {auction && <StatusBadge status={auction.status} />}
            <h1 className="mt-3 mb-2 font-display text-[clamp(24px,3vw,32px)] font-medium text-royal">
              {item.title}
            </h1>
            <div className="font-mono text-xs text-gray-500">
              {item.category.name} · Sold by {item.seller.name}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 border-t border-gray-100 pt-7 sm:grid-cols-2">
            <SpecRow label="Category" value={item.category.name} />
            <SpecRow label="Year" value={item.year ?? '—'} />
            <SpecRow label="Material" value={item.material ?? '—'} />
            <SpecRow label="Condition" value={item.condition ?? '—'} />
          </div>

          <p className="mt-6 leading-relaxed text-charcoal">{item.description}</p>

          <div className="mt-8">
            <h5 className="mb-3.5 font-mono text-[11px] tracking-wider text-gray-500 uppercase">Bid History</h5>
            <div className="overflow-hidden rounded-lg border border-royal/10">
              {!auction || auction.bids.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No bids placed yet.</div>
              ) : (
                auction.bids.map((bid) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-[13px] last:border-b-0"
                  >
                    <span className="font-semibold">{bid.user.name}</span>
                    <span className="font-mono font-semibold text-royal">{formatCurrency(bid.amount)}</span>
                    <span className="font-mono text-[11px] text-gray-500">{formatDateTime(bid.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          {auction ? (
            <div className="sticky top-24 rounded-xl border border-royal/10 bg-white p-6 shadow-[0_1px_2px_rgba(23,59,112,0.04),0_8px_24px_-12px_rgba(23,59,112,0.14)]">
              <div className="mb-4">
                <div className="font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">{priceLabel}</div>
                <div className="font-mono text-[38px] font-semibold text-royal">{formatCurrency(price!)}</div>
              </div>

              {nextMin && (
                <div className="mb-[18px] text-[12.5px] text-gray-500">
                  Minimum next bid:{' '}
                  <b className="font-mono text-royal">{formatCurrency(nextMin)}</b>
                </div>
              )}

              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-gold/40 bg-white p-3.5">
                  <div className="mb-1 font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">
                    {auction.status === 'upcoming' ? 'Starts In' : 'Time Left'}
                  </div>
                  <div className="font-mono text-base font-semibold text-royal">
                    {auction.status === 'upcoming' ? formatCountdown(auction.startTime) : formatCountdown(auction.endTime)}
                  </div>
                </div>
                <div className="rounded-lg border border-gold/40 bg-white p-3.5">
                  <div className="mb-1 font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">Bid Increment</div>
                  <div className="font-mono text-base font-semibold text-royal">
                    {formatCurrency(auction.bidIncrement)}
                  </div>
                </div>
              </div>

              <button
                disabled={auction.status !== 'live'}
                className="w-full rounded-lg bg-royal px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-deepblue disabled:cursor-not-allowed disabled:opacity-50"
              >
                {auction.status === 'live'
                  ? 'Place Bid'
                  : auction.status === 'upcoming'
                    ? 'Auction Not Started'
                    : 'Auction Ended'}
              </button>

              <div className="mt-4 flex justify-between border-t border-gray-100 pt-3.5 font-mono text-[11.5px] text-gray-500">
                <span>Starts {formatDateTime(auction.startTime)}</span>
                <span>Ends {formatDateTime(auction.endTime)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-royal/10 bg-white p-6 text-center text-sm text-gray-500">
              No auction has been scheduled for this item yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SpecRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b border-dashed border-gray-200 pb-2 text-[13px]">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
