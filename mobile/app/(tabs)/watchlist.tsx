import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ItemCard } from '../../components/ItemCard'
import { Text } from '../../components/Text'
import { colors } from '../../constants/colors'
import { getWatchlist, type ItemSummary } from '../../lib/api'
import { useAuth } from '../../lib/auth'

// Real watchlisted items from GET /api/watchlist, rendered with the same
// ItemCard used on Home/Auctions — so live items already show "Current Bid"
// (via getPriceDisplay) and already navigate to the Live Auction screen on
// tap, with no extra code here. Refetches whenever this tab regains focus,
// so unwatchlisting an item elsewhere (or right here) is reflected without
// needing a manual pull-to-refresh.
export default function Watchlist() {
  // The tab navigator renders this screen with headerShown: false (see
  // (tabs)/_layout.tsx), so nothing else reserves space for the status
  // bar/notch — same fix as Home's own hero, applied here to the title.
  const insets = useSafeAreaInsets()

  const { token } = useAuth()
  const [items, setItems] = useState<ItemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!token) return
      getWatchlist(token)
        .then(setItems)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load your watchlist'))
    }, [token]),
  )

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText} testID="watchlist-error">
          {error}
        </Text>
      </View>
    )
  }

  if (!items) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.royal} testID="watchlist-loading" />
      </View>
    )
  }

  return (
    <FlatList
      testID="watchlist-list"
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      data={items}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <ItemCard item={item} />}
      ListHeaderComponent={
        <Text variant="display" style={styles.title}>
          Watchlist
        </Text>
      }
      ListEmptyComponent={
        <View style={styles.empty} testID="watchlist-empty">
          <Text variant="display" style={styles.emptyTitle}>
            Your watchlist is empty
          </Text>
          <Text style={styles.emptySubtitle}>Tap the heart on any lot to save it here.</Text>
        </View>
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
  separator: {
    height: 12,
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
