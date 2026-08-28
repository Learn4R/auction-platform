import { useEffect, useMemo, useState } from 'react'
import { PayoutStatusBadge } from '../../components/OrderStatus'
import { getAdminPayouts, updatePayoutStatus, type AdminPayout, type PayoutStatus } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatCurrency, formatDateTime } from '../../lib/format'

const STATUS_OPTIONS: { value: PayoutStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'on_hold', label: 'On Hold' },
]

export default function Payouts() {
  const { token } = useAuth()
  const [payouts, setPayouts] = useState<AdminPayout[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getAdminPayouts(token)
      .then(setPayouts)
      .catch((err) => setError(err.message))
  }, [token])

  const totals = useMemo(() => {
    if (!payouts) return { pending: 0, paid: 0 }
    return payouts.reduce(
      (acc, p) => {
        if (p.status === 'paid') acc.paid += Number(p.netAmount)
        else acc.pending += Number(p.netAmount)
        return acc
      },
      { pending: 0, paid: 0 },
    )
  }, [payouts])

  async function handleStatusChange(id: string, status: PayoutStatus) {
    if (!token) return
    setBusyId(id)
    setError(null)
    try {
      const updated = await updatePayoutStatus(id, status, token)
      setPayouts((prev) => (prev ? prev.map((p) => (p.id === id ? updated : p)) : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payout status')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-royal">Payouts Ledger</h1>
      <p className="mb-6 text-sm text-gray-500">Every seller payout across the platform, with commission math.</p>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gold/40 bg-white p-4">
          <div className="font-mono text-[10px] tracking-wider text-gray-500 uppercase">Pending Payout</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-[#8a6e18]">
            {payouts ? formatCurrency(totals.pending) : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-gold/40 bg-white p-4">
          <div className="font-mono text-[10px] tracking-wider text-gray-500 uppercase">Already Paid</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-green">
            {payouts ? formatCurrency(totals.paid) : '—'}
          </div>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!payouts ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : payouts.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">No payouts yet</h4>
          <p className="text-sm">Payouts appear here once a buyer pays for a sold item.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {payouts.map((payout) => (
            <div key={payout.id} className="rounded-xl border border-royal/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] tracking-wider text-deepblue uppercase">
                    {payout.seller.name}
                  </div>
                  <h3 className="mt-1 font-display text-lg font-medium text-charcoal">
                    {payout.order.auction.item.title}
                  </h3>
                  <div className="mt-1 font-mono text-[11px] text-gray-500">
                    Buyer: {payout.order.buyer.name} · Created {formatDateTime(payout.createdAt)}
                  </div>
                </div>
                <PayoutStatusBadge status={payout.status} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4 font-mono text-[12px]">
                <span>
                  Gross: <b className="text-charcoal">{formatCurrency(payout.grossAmount)}</b>
                </span>
                <span>
                  Commission: <b className="text-red">−{formatCurrency(payout.commissionAmount)}</b>
                </span>
                <span>
                  Net: <b className="text-royal">{formatCurrency(payout.netAmount)}</b>
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
                <span className="text-[12.5px] text-gray-500">Status</span>
                <select
                  value={payout.status}
                  disabled={busyId === payout.id}
                  onChange={(e) => handleStatusChange(payout.id, e.target.value as PayoutStatus)}
                  className="input text-[13px]"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
