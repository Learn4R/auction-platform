import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Emblem } from '../components/Emblem'
import { StatusBadge } from '../components/StatusBadge'
import {
  getItem,
  placeBid as apiPlaceBid,
  setMaxBid as apiSetMaxBid,
  type AuctionDetail,
  type Bid,
  type ItemDetail as ItemDetailType,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCountdownPrecise, formatCurrency, formatDateTime } from '../lib/format'
import { getSocket } from '../lib/socket'

function minNextBid(auction: AuctionDetail) {
  return auction.currentBid === null
    ? Number(auction.startingBid)
    : Number(auction.currentBid) + Number(auction.bidIncrement)
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, token } = useAuth()
  const [item, setItem] = useState<ItemDetailType | null>(null)
  const [auction, setAuction] = useState<AuctionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)

  const [bidInput, setBidInput] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [bidError, setBidError] = useState<string | null>(null)
  const [bidBusy, setBidBusy] = useState(false)

  const [showMaxBid, setShowMaxBid] = useState(false)
  const [maxBidInput, setMaxBidInput] = useState('')
  const [maxBidError, setMaxBidError] = useState<string | null>(null)
  const [maxBidBusy, setMaxBidBusy] = useState(false)
  const [maxBidSaved, setMaxBidSaved] = useState<string | null>(null)

  const [notice, setNotice] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    if (!id) return
    setItem(null)
    setAuction(null)
    setError(null)
    getItem(id)
      .then((result) => {
        setItem(result)
        setAuction(result.auction)
      })
      .catch((err) => setError(err.message))
  }, [id])

  // Re-render every second so countdowns stay live without a page refresh.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!auction?.id) return
    const auctionId = auction.id
    const socket = getSocket()
    socket.emit('join-auction', auctionId)

    function onBid(payload: { bid: Bid; currentBid: string; endTime: string }) {
      setAuction((prev) =>
        prev ? { ...prev, currentBid: payload.currentBid, endTime: payload.endTime, bids: [payload.bid, ...prev.bids] } : prev,
      )
    }
    function onExtended(payload: { endTime: string }) {
      setAuction((prev) => (prev ? { ...prev, endTime: payload.endTime } : prev))
      setNotice('Anti-snipe triggered — auction extended by 30 seconds.')
      setTimeout(() => setNotice(null), 5000)
    }
    function onStarted() {
      setAuction((prev) => (prev ? { ...prev, status: 'live' } : prev))
    }
    function onEnded(payload: { winner: { id: string; name: string } | null }) {
      setAuction((prev) => (prev ? { ...prev, status: 'ended', winner: payload.winner } : prev))
    }

    socket.on('auction:bid', onBid)
    socket.on('auction:extended', onExtended)
    socket.on('auction:started', onStarted)
    socket.on('auction:ended', onEnded)

    return () => {
      socket.emit('leave-auction', auctionId)
      socket.off('auction:bid', onBid)
      socket.off('auction:extended', onExtended)
      socket.off('auction:started', onStarted)
      socket.off('auction:ended', onEnded)
    }
  }, [auction?.id])

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

  const price = auction?.currentBid ?? auction?.startingBid
  const priceLabel = auction?.currentBid ? 'Current Bid' : 'Starting Bid'
  const nextMin = auction ? minNextBid(auction) : null

  const leaderId = auction?.bids[0]?.user.id ?? null
  const hasBid = !!user && !!auction?.bids.some((b) => b.user.id === user.id)
  const isWinning = !!user && leaderId === user.id
  const isOutbid = hasBid && !isWinning && auction?.status === 'live'

  async function handleConfirmBid() {
    if (!token || !auction) return
    setBidBusy(true)
    setBidError(null)
    try {
      await apiPlaceBid(auction.id, Number(bidInput), token)
      setBidInput('')
      setConfirming(false)
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'Failed to place bid')
    } finally {
      setBidBusy(false)
    }
  }

  async function handleSetMaxBid() {
    if (!token || !auction) return
    setMaxBidBusy(true)
    setMaxBidError(null)
    setMaxBidSaved(null)
    try {
      const result = await apiSetMaxBid(auction.id, Number(maxBidInput), token)
      setMaxBidSaved(`Maximum bid of ${formatCurrency(result.amount)} saved. We'll auto-bid on your behalf up to this amount.`)
      setMaxBidInput('')
    } catch (err) {
      setMaxBidError(err instanceof Error ? err.message : 'Failed to set maximum bid')
    } finally {
      setMaxBidBusy(false)
    }
  }

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
                  className={`h-16 w-16 flex-none overflow-hidden rounded-lg border-2 transition ${
                    i === activeImage ? 'border-gold' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2.5">
              {auction && <StatusBadge status={auction.status} />}
              {isWinning && (
                <span className="inline-flex items-center rounded-full bg-green/10 px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider text-green uppercase">
                  You're Winning
                </span>
              )}
              {isOutbid && (
                <span className="inline-flex items-center rounded-full bg-red/10 px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider text-red uppercase">
                  Outbid
                </span>
              )}
              {auction?.status === 'ended' && auction.winner && (
                <span className="inline-flex items-center rounded-full bg-green/10 px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider text-green uppercase">
                  Won by {auction.winner.id === user?.id ? 'you' : auction.winner.name}
                </span>
              )}
            </div>
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

        <div>
          {auction?.status === 'ended' ? (
            <div className="sticky top-24 rounded-xl border border-royal/10 bg-white p-6 shadow-[0_1px_2px_rgba(23,59,112,0.04),0_8px_24px_-12px_rgba(23,59,112,0.14)]">
              <div className="mb-5">
                <div className="font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">Final Sale Price</div>
                <div className="font-mono text-[38px] font-semibold text-royal">{formatCurrency(price!)}</div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-gold/40 bg-white p-3.5">
                  <div className="mb-1 font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">Total Bids</div>
                  <div className="font-mono text-base font-semibold text-royal">{auction.bids.length}</div>
                </div>
                <div className="rounded-lg border border-gold/40 bg-white p-3.5">
                  <div className="mb-1 font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">Starting Bid</div>
                  <div className="font-mono text-base font-semibold text-royal">
                    {formatCurrency(auction.startingBid)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-3.5 text-center text-[12.5px] text-gray-500">
                This auction ended {formatDateTime(auction.endTime)}.
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3.5 text-center">
                <Link to="/archive" className="text-[12.5px] font-semibold text-royal hover:text-deepblue">
                  ← Browse the Auction Archive
                </Link>
              </div>
            </div>
          ) : auction ? (
            <div className="sticky top-24 rounded-xl border border-royal/10 bg-white p-6 shadow-[0_1px_2px_rgba(23,59,112,0.04),0_8px_24px_-12px_rgba(23,59,112,0.14)]">
              {notice && (
                <div className="mb-4 rounded-lg border border-gold/40 bg-gold/10 p-3 text-[12.5px] font-semibold text-[#8a6e18]">
                  {notice}
                </div>
              )}

              <div className="mb-4">
                <div className="font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">{priceLabel}</div>
                <div className="font-mono text-[38px] font-semibold text-royal">{formatCurrency(price!)}</div>
              </div>

              {nextMin !== null && auction.status === 'live' && (
                <div className="mb-[18px] text-[12.5px] text-gray-500">
                  Minimum next bid: <b className="font-mono text-royal">{formatCurrency(nextMin)}</b>
                </div>
              )}

              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-gold/40 bg-white p-3.5">
                  <div className="mb-1 font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">
                    {auction.status === 'upcoming' ? 'Starts In' : 'Time Left'}
                  </div>
                  <div className="font-mono text-base font-semibold text-royal">
                    {auction.status === 'upcoming'
                      ? formatCountdownPrecise(auction.startTime)
                      : formatCountdownPrecise(auction.endTime)}
                  </div>
                </div>
                <div className="rounded-lg border border-gold/40 bg-white p-3.5">
                  <div className="mb-1 font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">Bid Increment</div>
                  <div className="font-mono text-base font-semibold text-royal">
                    {formatCurrency(auction.bidIncrement)}
                  </div>
                </div>
              </div>

              {auction.status === 'upcoming' ? (
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-lg bg-royal px-6 py-3.5 text-[15px] font-semibold text-white opacity-50"
                >
                  Auction Not Started
                </button>
              ) : !user ? (
                <Link
                  to="/login"
                  className="block w-full rounded-lg bg-royal px-6 py-3.5 text-center text-[15px] font-semibold text-white transition hover:bg-deepblue"
                >
                  Log In to Bid
                </Link>
              ) : !confirming ? (
                <>
                  <div className="flex gap-2.5">
                    <input
                      type="number"
                      placeholder={String(nextMin)}
                      value={bidInput}
                      onChange={(e) => setBidInput(e.target.value)}
                      className="input min-w-0 flex-1 font-mono text-base font-semibold text-royal"
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
                      className="rounded-lg bg-royal px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-deepblue"
                    >
                      Bid
                    </button>
                  </div>
                  <button
                    onClick={() => setShowMaxBid((v) => !v)}
                    className="mt-2.5 block text-[12.5px] font-semibold text-deepblue hover:text-royal"
                  >
                    {showMaxBid ? 'Hide maximum bid' : 'Set a maximum bid →'}
                  </button>
                </>
              ) : (
                <div className="rounded-lg border border-gold/40 bg-ivory p-4">
                  <div className="mb-1 text-[12.5px] text-gray-500">Confirm your bid of</div>
                  <div className="mb-3 font-mono text-2xl font-semibold text-royal">{formatCurrency(bidInput)}</div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={handleConfirmBid}
                      disabled={bidBusy}
                      className="flex-1 rounded-lg bg-royal px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
                    >
                      {bidBusy ? 'Placing…' : 'Confirm Bid'}
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={bidBusy}
                      className="rounded-lg border border-royal/20 px-4 py-2.5 text-[13.5px] font-semibold text-charcoal transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {bidError && <p className="mt-2.5 text-[12.5px] text-red">{bidError}</p>}

              {user && auction.status === 'live' && showMaxBid && !confirming && (
                <div className="mt-4 rounded-lg border border-royal/10 bg-ivory p-3.5">
                  <div className="mb-2 text-[12px] text-gray-500">
                    We'll automatically bid the minimum needed to keep you winning, up to this amount. Other bidders
                    never see it.
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Your maximum"
                      value={maxBidInput}
                      onChange={(e) => setMaxBidInput(e.target.value)}
                      className="input min-w-0 flex-1 font-mono text-sm font-semibold text-royal"
                    />
                    <button
                      onClick={handleSetMaxBid}
                      disabled={maxBidBusy || !maxBidInput}
                      className="rounded-lg bg-deepblue px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-royal disabled:opacity-50"
                    >
                      {maxBidBusy ? 'Saving…' : 'Set Max'}
                    </button>
                  </div>
                  {maxBidError && <p className="mt-2 text-[12px] text-red">{maxBidError}</p>}
                  {maxBidSaved && <p className="mt-2 text-[12px] text-green">{maxBidSaved}</p>}
                </div>
              )}

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
