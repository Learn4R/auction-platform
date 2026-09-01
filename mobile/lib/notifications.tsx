import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getNotifications, markNotificationRead as apiMarkNotificationRead, type AppNotification } from './api'
import { useAuth } from './auth'
import { getSocket } from './socket'

// Mirrors client/src/lib/notifications.tsx exactly — holds the last 50
// notifications (GET /api/notifications), joins this user's `user:${id}`
// Socket.io room via identify/unidentify (same room the server already
// broadcasts outbid/won/listing/extended notifications to — see
// server/src/lib/notify.ts), and prepends anything that arrives live over
// the same connection Phase 3 set up. The Notifications *tab* itself uses
// the separate paginated /api/notifications/all endpoint for full history;
// this context is what drives the tab-bar unread badge everywhere in the
// app without every screen needing its own socket listener.
interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  markRead: (id: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    if (!token || !user) {
      setNotifications([])
      return
    }
    getNotifications(token)
      .then(setNotifications)
      .catch(() => {})
  }, [token, user])

  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    socket.emit('identify', user.id)

    function onNew(notification: AppNotification) {
      setNotifications((prev) => [notification, ...prev])
    }
    socket.on('notification:new', onNew)

    return () => {
      socket.emit('unidentify')
      socket.off('notification:new', onNew)
    }
  }, [user])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markRead: async (id) => {
        if (!token) return
        const target = notifications.find((n) => n.id === id)
        if (!target || target.read) return
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
        try {
          await apiMarkNotificationRead(id, token)
        } catch {
          setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)))
        }
      },
    }),
    [notifications, token],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider')
  return ctx
}
