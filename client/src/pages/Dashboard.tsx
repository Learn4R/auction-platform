import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Emblem } from '../components/Emblem'
import { ItemCard, type QuickBidState } from '../components/ItemCard'
import { OrdersPanel } from '../components/OrdersPanel'
import {
  getDashboardOverview,
  getMyBids,
  getWatchlist,
  placeBid,
  type DashboardOverview,
  type ItemSummary,
  type MyBidRow,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCountdownPrecise, formatCurrency, formatDateTime } from '../lib/format'
import { getSocket } from '../lib/socket'
import { minNextBid } from '../lib/useItemAuction'

const TABS = ['bids', 'watchlist', 'won', 'lost'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  bids: 'My Bids',
  watchlist: 'Watchlist',
  won: 'Won Auctions',
  lost: 'Auctions Lost',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('bids')

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <h1 className="mb-2 font-display text-3xl text-royal">My Dashboard</h1>
      <p className="mb-8 text-sm text-gray-500">Your bids, saved lots, and won auctions in one place.</p>

      <Overview onNavigate={setTab} />

      <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-royal/10">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-1 pb-3 text-[14px] font-semibold whitespace-nowrap ${tab === t ? 'border-gold text-royal' : 'border-transparent text-gray-500 hover:text-royal'}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'bids' && <MyBids />}
      {tab === 'watchlist' && <Watchlist />}
      {tab === 'won' && <OrdersPanel />}
      {tab === 'lost' && <AuctionsLost />}
    </div>
  )
}

function KpiCard({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-royal/10 bg-white px-5 py-4 text-left transition hover:border-gold/50 hover:shadow-sm"
    >
      <div className="font-mono text-[10.5px] font-semibold tracking-wider text-gray-500 uppercase">{label}</div>
      <div className="mt-1 font-display text-2xl text-royal">{value}</div>
    </button>
  )
}

function Overview({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { token } = useAuth()
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getDashboardOverview(token)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token])

  if (error) return null
  if (!data) {
    return (
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-xl border border-royal/10 bg-gray-50" />
        ))}
      </div>
    )
  }

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard label="Active Bids" value={String(data.activeBids)} onClick={() => onNavigate('bids')} />
      <KpiCard label="Auctions Won" value={String(data.auctionsWon)} onClick={() => onNavigate('won')} />
      <KpiCard label="Auctions Lost" value={String(data.auctionsLost)} onClick={() => onNavigate('lost')} />
      <KpiCard label="Watchlist" value={String(data.watchlistCount)} onClick={() => onNavigate('watchlist')} />
      <KpiCard
        label="Pending Payments"
        value={data.pendingPaymentsCount > 0 ? formatCurrency(data.pendingPaymentsTotal) : '—'}
        onClick={() => onNavigate('won')}
      />
    </div>
  )
}

