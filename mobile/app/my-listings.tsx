import { useCallback, useState } from 'react'
import { Stack, useFocusEffect } from 'expo-router'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { ItemStatusPill } from '../components/ItemStatusPill'
import { colors } from '../constants/colors'
import { getMyItems, type ItemSubmission } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime } from '../lib/format'

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
      {error ? (
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
              <Text style={styles.emptyTitle}>No listings yet</Text>
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
          <Text style={styles.category}>{item.category?.name ?? 'No category'}</Text>
          <Text style={styles.title}>{item.title || 'Untitled item'}</Text>
        </View>
        <ItemStatusPill status={item.status} />
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detail}>
          Starting bid: <Text style={styles.detailValue}>{item.proposedStartingBid ? formatCurrency(item.proposedStartingBid) : '—'}</Text>
        </Text>
        <Text style={styles.detail}>
          Ends: <Text style={styles.detailValue}>{item.proposedEndTime ? formatDateTime(item.proposedEndTime) : '—'}</Text>
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
