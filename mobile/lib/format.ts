import type { AuctionSummary } from './api'

// Mirrors client/src/lib/format.ts — same backend, same currency, same
// countdown math. formatCountdown is computed once at render time (not a
// ticking interval) — matching the brief for this phase: plain static text,
// live-updating countdowns are their own later phase once real-time is added.
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatCurrency(value: string | number) {
  return currencyFormatter.format(Number(value))
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCountdown(target: string) {
  const diff = new Date(target).getTime() - Date.now()
  if (diff <= 0) return 'Ended'

  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// The one place that decides what price label + amount an item's card and
// detail screen show, driven by the auction's actual status rather than by
// "does currentBid happen to be set" — a live auction with zero bids so far
// still reads "Current Bid" (its current bid is simply the starting price
// until someone bids), an upcoming auction always reads "Starting Bid," and
// an ended auction reads "Sold For" the final amount if it has a winner or
// "Unsold" with no amount otherwise. Shared by ItemCard and the Item Detail
// screen so this logic only lives in one place.
export function getPriceDisplay(auction: AuctionSummary | null): { label: string; amount: string | number | null } {
  if (!auction) return { label: 'Starting Bid', amount: null }

  switch (auction.status) {
    case 'live':
      return { label: 'Current Bid', amount: auction.currentBid ?? auction.startingBid }
    case 'upcoming':
      return { label: 'Starting Bid', amount: auction.startingBid }
    case 'ended':
      return auction.winner
        ? { label: 'Sold For', amount: auction.currentBid ?? auction.startingBid }
        : { label: 'Unsold', amount: null }
  }
}
