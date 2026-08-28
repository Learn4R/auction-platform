import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Emblem } from '../components/Emblem'
import { ItemCard } from '../components/ItemCard'
import { OrdersPanel } from '../components/OrdersPanel'
import { getMyBids, getWatchlist, type ItemSummary, type MyBidRow } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCountdownPrecise, formatCurrency, formatDateTime } from '../lib/format'

const TABS = ['bids', 'watchlist', 'won'] as const
type Tab = (typeof TABS)[number]

export default function Dashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('bids')

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <h1 className="mb-2 font-display text-3xl text-royal">My Dashboard</h1>
      <p className="mb-8 text-sm text-gray-500">Your bids, saved lots, and won auctions in one place.</p>

      <div className="mb-8 flex gap-1 border-b border-royal/10">
        <button
          onClick={() => setTab('bids')}
          className={`border-b-2 px-1 pb-3 text-[14px] font-semibold ${tab === 'bids' ? 'border-gold text-royal' : 'border-transparent text-gray-500 hover:text-royal'}`}
        >
          My Bids
        </button>
        <button
          onClick={() => setTab('watchlist')}
          className={`ml-6 border-b-2 px-1 pb-3 text-[14px] font-semibold ${tab === 'watchlist' ? 'border-gold text-royal' : 'border-transparent text-gray-500 hover:text-royal'}`}
        >
          Watchlist
        </button>
        <button
          onClick={() => setTab('won')}
          className={`ml-6 border-b-2 px-1 pb-3 text-[14px] font-semibold ${tab === 'won' ? 'border-gold text-royal' : 'border-transparent text-gray-500 hover:text-royal'}`}
        >
          Won Auctions
        </button>
      </div>

      {tab === 'bids' && <MyBids />}
      {tab === 'watchlist' && <Watchlist />}
      {tab === 'won' && <OrdersPanel />}
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
    <div className="overflow-x-auto rounded-xl border border-royal/10 bg-white">
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
  )
}

function Watchlist() {
  const { token } = useAuth()
  const [items, setItems] = useState<ItemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getWatchlist(token)
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [token])

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
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
