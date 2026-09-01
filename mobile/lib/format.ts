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
