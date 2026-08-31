import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Emblem } from '../components/Emblem'
import { RemindButton } from '../components/RemindButton'
import { WatchlistButton } from '../components/WatchlistButton'
import { getItems, type ItemSummary } from '../lib/api'
import { formatCountdownPrecise, formatDateTime } from '../lib/format'

export default function Upcoming() {
  const [items, setItems] = useState<ItemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    getItems({ status: 'upcoming' })
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  // Ticking every second both keeps the countdowns live and, since the
  // visible list is derived from "startTime is still in the future", drops
  // an item out the moment its countdown reaches zero — no refresh needed.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const now = Date.now()
  const visible = items?.filter((item) => item.auction && new Date(item.auction.startTime).getTime() > now) ?? null

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-14">
      <div className="mb-8">
        <h1 className="mb-2 font-display text-3xl text-royal">Upcoming Auctions</h1>
        <p className="text-sm text-gray-500">Mark your calendar, save a lot to your watchlist, or set a reminder.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {!visible ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <Emblem className="mx-auto mb-4 h-14 w-14 opacity-40" />
          <h4 className="mb-2 font-display text-lg text-royal">Nothing scheduled right now</h4>
          <p className="text-sm">
            Check back soon, or{' '}
            <Link to="/browse" className="font-semibold text-royal hover:text-deepblue">
              browse live auctions →
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <div
              key={item.id}
              className="flex flex-col overflow-hidden rounded-xl border border-royal/10 bg-white transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[0_4px_8px_rgba(23,59,112,0.05),0_20px_40px_-16px_rgba(23,59,112,0.20)]"
            >
              <Link to={`/items/${item.id}`} className="relative flex aspect-[1.15/1] items-center justify-center overflow-hidden bg-gradient-to-br from-[#F6F3EC] to-ivory">
                {item.images.length > 0 ? (
                  <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <Emblem item={item} className="h-2/3 w-2/3" />
                )}
                <WatchlistButton itemId={item.id} className="absolute top-2.5 right-2.5" />
              </Link>
              <div className="flex flex-1 flex-col gap-2.5 p-4">
                <div className="font-mono text-[10px] tracking-wider text-deepblue uppercase">
                  {item.category.name}
                </div>
                <Link to={`/items/${item.id}`} className="font-display text-[16.5px] leading-snug font-medium text-charcoal hover:text-royal">
                  {item.title}
                </Link>

                <div className="mt-1 rounded-lg border border-gold/40 bg-ivory p-3">
                  <div className="font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">Starts</div>
                  <div className="font-mono text-[13px] font-semibold text-charcoal">
                    {formatDateTime(item.auction!.startTime)}
                  </div>
                  <div className="mt-1 font-mono text-[12.5px] font-semibold text-deepblue">
                    Starts in {formatCountdownPrecise(item.auction!.startTime)}
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
                  <span className="text-[11.5px] text-gray-500">{item.seller.name}</span>
                  <RemindButton auctionId={item.auction!.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
