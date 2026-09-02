import { useCallback, useState } from 'react'
import { router, Stack, useFocusEffect } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native'
import { ItemStatusPill } from '../components/ItemStatusPill'
import { Text } from '../components/Text'
import { colors } from '../constants/colors'
import { getMyItems, type ItemSubmission } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime } from '../lib/format'

// The server 403s GET /api/seller/items with this exact message for any
// non-seller (see server/src/middleware/auth.ts) — reached here if this
// screen is opened directly (e.g. a stale deep link) rather than through
// Profile's own approved-seller-only "My Listings" link. Shown as a proper
// on-brand prompt instead of the raw server string.
const NOT_A_SELLER_ERROR = 'Insufficient permissions'

// A simple list of the seller's own submitted items with their real
// status — proves submission + status tracking work end to end. No
// edit/resubmit yet, that's a reasonable next phase (per the brief).
export default function MyListings() {
  const { token } = useAuth()
  const [items, setItems] = useState<ItemSubmission[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!token) return
      getMyItems(token)
        .then(setItems)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load your listings'))
    }, [token]),
  )

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'My Listings' }} />
      {error === NOT_A_SELLER_ERROR ? (
        <View style={styles.center} testID="my-listings-not-seller">
          <Text variant="display" style={styles.emptyTitle}>
            Selling starts with an application
          </Text>
          <Text style={styles.emptySubtitle}>
            My Listings is where approved sellers track their submitted lots. Apply to sell to start listing items
            for auction.
          </Text>
          <Pressable style={styles.applyButton} onPress={() => router.replace('/apply-to-sell')} testID="my-listings-apply-to-sell">
            <Text style={styles.applyButtonText}>Apply to Sell</Text>
          </Pressable>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText} testID="my-listings-error">
            {error}
          </Text>
        </View>
      ) : !items ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.royal} testID="my-listings-loading" />
        </View>
      ) : (
        <FlatList
          testID="my-listings-list"
          style={styles.container}
          contentContainerStyle={styles.content}
          data={items}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <ListingRow item={item} />}
          ListEmptyComponent={
            <View style={styles.empty} testID="my-listings-empty">
              <Text variant="display" style={styles.emptyTitle}>
                No listings yet
              </Text>
              <Text style={styles.emptySubtitle}>Submit your first item to get started.</Text>
            </View>
          }
        />
      )}
    </>
  )
}

function ListingRow({ item }: { item: ItemSubmission }) {
  return (
    <View style={styles.row} testID={`my-listing-${item.id}`}>
      <View style={styles.rowTop}>
        <View style={styles.rowTitleBlock}>
          <Text variant="mono" style={styles.category}>
            {item.category?.name ?? 'No category'}
          </Text>
          <Text variant="display" style={styles.title}>
            {item.title || 'Untitled item'}
          </Text>
        </View>
        <ItemStatusPill status={item.status} />
      </View>

      <View style={styles.detailRow}>
        <Text variant="mono" style={styles.detail}>
          Starting bid:{' '}
          <Text variant="mono" style={styles.detailValue}>
            {item.proposedStartingBid ? formatCurrency(item.proposedStartingBid) : '—'}
          </Text>
        </Text>
        <Text variant="mono" style={styles.detail}>
          Ends:{' '}
          <Text variant="mono" style={styles.detailValue}>
            {item.proposedEndTime ? formatDateTime(item.proposedEndTime) : '—'}
          </Text>
        </Text>
      </View>

      {item.status === 'rejected' && item.rejectionReason && (
        <View style={styles.reasonBox} testID={`my-listing-reason-${item.id}`}>
          <Text style={styles.reasonLabel}>Reason:</Text>
          <Text style={styles.reasonText}>{item.rejectionReason}</Text>
        </View>
      )}
      {item.status === 'changes_requested' && item.changesRequestedNote && (
        <View style={[styles.reasonBox, styles.changesBox]} testID={`my-listing-changes-${item.id}`}>
          <Text style={styles.changesLabel}>Requested changes:</Text>
          <Text style={styles.changesText}>{item.changesRequestedNote}</Text>
        </View>
      )}
    </View>
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
  separator: {
    height: 12,
  },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowTitleBlock: {
    flex: 1,
    gap: 2,
  },
  category: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.deepblue,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.charcoal,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detail: {
    fontSize: 11.5,
    color: colors.gray,
  },
  detailValue: {
    color: colors.charcoal,
    fontWeight: '600',
  },
  reasonBox: {
    borderWidth: 1,
    borderColor: 'rgba(200,59,59,0.25)',
    backgroundColor: 'rgba(200,59,59,0.05)',
    borderRadius: 8,
    padding: 10,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.red,
  },
  reasonText: {
    fontSize: 12.5,
    color: colors.red,
    marginTop: 2,
  },
  changesBox: {
    borderColor: 'rgba(201,162,39,0.4)',
    backgroundColor: 'rgba(201,162,39,0.08)',
  },
  changesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8a6e18',
  },
  changesText: {
    fontSize: 12.5,
    color: '#8a6e18',
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    padding: 24,
    gap: 8,
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
  applyButton: {
    backgroundColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
})
