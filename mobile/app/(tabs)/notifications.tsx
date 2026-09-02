import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../../components/Text'
import { colors } from '../../constants/colors'
import { getAllNotifications, markNotificationRead as apiMarkNotificationRead, type AppNotification, type PaginatedNotifications } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDateTime } from '../../lib/format'
import { useNotifications } from '../../lib/notifications'

// The full paginated history (GET /api/notifications/all), mirroring
// client/src/pages/Notifications.tsx — plus a live top-up from the same
// NotificationProvider/socket connection Phase 3 set up: a new notification
// that arrives while viewing page 1 is spliced straight into the list
// instead of waiting for a manual refresh.
export default function Notifications() {
  const { token } = useAuth()
  const { notifications: liveNotifications, markRead } = useNotifications()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaginatedNotifications | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setData(null)
    getAllNotifications(page, token)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load notifications'))
  }, [token, page])

  const latestLiveId = liveNotifications[0]?.id
  useEffect(() => {
    if (page !== 1 || !latestLiveId) return
    setData((prev) => {
      if (!prev || prev.notifications.some((n) => n.id === latestLiveId)) return prev
      const newest = liveNotifications[0]
      if (!newest) return prev
      return { ...prev, notifications: [newest, ...prev.notifications], total: prev.total + 1 }
    })
    // Only the newest live id needs to be watched — liveNotifications itself
    // changes reference every fetch/update, which would refire this needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestLiveId, page])

  async function handlePress(notification: AppNotification) {
    if (!notification.read) {
      // Route through the shared context when it knows this notification
      // (keeps the tab-bar badge in sync too); otherwise mark it directly —
      // still correct, just without an in-place badge update for a
      // notification old enough to have fallen out of the last-50 the
      // context holds.
      if (liveNotifications.some((n) => n.id === notification.id)) {
        await markRead(notification.id)
      } else if (token) {
        await apiMarkNotificationRead(notification.id, token).catch(() => {})
      }
      setData((prev) =>
        prev
          ? { ...prev, notifications: prev.notifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n)) }
          : prev,
      )
    }
    if (notification.itemId) router.push(`/items/${notification.itemId}`)
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText} testID="notifications-error">
          {error}
        </Text>
      </View>
    )
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.royal} testID="notifications-loading" />
      </View>
    )
  }

  return (
    <FlatList
      testID="notifications-list"
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data.notifications}
      keyExtractor={(n) => n.id}
      renderItem={({ item: n }) => (
        <Pressable
          style={[styles.row, !n.read && styles.rowUnread]}
          onPress={() => handlePress(n)}
          testID={`notification-${n.id}`}
        >
          {!n.read && <View style={styles.unreadDot} testID={`notification-unread-dot-${n.id}`} />}
          <View style={styles.rowBody}>
            <Text style={[styles.message, !n.read && styles.messageUnread]}>{n.message}</Text>
            <Text variant="mono" style={styles.timestamp}>
              {formatDateTime(n.createdAt)}
            </Text>
          </View>
        </Pressable>
      )}
      ListHeaderComponent={
        <Text variant="display" style={styles.title}>
          Notifications
        </Text>
      }
      ListEmptyComponent={
        <View style={styles.empty} testID="notifications-empty">
          <Text variant="display" style={styles.emptyTitle}>
            No notifications
          </Text>
          <Text style={styles.emptySubtitle}>You don&apos;t have any notifications yet.</Text>
        </View>
      }
      ListFooterComponent={
        data.notifications.length > 0 ? (
          <View style={styles.pagination}>
            <Pressable
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
              testID="notifications-prev"
            >
              <Text style={styles.pageButtonText}>← Previous</Text>
            </Pressable>
            <Text style={styles.pageInfo}>
              Page {data.page} of {data.totalPages || 1} · {data.total} total
            </Text>
            <Pressable
              onPress={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              style={[styles.pageButton, page >= data.totalPages && styles.pageButtonDisabled]}
              testID="notifications-next"
            >
              <Text style={styles.pageButtonText}>Next →</Text>
            </Pressable>
          </View>
        ) : null
      }
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.royal,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: 10,
  },
  rowUnread: {
    backgroundColor: 'rgba(23,59,112,0.04)',
    borderColor: 'rgba(23,59,112,0.15)',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.gold,
    marginTop: 5,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.gray,
  },
  messageUnread: {
    color: colors.charcoal,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    color: colors.gray,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  pageButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.royal,
  },
  pageInfo: {
    fontSize: 11.5,
    color: colors.gray,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    padding: 20,
  },
  errorText: {
    fontSize: 13,
    color: colors.red,
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.royal,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.gray,
    textAlign: 'center',
  },
})
