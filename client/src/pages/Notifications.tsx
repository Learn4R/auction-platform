import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getAllNotifications, markNotificationRead, type AppNotification, type PaginatedNotifications } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime } from '../lib/format'

export default function Notifications() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaginatedNotifications | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setData(null)
    getAllNotifications(page, token)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token, page])

  if (!user) return <Navigate to="/login" replace />

  async function handleClick(notification: AppNotification) {
    if (!token) return
    if (!notification.read) {
      const updated = await markNotificationRead(notification.id, token)
      setData((prev) => (prev ? { ...prev, notifications: prev.notifications.map((n) => (n.id === updated.id ? updated : n)) } : prev))
    }
    if (notification.itemId) navigate(`/items/${notification.itemId}`)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="mb-2 font-display text-3xl text-royal">Notifications</h1>
      <p className="mb-8 text-sm text-gray-500">Your complete notification history.</p>

      {error && <p className="text-sm text-red">{error}</p>}
      {!error && !data && <p className="text-sm text-gray-500">Loading…</p>}

      {data && data.notifications.length === 0 && (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">No notifications</h4>
          <p className="text-sm">You don't have any notifications yet.</p>
        </div>
      )}

      {data && data.notifications.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-royal/10 bg-white">
            {data.notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`block w-full border-b border-royal/5 px-5 py-4 text-left text-[13.5px] leading-snug transition last:border-b-0 hover:bg-royal/5 ${
                  n.read ? 'text-gray-500' : 'bg-royal/[0.03] font-medium text-charcoal'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />}
                  <div className={n.read ? '' : 'flex-1'}>
                    <p>{n.message}</p>
                    <p className="mt-1 font-mono text-[11px] text-gray-400">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between text-[13px] text-gray-500">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-royal/10 px-3 py-1.5 font-semibold text-royal disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>
            <span>
              Page {data.page} of {data.totalPages || 1} · {data.total} total
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="rounded-lg border border-royal/10 px-3 py-1.5 font-semibold text-royal disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
