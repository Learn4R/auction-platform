import { useCallback, useState } from 'react'
import { router, Stack, useFocusEffect } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { PaymentStatusPill } from '../components/PaymentStatusPill'
import { ShippingAddressForm } from '../components/ShippingAddressForm'
import { ShippingProgress } from '../components/ShippingProgress'
import { colors } from '../constants/colors'
import { getMyProfile, getOrders, type MyProfile, type Order } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatCurrency, formatDateTime } from '../lib/format'

// Mirrors client/src/components/OrdersPanel.tsx's structure and branching
// exactly: paid → shipping summary + progress; refunded → summary + reason;
// unpaid with an address already saved → summary + Pay Now; unpaid with no
// address yet → the shipping form inline.
export default function MyOrders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!token) return
      getOrders(token)
        .then(setOrders)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load your orders'))
      getMyProfile(token)
        .then(setProfile)
        .catch(() => {})
    }, [token]),
  )

  function handleAddressSaved(updated: Order) {
    setOrders((prev) => (prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev))
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'My Orders' }} />
      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText} testID="my-orders-error">
            {error}
          </Text>
        </View>
      ) : !orders ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.royal} testID="my-orders-loading" />
        </View>
      ) : (
        <FlatList
          testID="my-orders-list"
          style={styles.container}
          contentContainerStyle={styles.content}
          data={orders}
          keyExtractor={(o) => o.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <OrderRow order={item} profile={profile} onAddressSaved={handleAddressSaved} />}
          ListEmptyComponent={
            <View style={styles.empty} testID="my-orders-empty">
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>Win an auction and it&apos;ll show up here.</Text>
            </View>
          }
        />
      )}
    </>
  )
}

function OrderRow({
  order,
  profile,
  onAddressSaved,
}: {
  order: Order
  profile: MyProfile | null
  onAddressSaved: (order: Order) => void
}) {
  const hasAddress = !!order.shippingAddressLine1

  return (
    <View style={styles.row} testID={`order-${order.id}`}>
      <View style={styles.rowTop}>
        <View style={styles.rowTitleBlock}>
          <Text style={styles.category}>{order.auction.item.category.name}</Text>
          <Text style={styles.title}>{order.auction.item.title}</Text>
          <Text style={styles.won}>Won {formatDateTime(order.createdAt)}</Text>
        </View>
        <PaymentStatusPill status={order.paymentStatus} />
      </View>

      <View style={styles.amountsRow}>
        <View>
          <Text style={styles.amountLabel}>Winning Bid</Text>
          <Text style={styles.amountValue}>{formatCurrency(order.winningBid)}</Text>
        </View>
        <View>
          <Text style={styles.amountLabel}>Buyer Premium</Text>
          <Text style={styles.amountValue}>{formatCurrency(order.buyerPremium)}</Text>
        </View>
        <View>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={[styles.amountValue, styles.amountTotal]}>{formatCurrency(order.totalAmount)}</Text>
        </View>
      </View>

      {hasAddress && <ShippingAddressSummary order={order} />}

      {order.paymentStatus === 'paid' ? (
        <View style={styles.shippingSection}>
          <Text style={styles.sectionLabel}>Shipping Status</Text>
          <ShippingProgress status={order.shippingStatus} />
        </View>
      ) : order.paymentStatus === 'refunded' ? (
        <View style={styles.shippingSection}>
          <Text style={styles.sectionLabel}>
            Refunded{order.refundedAt ? ` ${formatDateTime(order.refundedAt)}` : ''}
          </Text>
          {order.refundReason && <Text style={styles.refundReason}>{order.refundReason}</Text>}
        </View>
      ) : hasAddress ? (
        <View style={styles.shippingSection}>
          <Pressable
            style={styles.payButton}
            onPress={() =>
              router.push({
                pathname: '/pay/[orderId]',
                params: { orderId: order.id, itemTitle: order.auction.item.title },
              })
            }
            testID={`pay-now-${order.id}`}
          >
            <Text style={styles.payButtonText}>Pay Now</Text>
          </Pressable>
        </View>
      ) : (
        <ShippingAddressForm order={order} defaultAddress={profile} onSaved={onAddressSaved} />
      )}
    </View>
  )
}

function ShippingAddressSummary({ order }: { order: Order }) {
  return (
    <View style={styles.addressBox} testID={`shipping-summary-${order.id}`}>
      <Text style={styles.sectionLabel}>Shipping To</Text>
      <Text style={styles.addressName}>{order.shippingName}</Text>
      <Text style={styles.addressLine}>{order.shippingAddressLine1}</Text>
      {order.shippingAddressLine2 && <Text style={styles.addressLine}>{order.shippingAddressLine2}</Text>}
      <Text style={styles.addressLine}>
        {order.shippingCity}, {order.shippingState} {order.shippingPincode}
      </Text>
      <Text style={styles.addressPhone}>{order.shippingPhone}</Text>
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
  won: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 2,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  amountLabel: {
    fontSize: 9.5,
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  amountValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.charcoal,
    marginTop: 2,
  },
  amountTotal: {
    color: colors.royal,
  },
  addressBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.gray,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  addressName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.charcoal,
  },
  addressLine: {
    fontSize: 13,
    color: colors.charcoal,
  },
  addressPhone: {
    fontSize: 12.5,
    color: colors.gray,
    marginTop: 2,
  },
  shippingSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  refundReason: {
    fontSize: 13,
    color: colors.charcoal,
  },
  payButton: {
    backgroundColor: colors.royal,
    borderRadius: 9,
    paddingVertical: 11,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  payButtonText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '600',
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
