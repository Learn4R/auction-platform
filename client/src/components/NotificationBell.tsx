import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type AppNotification } from '../lib/api'
import { useNotifications } from '../lib/notifications'

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function handleClick(notification: AppNotification) {
    await markRead(notification.id)
    setOpen(false)
    if (notification.itemId) navigate(`/items/${notification.itemId}`)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-charcoal transition hover:bg-royal/5"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-royal">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-royal/10 bg-white shadow-lg">
          <div className="border-b border-royal/10 px-4 py-2.5 text-[13px] font-semibold text-charcoal">
            Notifications
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`block w-full border-b border-royal/5 px-4 py-3 text-left text-[13px] leading-snug transition last:border-b-0 hover:bg-royal/5 ${
                    n.read ? 'text-gray-500' : 'bg-royal/[0.03] font-medium text-charcoal'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />}
                    <div className={n.read ? '' : 'flex-1'}>
                      <p>{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false)
              navigate('/notifications')
            }}
            className="block w-full border-t border-royal/10 px-4 py-2.5 text-center text-[12.5px] font-semibold text-royal transition hover:bg-royal/5"
          >
            View all →
          </button>
        </div>
      )}
    </div>
  )
}
