import { Link } from 'react-router-dom'
import type { ItemSummary } from '../lib/api'
import { formatCountdown, formatCurrency } from '../lib/format'
import { Emblem } from './Emblem'
import { StatusBadge } from './StatusBadge'
import { WatchlistButton } from './WatchlistButton'

export interface QuickBidState {
  minNextBid: number
  busy: boolean
  myStatus: 'winning' | 'outbid' | null
  message: { type: 'success' | 'error'; text: string } | null
}

export function ItemCard({
  item,
  quickBid,
  onQuickBid,
}: {
  item: ItemSummary
  quickBid?: QuickBidState
  onQuickBid?: () => void
}) {
  const { auction } = item
  const price = auction?.currentBid ?? auction?.startingBid
  const priceLabel = auction?.currentBid ? 'Current Bid' : 'Starting Bid'

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-royal/10 bg-white transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[0_4px_8px_rgba(23,59,112,0.05),0_20px_40px_-16px_rgba(23,59,112,0.20)]">
      <Link to={`/items/${item.id}`} className="flex flex-1 flex-col">
        <div className="relative flex aspect-[1.15/1] items-center justify-center overflow-hidden bg-gradient-to-br from-[#F6F3EC] to-ivory">
          {item.images.length > 0 ? (
            <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <Emblem item={item} className="h-2/3 w-2/3" />
          )}
          {auction && (
            <div className="absolute top-3 left-3">
              <StatusBadge status={auction.status} />
            </div>
          )}
          <WatchlistButton itemId={item.id} className="absolute top-2.5 right-2.5" />
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <div className="font-mono text-[10px] tracking-wider text-deepblue uppercase">
            {item.category.name}
          </div>
          <h3 className="font-display text-[16.5px] leading-snug font-medium text-charcoal">
            {item.title}
          </h3>
          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <div>
              <div className="font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">
                {priceLabel}
              </div>
              <div className="font-mono text-[17px] font-semibold text-royal">
                {price ? formatCurrency(price) : '—'}
              </div>
            </div>
            {auction && auction.status !== 'ended' && (
              <div
                className={`font-mono text-xs font-semibold ${auction.status === 'live' ? 'text-red' : 'text-deepblue'}`}
              >
                {auction.status === 'live' ? formatCountdown(auction.endTime) : formatCountdown(auction.startTime)}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 text-[11.5px] text-gray-500">
            <span>{item.seller.name}</span>
            {auction && <span className="font-mono">{auction._count.bids} bids</span>}
          </div>
        </div>
      </Link>

      {quickBid && auction?.status === 'live' && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onQuickBid}
              disabled={quickBid.busy}
              className="flex-1 rounded-lg bg-gold px-3 py-2 text-[12.5px] font-bold text-royal transition hover:bg-gold/90 disabled:opacity-50"
            >
              {quickBid.busy ? 'Placing…' : `Quick Bid ${formatCurrency(quickBid.minNextBid)}`}
            </button>
            {quickBid.myStatus && (
              <span
                className={`flex-none rounded-full px-2 py-1 font-mono text-[10px] font-semibold tracking-wider uppercase ${
                  quickBid.myStatus === 'winning' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                }`}
              >
                {quickBid.myStatus === 'winning' ? 'Winning' : 'Outbid'}
              </span>
            )}
          </div>
          {quickBid.message && (
            <p className={`mt-1.5 text-[11.5px] ${quickBid.message.type === 'error' ? 'text-red' : 'text-green'}`}>
              {quickBid.message.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
