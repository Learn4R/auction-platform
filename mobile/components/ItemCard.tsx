import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors } from '../constants/colors'
import type { ItemSummary } from '../lib/api'
import { formatCountdown, formatCurrency, getPriceDisplay } from '../lib/format'
import { CategoryThumb } from './CategoryThumb'
import { LotTicket } from './LotTicket'
import { StatusPill } from './StatusPill'
import { Text } from './Text'
import { WatchlistButton } from './WatchlistButton'

export function ItemCard({ item }: { item: ItemSummary }) {
  const { auction } = item
  const { label: priceLabel, amount: price } = getPriceDisplay(auction)

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(auction?.status === 'live' ? `/live/${item.id}` : `/items/${item.id}`)}
      testID={`item-card-${item.id}`}
    >
      <View style={styles.thumbWrap}>
        <CategoryThumb categoryName={item.category.name} size={64} />
        <WatchlistButton itemId={item.id} style={styles.watchlistButton} />
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text variant="mono" style={styles.category}>
            {item.category.name.toUpperCase()}
          </Text>
          {auction && <StatusPill status={auction.status} />}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.bottomRow}>
          <LotTicket
            size="sm"
            label={priceLabel}
            value={price ? formatCurrency(price) : '—'}
            valueTestID={`item-card-price-${item.id}`}
          />
          {auction && auction.status !== 'ended' && (
            <Text variant="mono" style={styles.countdown}>
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
  thumbWrap: {
    position: 'relative',
  },
  watchlistButton: {
    position: 'absolute',
    top: -6,
    right: -6,
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
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  countdown: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.deepblue,
  },
})
