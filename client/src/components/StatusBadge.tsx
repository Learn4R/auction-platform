import type { AuctionStatus } from '../lib/api'

const STYLES: Record<AuctionStatus, string> = {
  live: 'bg-red/10 text-red',
  upcoming: 'bg-deepblue/10 text-deepblue',
  ended: 'bg-gray-100 text-gray-500',
}

const LABELS: Record<AuctionStatus, string> = {
  live: 'Live',
  upcoming: 'Upcoming',
  ended: 'Ended',
}

export function StatusBadge({ status }: { status: AuctionStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider uppercase ${STYLES[status]}`}
    >
      {status === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red" />}
      {LABELS[status]}
    </span>
  )
}
