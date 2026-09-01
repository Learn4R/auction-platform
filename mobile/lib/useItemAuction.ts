import { useEffect, useState } from 'react'
import {
  getItem,
  placeBid as apiPlaceBid,
  setMaxBid as apiSetMaxBid,
  type AuctionDetail,
  type Bid,
  type ItemDetail,
} from './api'
import { useAuth } from './auth'
import { formatCurrency } from './format'
import { getSocket } from './socket'

export function minNextBid(auction: { currentBid: string | null; startingBid: string; bidIncrement: string }) {
  return auction.currentBid === null
    ? Number(auction.startingBid)
    : Number(auction.currentBid) + Number(auction.bidIncrement)
}

/**
 * Shared data + socket + bidding logic for a single item/auction — mirrors
 * client/src/lib/useItemAuction.ts exactly, so the plain Item Detail screen
 * and the dedicated Live Auction screen both work off the same real-time
 * state and bid/max-bid flow instead of reimplementing the Socket.io wiring.
 */
export function useItemAuction(id: string | undefined) {
  const { user, token } = useAuth()
  const [item, setItem] = useState<ItemDetail | null>(null)
  const [auction, setAuction] = useState<AuctionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const [watcherCount, setWatcherCount] = useState<number | null>(null)

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
  const [justExtended, setJustExtended] = useState(false)

  useEffect(() => {
    if (!id) return
    setItem(null)
    setAuction(null)
    setError(null)
    setWatcherCount(null)
    getItem(id)
      .then((result) => {
        setItem(result)
        setAuction(result.auction)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load this item'))
  }, [id])

  // Re-render every second so the countdown stays live without a refresh.
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
      setJustExtended(true)
      setTimeout(() => setNotice(null), 5000)
      setTimeout(() => setJustExtended(false), 3000)
    }
    function onStarted() {
      setAuction((prev) => (prev ? { ...prev, status: 'live' } : prev))
    }
    function onEnded(payload: { winner: { id: string; name: string } | null }) {
      setAuction((prev) => (prev ? { ...prev, status: 'ended', winner: payload.winner } : prev))
    }
    function onWatchers(payload: { auctionId: string; count: number }) {
      if (payload.auctionId === auctionId) setWatcherCount(payload.count)
    }

    socket.on('auction:bid', onBid)
    socket.on('auction:extended', onExtended)
    socket.on('auction:started', onStarted)
    socket.on('auction:ended', onEnded)
    socket.on('auction:watchers', onWatchers)

    return () => {
      socket.emit('leave-auction', auctionId)
      socket.off('auction:bid', onBid)
      socket.off('auction:extended', onExtended)
      socket.off('auction:started', onStarted)
      socket.off('auction:ended', onEnded)
      socket.off('auction:watchers', onWatchers)
    }
  }, [auction?.id])

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

  return {
    user,
    item,
    auction,
    error,
    watcherCount,
    price,
    priceLabel,
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
  }
}
