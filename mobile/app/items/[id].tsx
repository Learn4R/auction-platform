import { useEffect, useState } from 'react'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { CategoryThumb } from '../../components/CategoryThumb'
import { ItemSpecs } from '../../components/ItemSpecs'
import { LotTicket } from '../../components/LotTicket'
import { StatusPill } from '../../components/StatusPill'
import { Text } from '../../components/Text'
import { colors } from '../../constants/colors'
import { getItem, type ItemDetail } from '../../lib/api'
import { formatCurrency, getPriceDisplay } from '../../lib/format'

// Read-only: shows the item's real data pulled from GET /api/items/:id. No
// bid button here — that's the dedicated Live Auction screen's job, same as
// how the web app splits ItemDetail from LiveAuction. Tapping a card already
// routes LIVE items straight to /live/[id] (see components/ItemCard.tsx),
// but this screen still redirects there itself too, in case an item goes
// live between when a card was rendered and when this screen loads, or this
// route is reached directly (e.g. a deep link) — mirroring web ItemDetail's
// own `if (auction?.status === 'live') return <LiveAuction .../>` guard.
export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [item, setItem] = useState<ItemDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getItem(id)
      .then((result) => {
        if (result.auction?.status === 'live') {
          router.replace(`/live/${id}`)
          return
        }
        setItem(result)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load this item'))
  }, [id])

  if (error) {
    return (
      <View style={styles.center} testID="item-detail-error">
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  if (!item) {
    return (
      <View style={styles.center} testID="item-detail-loading">
        <ActivityIndicator color={colors.royal} />
      </View>
    )
  }

  const { auction } = item
  const { label: priceLabel, amount: price } = getPriceDisplay(auction)

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: item.title }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="item-detail-screen">
        <View style={styles.hero}>
          <CategoryThumb categoryName={item.category.name} size={96} />
        </View>

        <View style={styles.topRow}>
          {auction && <StatusPill status={auction.status} />}
        </View>

        <Text variant="display" style={styles.title} testID="item-detail-title">
          {item.title}
        </Text>
        <Text variant="mono" style={styles.meta} testID="item-detail-seller">
          {item.category.name} · Listed by {item.seller.name}
        </Text>

        <LotTicket
          size="lg"
          label={priceLabel}
          value={price ? formatCurrency(price) : '—'}
          valueTestID="item-detail-price"
          style={styles.priceBox}
        />

        <View style={styles.section}>
          <Text variant="mono" style={styles.sectionTitle}>
            Details
          </Text>
          <ItemSpecs item={item} />
        </View>

        <View style={styles.section}>
          <Text variant="mono" style={styles.sectionTitle}>
            Description
          </Text>
          <Text style={styles.description} testID="item-detail-description">
            {item.description}
          </Text>
        </View>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    marginBottom: 16,
    borderRadius: 14,
    backgroundColor: '#F6F3EC',
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.royal,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 20,
  },
  priceBox: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.gray,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.charcoal,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: colors.red,
    textAlign: 'center',
  },
})
