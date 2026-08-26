import type { ItemStatus } from '../lib/api'

const STYLES: Record<ItemStatus, string> = {
  draft: 'bg-gray-100 text-gray-500',
  pending: 'bg-gold/10 text-[#8a6e18]',
  approved: 'bg-green/10 text-green',
  rejected: 'bg-red/10 text-red',
}

const LABELS: Record<ItemStatus, string> = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider uppercase ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  )
}
