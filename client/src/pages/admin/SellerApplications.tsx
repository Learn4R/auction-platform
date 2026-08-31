import { useEffect, useState } from 'react'
import {
  approveSellerApplication,
  getPendingSellerApplications,
  rejectSellerApplication,
  type AdminSellerApplication,
} from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDateTime } from '../../lib/format'

export default function SellerApplications() {
  const { token } = useAuth()
  const [applications, setApplications] = useState<AdminSellerApplication[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    if (!token) return
    getPendingSellerApplications(token)
      .then(setApplications)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [token])

  async function handleApprove(id: string) {
    if (!token) return
    setBusyId(id)
    setError(null)
    try {
      await approveSellerApplication(id, token)
      setApplications((prev) => prev?.filter((a) => a.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: string) {
    if (!token) return
    const reason = window.prompt('Reason for rejecting this application:')
    if (!reason || !reason.trim()) return
    setBusyId(id)
    setError(null)
    try {
      await rejectSellerApplication(id, reason.trim(), token)
      setApplications((prev) => prev?.filter((a) => a.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-royal">Seller Applications</h1>
      <p className="mb-8 text-sm text-gray-500">
        Verify new sellers before they can list items. Separate from item listing approvals.
      </p>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!applications ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">Queue is empty</h4>
          <p className="text-sm">No seller applications are waiting for review right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((app) => (
            <div key={app.id} className="rounded-xl border border-royal/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-medium text-charcoal">{app.fullName}</h3>
                  <div className="mt-1 font-mono text-[11px] text-gray-500">
                    {app.user.email} · applied {formatDateTime(app.createdAt)}
                  </div>
                  <div className="mt-1 text-[13px] text-gray-500">Account: {app.user.name}</div>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => handleApprove(app.id)}
                    disabled={busyId === app.id}
                    className="rounded-lg bg-green px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-green/90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(app.id)}
                    disabled={busyId === app.id}
                    className="rounded-lg border border-red/40 px-4 py-2 text-[13px] font-semibold text-red transition hover:bg-red/5 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-gray-100 pt-3 font-mono text-[12px] text-gray-500 sm:grid-cols-3">
                <span>
                  Mobile: <b className="text-charcoal">{app.mobile}</b>
                </span>
                <span>
                  PAN: <b className="text-charcoal">{app.panNumber}</b>
                </span>
                <span>
                  IFSC: <b className="text-charcoal">{app.bankIFSC}</b>
                </span>
                <span>
                  Bank A/C: <b className="text-charcoal">{app.bankAccountNumber}</b>
                </span>
                <span className="sm:col-span-2">
                  Address: <b className="text-charcoal">{app.address}, {app.city}, {app.state} {app.pincode}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
