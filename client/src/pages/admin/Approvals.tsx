import { useEffect, useState } from 'react'
import {
  approveItem,
  getSubmittedItems,
  getUnderReviewItems,
  markItemUnderReview,
  rejectItem,
  requestItemChanges,
  type ItemSubmission,
} from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatCurrency, formatDateTime } from '../../lib/format'

const TABS = ['submitted', 'under_review'] as const
type Tab = (typeof TABS)[number]

export default function Approvals() {
  const { token } = useAuth()
  const [tab, setTab] = useState<Tab>('submitted')
  const [submitted, setSubmitted] = useState<ItemSubmission[] | null>(null)
  const [underReview, setUnderReview] = useState<ItemSubmission[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    if (!token) return
    getSubmittedItems(token).then(setSubmitted).catch((err) => setError(err.message))
    getUnderReviewItems(token).then(setUnderReview).catch((err) => setError(err.message))
  }

  useEffect(load, [token])

  function removeFromLists(id: string) {
    setSubmitted((prev) => prev?.filter((i) => i.id !== id) ?? null)
    setUnderReview((prev) => prev?.filter((i) => i.id !== id) ?? null)
  }

  async function handleMarkUnderReview(id: string) {
    if (!token) return
    setBusyId(id)
    setError(null)
    try {
      const updated = await markItemUnderReview(id, token)
      setSubmitted((prev) => prev?.filter((i) => i.id !== id) ?? null)
      setUnderReview((prev) => (prev ? [...prev, updated] : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark under review')
    } finally {
      setBusyId(null)
    }
  }

  async function handleApprove(id: string) {
    if (!token) return
    setBusyId(id)
    setError(null)
    try {
      await approveItem(id, token)
      removeFromLists(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: string) {
    if (!token) return
    const reason = window.prompt('Reason for rejecting this item:')
    if (!reason || !reason.trim()) return
    setBusyId(id)
    setError(null)
    try {
      await rejectItem(id, reason.trim(), token)
      removeFromLists(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRequestChanges(id: string) {
    if (!token) return
    const note = window.prompt('What changes should the seller make?')
    if (!note || !note.trim()) return
    setBusyId(id)
    setError(null)
    try {
      await requestItemChanges(id, note.trim(), token)
      removeFromLists(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request changes failed')
    } finally {
      setBusyId(null)
    }
  }

  const items = tab === 'submitted' ? submitted : underReview

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-royal">Item Approvals</h1>
      <p className="mb-6 text-sm text-gray-500">Review submitted lots before they go live for bidding.</p>

      <div className="mb-6 flex gap-1 border-b border-royal/10">
        <button
          onClick={() => setTab('submitted')}
          className={`border-b-2 px-1 pb-3 text-[14px] font-semibold ${tab === 'submitted' ? 'border-gold text-royal' : 'border-transparent text-gray-500 hover:text-royal'}`}
        >
          Submitted {submitted && `(${submitted.length})`}
        </button>
        <button
          onClick={() => setTab('under_review')}
          className={`ml-6 border-b-2 px-1 pb-3 text-[14px] font-semibold ${tab === 'under_review' ? 'border-gold text-royal' : 'border-transparent text-gray-500 hover:text-royal'}`}
        >
          Under Review {underReview && `(${underReview.length})`}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!items ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">Queue is empty</h4>
          <p className="text-sm">No items are waiting here right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-royal/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] tracking-wider text-deepblue uppercase">
                    {item.category?.name ?? 'No category'} · by {item.seller.name}
                  </div>
                  <h3 className="mt-1 font-display text-lg font-medium text-charcoal">{item.title}</h3>
                  <p className="mt-1.5 max-w-xl text-[13.5px] text-gray-500">{item.description}</p>
                </div>
                <div className="flex flex-shrink-0 flex-wrap justify-end gap-2">
                  {tab === 'submitted' && (
                    <button
                      onClick={() => handleMarkUnderReview(item.id)}
                      disabled={busyId === item.id}
                      className="rounded-lg border border-deepblue/40 px-4 py-2 text-[13px] font-semibold text-deepblue transition hover:bg-deepblue/5 disabled:opacity-50"
                    >
                      Mark Under Review
                    </button>
                  )}
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={busyId === item.id}
                    className="rounded-lg bg-green px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-green/90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRequestChanges(item.id)}
                    disabled={busyId === item.id}
                    className="rounded-lg border border-gold/50 px-4 py-2 text-[13px] font-semibold text-[#8a6e18] transition hover:bg-gold/5 disabled:opacity-50"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={busyId === item.id}
                    className="rounded-lg border border-red/40 px-4 py-2 text-[13px] font-semibold text-red transition hover:bg-red/5 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 border-t border-gray-100 pt-3 font-mono text-[12px] text-gray-500 sm:grid-cols-4">
                <span>
                  Starting bid: <b className="text-charcoal">{item.proposedStartingBid ? formatCurrency(item.proposedStartingBid) : '—'}</b>
                </span>
                <span>
                  Increment: <b className="text-charcoal">{item.proposedBidIncrement ? formatCurrency(item.proposedBidIncrement) : '—'}</b>
                </span>
                <span>
                  Starts: <b className="text-charcoal">{item.proposedStartTime ? formatDateTime(item.proposedStartTime) : '—'}</b>
                </span>
                <span>
                  Ends: <b className="text-charcoal">{item.proposedEndTime ? formatDateTime(item.proposedEndTime) : '—'}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
