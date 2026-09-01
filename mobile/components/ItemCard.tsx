import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/colors'
import type { ItemSummary } from '../lib/api'
import { formatCountdown, formatCurrency, getPriceDisplay } from '../lib/format'
import { CategoryThumb } from './CategoryThumb'
import { StatusPill } from './StatusPill'

export function ItemCard({ item }: { item: ItemSummary }) {
  const { auction } = item
  const { label: priceLabel, amount: price } = getPriceDisplay(auction)

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/items/${item.id}`)}
      testID={`item-card-${item.id}`}
    >
      <CategoryThumb categoryName={item.category.name} size={64} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.category}>{item.category.name.toUpperCase()}</Text>
          {auction && <StatusPill status={auction.status} />}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.priceLabel}>{priceLabel}</Text>
            <Text style={styles.price} testID={`item-card-price-${item.id}`}>
              {price ? formatCurrency(price) : '—'}
            </Text>
          </View>
          {auction && auction.status !== 'ended' && (
            <Text style={styles.countdown}>
              {auction.status === 'live' ? formatCountdown(auction.endTime) : formatCountdown(auction.startTime)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cardPressed: {
    opacity: 0.85,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  category: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.deepblue,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.charcoal,
    lineHeight: 19,
  },
  bottomRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: colors.gray,
    textTransform: 'uppercase',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.royal,
  },
  countdown: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.deepblue,
  },
})