function StatusPill({ status, isWinning }: { status: MyBidRow['status']; isWinning: boolean }) {
  if (status === 'ended') {
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider uppercase ${
          isWinning ? 'bg-green/10 text-green' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {isWinning ? 'Won' : 'Lost'}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider uppercase ${
        isWinning ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
      }`}
    >
      {isWinning ? 'Winning' : 'Outbid'}
    </span>
  )
}

function MyBids() {
  const { token } = useAuth()
  const [rows, setRows] = useState<MyBidRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!token) return
    getMyBids(token)
      .then(setRows)
      .catch((err) => setError(err.message))
  }, [token])

  // Keep the "Ends In" countdown live for anything still running.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  if (error) return <p className="text-sm text-red">{error}</p>
  if (!rows) return <p className="text-sm text-gray-500">Loading…</p>
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
        <h4 className="mb-2 font-display text-lg text-royal">No bids yet</h4>
        <p className="text-sm">Bids you place on live auctions will show up here.</p>
      </div>
    )
  }

  return (
    <>
      {/* Table on md+ — below that, a shrunk table can't show every column
          without horizontal scrolling, so mobile gets the same stacked-card
          treatment already working on My Listings. */}
      <div className="hidden overflow-x-auto rounded-xl border border-royal/10 bg-white md:block">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 font-mono text-[10.5px] tracking-wider text-gray-500 uppercase">
              <th className="px-5 py-3">Item</th>
              <th className="px-5 py-3">Current Bid</th>
              <th className="px-5 py-3">My Highest Bid</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Ends In</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.auctionId} className="border-b border-gray-100 last:border-b-0">
                <td className="px-5 py-3.5">
                  <Link to={`/items/${row.item.id}`} className="font-medium text-charcoal hover:text-royal">
                    {row.item.title}
                  </Link>
                  <div className="font-mono text-[11px] text-gray-500">{row.item.category.name}</div>
                </td>
                <td className="px-5 py-3.5 font-mono text-charcoal">
                  {row.currentBid ? formatCurrency(row.currentBid) : '—'}
                </td>
                <td className="px-5 py-3.5 font-mono text-charcoal">{formatCurrency(row.myHighestBid)}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={row.status} isWinning={row.isWinning} />
                </td>
                <td className="px-5 py-3.5 font-mono text-[12.5px] text-gray-500">
                  {row.status === 'live' ? (
                    <span className="font-semibold text-red">{formatCountdownPrecise(row.endTime)}</span>
                  ) : row.status === 'ended' ? (
                    formatDateTime(row.endTime)
                  ) : (
                    'Not started'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {rows.map((row) => (
          <div key={row.auctionId} className="rounded-xl border border-royal/10 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] tracking-wider text-deepblue uppercase">
                  {row.item.category.name}
                </div>
                <Link
                  to={`/items/${row.item.id}`}
                  className="mt-1 block font-display text-lg font-medium text-charcoal hover:text-royal"
                >
                  {row.item.title}
                </Link>
              </div>
              <StatusPill status={row.status} isWinning={row.isWinning} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3 font-mono text-[12px] text-gray-500">
              <span>
                Current bid: <b className="text-charcoal">{row.currentBid ? formatCurrency(row.currentBid) : '—'}</b>
              </span>
              <span>
                My highest: <b className="text-charcoal">{formatCurrency(row.myHighestBid)}</b>
              </span>
              <span className="col-span-2">
                Ends in:{' '}
                <b className={row.status === 'live' ? 'text-red' : 'text-charcoal'}>
                  {row.status === 'live'
                    ? formatCountdownPrecise(row.endTime)
                    : row.status === 'ended'
                      ? formatDateTime(row.endTime)
                      : 'Not started'}
                </b>
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function AuctionsLost() {
  const { token } = useAuth()
  const [rows, setRows] = useState<MyBidRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getMyBids(token)
      .then(setRows)
      .catch((err) => setError(err.message))
  }, [token])

  if (error) return <p className="text-sm text-red">{error}</p>
  if (!rows) return <p className="text-sm text-gray-500">Loading…</p>

  const lost = rows.filter((row) => row.isLost)

  if (lost.length === 0) {
    return (
      <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
        <h4 className="mb-2 font-display text-lg text-royal">No lost auctions</h4>
        <p className="text-sm">Auctions you bid on and didn't win will show up here.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-royal/10 bg-white">
      <table className="w-full text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 font-mono text-[10.5px] tracking-wider text-gray-500 uppercase">
            <th className="px-5 py-3">Item</th>
            <th className="px-5 py-3">Final Price</th>
            <th className="px-5 py-3">My Highest Bid</th>
            <th className="px-5 py-3">Won By</th>
            <th className="px-5 py-3">Ended</th>
          </tr>
        </thead>
        <tbody>
          {lost.map((row) => (
            <tr key={row.auctionId} className="border-b border-gray-100 last:border-b-0">
              <td className="px-5 py-3.5">
                <Link to={`/items/${row.item.id}`} className="font-medium text-charcoal hover:text-royal">
                  {row.item.title}
                </Link>
                <div className="font-mono text-[11px] text-gray-500">{row.item.category.name}</div>
              </td>
              <td className="px-5 py-3.5 font-mono text-charcoal">
                {row.currentBid ? formatCurrency(row.currentBid) : '—'}
              </td>
              <td className="px-5 py-3.5 font-mono text-charcoal">{formatCurrency(row.myHighestBid)}</td>
              <td className="px-5 py-3.5 text-charcoal">{row.winner?.name ?? '—'}</td>
              <td className="px-5 py-3.5 font-mono text-[12.5px] text-gray-500">{formatDateTime(row.endTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface WatchlistLiveState {
  currentBid: string | null
  bidsCount: number
  busy: boolean
  myStatus: 'winning' | 'outbid' | null
  message: { type: 'success' | 'error'; text: string } | null
}

function Watchlist() {
  const { token, user } = useAuth()
  const [items, setItems] = useState<ItemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Keyed by auctionId — tracks price/bidder state for live watchlist items
  // that quick-bidding and the real-time socket connection keep up to date
  // in place, without refetching the whole watchlist.
  const [live, setLive] = useState<Record<string, WatchlistLiveState>>({})

  useEffect(() => {
    if (!token) return
    getWatchlist(token)
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(() => {
    if (!items) return
    setLive((prev) => {
      const next = { ...prev }
      for (const item of items) {
        if (item.auction?.status === 'live' && !next[item.auction.id]) {
          next[item.auction.id] = {
            currentBid: item.auction.currentBid,
            bidsCount: item.auction._count.bids,
            busy: false,
            myStatus: null,
            message: null,
          }
        }
      }
      return next
    })
  }, [items])

  useEffect(() => {
    if (!items) return
    const liveAuctionIds = items.filter((i) => i.auction?.status === 'live').map((i) => i.auction!.id)
    if (liveAuctionIds.length === 0) return

    const socket = getSocket()
    for (const id of liveAuctionIds) socket.emit('join-auction', id)

    function onBid(payload: { auctionId: string; bid: { user: { id: string } }; currentBid: string }) {
      if (!liveAuctionIds.includes(payload.auctionId)) return
      setLive((prev) => {
        const existing = prev[payload.auctionId]
        if (!existing) return prev
        const iAmLeader = user?.id === payload.bid.user.id
        return {
          ...prev,
          [payload.auctionId]: {
            ...existing,
            currentBid: payload.currentBid,
            bidsCount: existing.bidsCount + 1,
            myStatus: iAmLeader ? 'winning' : existing.myStatus === 'winning' ? 'outbid' : existing.myStatus,
          },
        }
      })
    }
    socket.on('auction:bid', onBid)

    return () => {
      for (const id of liveAuctionIds) socket.emit('leave-auction', id)
      socket.off('auction:bid', onBid)
    }
  }, [items, user?.id])

  async function handleQuickBid(item: ItemSummary) {
    if (!token || !item.auction) return
    const auctionId = item.auction.id
    const state = live[auctionId]
    const amount = minNextBid({
      currentBid: state?.currentBid ?? item.auction.currentBid,
      startingBid: item.auction.startingBid,
      bidIncrement: item.auction.bidIncrement,
    })

    setLive((prev) => ({
      ...prev,
      [auctionId]: { ...prev[auctionId], busy: true, message: null },
    }))

    try {
      const result = await placeBid(auctionId, amount, token)
      // currentBid/bidsCount are left for the "auction:bid" socket handler
      // above to update — it fires for this bid too (we're joined to the
      // room), so updating both here and there would double-count bids.
      setLive((prev) => ({
        ...prev,
        [auctionId]: {
          ...prev[auctionId],
          busy: false,
          myStatus: result.leaderId === user?.id ? 'winning' : 'outbid',
          message: { type: 'success', text: `Bid placed: ${formatCurrency(amount)}` },
        },
      }))
    } catch (err) {
      setLive((prev) => ({
        ...prev,
        [auctionId]: {
          ...prev[auctionId],
          busy: false,
          message: { type: 'error', text: err instanceof Error ? err.message : 'Failed to place bid' },
        },
      }))
    }

    setTimeout(() => {
      setLive((prev) => {
        const current = prev[auctionId]
        if (!current) return prev
        return { ...prev, [auctionId]: { ...current, message: null } }
      })
    }, 4000)
  }

  if (error) return <p className="text-sm text-red">{error}</p>
  if (!items) return <p className="text-sm text-gray-500">Loading…</p>
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
        <Emblem className="mx-auto mb-4 h-14 w-14 opacity-40" />
        <h4 className="mb-2 font-display text-lg text-royal">Your watchlist is empty</h4>
        <p className="text-sm">
          Tap the heart on any lot to save it here.{' '}
          <Link to="/browse" className="font-semibold text-royal hover:text-deepblue">
            Browse auctions →
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const auctionId = item.auction?.status === 'live' ? item.auction.id : null
        const state = auctionId ? live[auctionId] : undefined
        const effectiveItem =
          auctionId && state && item.auction
            ? { ...item, auction: { ...item.auction, currentBid: state.currentBid, _count: { bids: state.bidsCount } } }
            : item
        const quickBid: QuickBidState | undefined =
          auctionId && item.auction
            ? {
                minNextBid: minNextBid({
                  currentBid: state?.currentBid ?? item.auction.currentBid,
                  startingBid: item.auction.startingBid,
                  bidIncrement: item.auction.bidIncrement,
                }),
                busy: state?.busy ?? false,
                myStatus: state?.myStatus ?? null,
                message: state?.message ?? null,
              }
            : undefined

        return (
          <ItemCard
            key={item.id}
            item={effectiveItem}
            quickBid={quickBid}
            onQuickBid={() => handleQuickBid(item)}
          />
        )
      })}
    </div>
  )
}
