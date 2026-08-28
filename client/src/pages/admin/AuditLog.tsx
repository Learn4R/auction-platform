import { useEffect, useState } from 'react'
import { getAuditLog, type AuditLogEntry } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDateTime } from '../../lib/format'

const ACTION_LABELS: Record<string, string> = {
  approve_item: 'Approved Item',
  reject_item: 'Rejected Item',
  verify_seller: 'Verified Seller',
  unverify_seller: 'Unverified Seller',
  update_settings: 'Updated Settings',
}

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action
}

export default function AuditLog() {
  const { token } = useAuth()
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getAuditLog(token)
      .then(setEntries)
      .catch((err) => setError(err.message))
  }, [token])

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-royal">Audit Log</h1>
      <p className="mb-8 text-sm text-gray-500">Every admin action, most recent first.</p>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!entries ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">No actions logged yet</h4>
          <p className="text-sm">Admin actions like approvals and settings changes will show up here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-royal/10 bg-white">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 font-mono text-[10.5px] tracking-wider text-gray-500 uppercase">
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Admin</th>
                <th className="px-5 py-3">Target</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-full bg-deepblue/10 px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider text-deepblue uppercase">
                      {actionLabel(entry.action)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-charcoal">{entry.admin.name}</td>
                  <td className="px-5 py-3.5 text-gray-600">{entry.target}</td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-gray-500">
                    {formatDateTime(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
