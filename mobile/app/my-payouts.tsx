import { useCallback, useState } from 'react'
import { router, Stack, useFocusEffect } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native'
import { LotTicket } from '../components/LotTicket'
import { PayoutStatusPill } from '../components/PayoutStatusPill'
import { Text } from '../components/Text'
import { colors } from '../constants/colors'
import { getSellerPayouts, type SellerPayout } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime } from '../lib/format'

// The server 403s GET /api/seller/payouts with this exact message for any
// non-seller (see server/src/middleware/auth.ts) — same handling my-listings.tsx
// already uses for the same reason.
const NOT_A_SELLER_ERROR = 'Insufficient permissions'

// Mirrors client/src/pages/MyListings.tsx's PayoutsSection: same gross/
// commission/net breakdown and copy, so a seller sees identical numbers and
// language whether they check on web or mobile. One payout row per sold
// item, created automatically once the buyer's payment clears (see
// server/src/lib/orderPayment.ts's markOrderPaid) — nothing to submit here.
export default function MyPayouts() {
  const { token } = useAuth()
  const [payouts, setPayouts] = useState<SellerPayout[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!token) return
      getSellerPayouts(token)
        .then(setPayouts)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load your payouts'))
    }, [token]),
  )

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'My Payouts' }} />
      {error === NOT_A_SELLER_ERROR ? (
        <View style={styles.center} testID="my-payouts-not-seller">
          <Text variant="display" style={styles.emptyTitle}>
            Selling starts with an application
          </Text>
          <Text style={styles.emptySubtitle}>
            My Payouts is where approved sellers track earnings from sold lots. Apply to sell to get started.
          </Text>
          <Pressable style={styles.applyButton} onPress={() => router.replace('/apply-to-sell')} testID="my-payouts-apply-to-sell">
            <Text style={styles.applyButtonText}>Apply to Sell</Text>
          </Pressable>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText} testID="my-payouts-error">
            {error}
          </Text>
        </View>
      ) : !payouts ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.royal} testID="my-payouts-loading" />
        </View>
      ) : (
        <FlatList
          testID="my-payouts-list"
          style={styles.container}
          contentContainerStyle={styles.content}
          data={payouts}
          keyExtractor={(p) => p.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <PayoutRow payout={item} />}
          ListHeaderComponent={
            <Text style={styles.intro}>Commission and net payout for each sold item, once the buyer pays.</Text>
          }
          ListEmptyComponent={
            <View style={styles.empty} testID="my-payouts-empty">
              <Text variant="display" style={styles.emptyTitle}>
                No payouts yet
              </Text>
              <Text style={styles.emptySubtitle}>Payouts appear here once a buyer pays for one of your sold items.</Text>
            </View>
          }
        />
      )}
    </>
  )
}

function PayoutRow({ payout }: { payout: SellerPayout }) {
  return (
    <View style={styles.row} testID={`payout-${payout.id}`}>
      <View style={styles.rowTop}>
        <View style={styles.rowTitleBlock}>
          <Text variant="display" style={styles.title}>
            {payout.order.auction.item.title}
          </Text>
          <Text variant="mono" style={styles.created}>
            Created {formatDateTime(payout.createdAt)}
          </Text>
        </View>
        <PayoutStatusPill status={payout.status} />
      </View>

      <View style={styles.amountsRow}>
        <LotTicket size="sm" label="Gross (Winning Bid)" value={formatCurrency(payout.grossAmount)} style={styles.amountTicket} />
        <LotTicket
          size="sm"
          label="Commission Deducted"
          value={`−${formatCurrency(payout.commissionAmount)}`}
          valueColor={colors.red}
          style={styles.amountTicket}
        />
        <LotTicket size="sm" label="Net Payout" value={formatCurrency(payout.netAmount)} style={styles.amountTicket} />
      </View>
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
  intro: {
    fontSize: 13,
    color: colors.gray,
    lineHeight: 19,
    marginBottom: 16,
  },
  separator: {
    height: 12,
  },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
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
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.charcoal,
  },
  created: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 2,
  },
  amountsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  amountTicket: {
    flex: 1,
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
