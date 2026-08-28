import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Emblem } from '../components/Emblem'
import { ItemSpecs } from '../components/ItemSpecs'
import { SellerReviews } from '../components/SellerReviews'
import { WatchlistButton } from '../components/WatchlistButton'
import { formatCountdownPrecise, formatCurrency, formatDateTime } from '../lib/format'
import type { useItemAuction } from '../lib/useItemAuction'

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red" />
    </span>
  )
}

export default function LiveAuction({ state }: { state: ReturnType<typeof useItemAuction> }) {
  const {
    user,
    item,
    auction,
    watcherCount,
    price,
    nextMin,
    isWinning,
    isOutbid,
    notice,
    justExtended,
    bidInput,
    setBidInput,
    confirming,
    setConfirming,
    bidError,
    setBidError,
    bidBusy,
    handleConfirmBid,
    showMaxBid,
    setShowMaxBid,
    maxBidInput,
    setMaxBidInput,
    maxBidError,
    maxBidBusy,
    maxBidSaved,
    handleSetMaxBid,
  } = state
  const [activeImage, setActiveImage] = useState(0)

  if (!item || !auction) return null

  return (
    <div className="bg-white pb-20">
      {/* Stage: the immersive live-bidding hero */}
      <div className="bg-gradient-to-b from-[#0b1f42] to-royal text-white">
        <div className="mx-auto max-w-[1000px] px-6 pt-8 pb-10">
          <div className="mb-4 font-mono text-[11px] text-white/50">
            <Link to="/" className="hover:text-white">
              Home
            </Link>{' '}
            /{' '}
            <Link to="/browse" className="hover:text-white">
              Auctions
            </Link>{' '}
            / {item.title}
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 rounded-full bg-red/15 px-3.5 py-1.5">
              <LiveDot />
              <span className="font-mono text-[11.5px] font-bold tracking-[0.15em] text-red">LIVE NOW</span>
            </div>
            <WatchlistButton itemId={item.id} className="static" />
          </div>

          <h1 className="mb-1.5 font-display text-[clamp(26px,3.4vw,36px)] font-medium text-white">{item.title}</h1>
          <div className="mb-6 font-mono text-xs text-white/60">
            {item.category.name} · Sold by {item.seller.name}
          </div>

          {notice && (
            <div
              className={`mb-5 rounded-lg border border-gold/50 bg-gold/15 px-4 py-3 text-center text-[13.5px] font-semibold text-gold ${justExtended ? 'animate-pulse' : ''}`}
            >
              ⏱ {notice}
            </div>
          )}

          {isWinning && (
            <div className="mb-5 rounded-lg border border-green/40 bg-green/15 px-4 py-3 text-center text-[13.5px] font-semibold text-green">
              You are currently winning this lot
            </div>
          )}
          {isOutbid && (
            <div className="mb-5 rounded-lg border border-red/40 bg-red/15 px-4 py-3 text-center text-[13.5px] font-semibold text-red">
              You have been outbid — place a new bid to retake the lead
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/15 bg-white/5 p-5 text-center">
              <div className="mb-1.5 font-mono text-[10px] tracking-wider text-white/50 uppercase">Current Bid</div>
              <div className="font-mono text-[34px] leading-none font-bold text-gold">{formatCurrency(price!)}</div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-5 text-center">
              <div className="mb-1.5 font-mono text-[10px] tracking-wider text-white/50 uppercase">Time Left</div>
              <div className="font-mono text-[34px] leading-none font-bold text-white">
                {formatCountdownPrecise(auction.endTime)}
              </div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-5 text-center">
              <div className="mb-1.5 font-mono text-[10px] tracking-wider text-white/50 uppercase">Active Bidders</div>
              <div data-testid="active-bidder-count" className="font-mono text-[34px] leading-none font-bold text-white">
                {watcherCount ?? '—'}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[520px]">
            <div className="mb-3 text-center text-[13px] text-white/60">
              Minimum next bid: <b className="font-mono text-gold">{formatCurrency(nextMin ?? 0)}</b>
            </div>

            {!user ? (
              <Link
                to="/login"
                className="block w-full rounded-lg bg-gold px-6 py-4 text-center text-[15px] font-semibold text-royal transition hover:bg-gold/90"
              >
                Log In to Bid
              </Link>
            ) : !confirming ? (
              <>
                <div className="flex gap-2.5">
                  <input
                    type="number"
                    aria-label="Bid amount"
                    placeholder={String(nextMin)}
                    value={bidInput}
                    onChange={(e) => setBidInput(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3.5 font-mono text-lg font-semibold text-white placeholder:text-white/30 focus:border-gold focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setBidError(null)
                      if (!bidInput || Number(bidInput) < (nextMin ?? 0)) {
                        setBidError(`Enter at least ${formatCurrency(nextMin ?? 0)}`)
                        return
                      }
                      setConfirming(true)
                    }}
                    className="rounded-lg bg-gold px-7 py-3.5 text-[15px] font-bold text-royal transition hover:bg-gold/90"
                  >
                    Place Bid
                  </button>
                </div>
                <button
                  onClick={() => setShowMaxBid((v) => !v)}
                  className="mt-3 block w-full text-center text-[12.5px] font-semibold text-gold/90 hover:text-gold"
                >
                  {showMaxBid ? 'Hide maximum bid' : 'Set a maximum bid →'}
                </button>
              </>
            ) : (
              <div className="rounded-lg border border-gold/40 bg-white/10 p-5">
                <div className="mb-1 text-center text-[12.5px] text-white/60">Confirm your bid of</div>
                <div className="mb-4 text-center font-mono text-3xl font-bold text-gold">
                  {formatCurrency(bidInput)}
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={handleConfirmBid}
                    disabled={bidBusy}
                    className="flex-1 rounded-lg bg-gold px-4 py-3 text-[14px] font-bold text-royal transition hover:bg-gold/90 disabled:opacity-50"
                  >
                    {bidBusy ? 'Placing…' : 'Confirm Bid'}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={bidBusy}
                    className="rounded-lg border border-white/25 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {bidError && <p className="mt-2.5 text-center text-[12.5px] text-red">{bidError}</p>}

            {user && showMaxBid && !confirming && (
              <div className="mt-4 rounded-lg border border-white/15 bg-white/5 p-4">
                <div className="mb-2 text-[12px] text-white/60">
                  We'll automatically bid the minimum needed to keep you winning, up to this amount. Other bidders
                  never see it.
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Your maximum"
                    value={maxBidInput}
                    onChange={(e) => setMaxBidInput(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 font-mono text-sm font-semibold text-white placeholder:text-white/30 focus:border-gold focus:outline-none"
                  />
                  <button
                    onClick={handleSetMaxBid}
                    disabled={maxBidBusy || !maxBidInput}
                    className="rounded-lg bg-white/15 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-white/25 disabled:opacity-50"
                  >
                    {maxBidBusy ? 'Saving…' : 'Set Max'}
                  </button>
                </div>
                {maxBidError && <p className="mt-2 text-[12px] text-red">{maxBidError}</p>}
                {maxBidSaved && <p className="mt-2 text-[12px] text-green">{maxBidSaved}</p>}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center gap-6 font-mono text-[11px] text-white/40">
            <span>Started {formatDateTime(auction.startTime)}</span>
            <span>Increment {formatCurrency(auction.bidIncrement)}</span>
          </div>
        </div>
      </div>

      {/* Item context + live bid history */}
      <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-10 px-6 pt-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="relative flex aspect-[1.5/1] items-center justify-center overflow-hidden rounded-xl border border-royal/10 bg-gradient-to-br from-[#F6F3EC] to-ivory">
            {item.images.length > 0 ? (
              <img
                src={item.images[activeImage] ?? item.images[0]}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <Emblem className="h-3/5 w-3/5" />
            )}
          </div>
          {item.images.length > 1 && (
            <div className="mt-3 flex gap-2.5">
              {item.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveImage(i)}
                  className={`h-14 w-14 flex-none overflow-hidden rounded-lg border-2 transition ${
                    i === activeImage ? 'border-gold' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-gray-100 pt-6">
            <ItemSpecs item={item} />
          </div>

          <p className="mt-6 leading-relaxed text-charcoal">{item.description}</p>

          {item.provenance && (
            <div className="mt-6">
              <h5 className="mb-2 font-mono text-[11px] tracking-wider text-gray-500 uppercase">Provenance</h5>
              <p className="leading-relaxed text-charcoal">{item.provenance}</p>
            </div>
          )}

          <SellerReviews sellerId={item.seller.id} sellerName={item.seller.name} />
        </div>

        <div>
          <h5 className="mb-3.5 font-mono text-[11px] tracking-wider text-gray-500 uppercase">Live Bid History</h5>
          <div className="sticky top-24 max-h-[70vh] overflow-y-auto rounded-lg border border-royal/10">
            {auction.bids.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No bids placed yet. Be the first.</div>
            ) : (
              auction.bids.map((bid, i) => (
                <div
                  key={bid.id}
                  className={`flex items-center justify-between border-b border-gray-100 px-4 py-3 text-[13px] last:border-b-0 ${i === 0 ? 'bg-gold/5' : ''}`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    {bid.user.name}
                    {bid.isProxy && (
                      <span className="rounded-full bg-gold/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#8a6e18]">
                        AUTO
                      </span>
                    )}
                  </span>
                  <span className="font-mono font-semibold text-royal">{formatCurrency(bid.amount)}</span>
                  <span className="font-mono text-[11px] text-gray-500">{formatDateTime(bid.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
