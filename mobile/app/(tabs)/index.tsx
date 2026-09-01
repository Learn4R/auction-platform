import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ItemCard } from '../../components/ItemCard'
import { colors } from '../../constants/colors'
import { getItems, type ItemSummary } from '../../lib/api'

function SectionHead({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>
}

function Rail({ items, emptyText, testID }: { items: ItemSummary[]; emptyText: string; testID: string }) {
  if (items.length === 0) {
    return (
      <Text style={styles.empty} testID={testID}>
        {emptyText}
      </Text>
    )
  }
  return (
    <View style={styles.stack} testID={testID}>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </View>
  )
}

export default function Home() {
  const [items, setItems] = useState<ItemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load auctions'))
  }, [])

  const live = items?.filter((i) => i.auction?.status === 'live') ?? []
  const upcoming = items?.filter((i) => i.auction?.status === 'upcoming') ?? []
  const featured = items?.filter((i) => i.auction?.status !== 'ended').slice(0, 4) ?? []

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="home-scroll">
      <Text style={styles.pageTitle}>Discover History. Own Rarity.</Text>
      <Text style={styles.pageSubtitle}>
        Bid on rare Indian currencies, historic coins, antiques and exceptional collectibles.
      </Text>

      {error && (
        <Text style={styles.error} testID="home-error">
          Couldn&apos;t load auction data: {error}
        </Text>
      )}

      {!items && !error ? (
        <ActivityIndicator color={colors.royal} style={styles.loader} testID="home-loading" />
      ) : (
        <>
          <View style={styles.section}>
            <SectionHead title="Featured Lots" />
            <Rail items={featured} emptyText="Nothing here yet." testID="section-featured" />
          </View>

          <View style={styles.section}>
            <SectionHead title="Live Now" />
            <Rail items={live} emptyText="No live auctions right now." testID="section-live" />
          </View>

          <View style={styles.section}>
            <SectionHead title="Upcoming Auctions" />
            <Rail items={upcoming} emptyText="Nothing scheduled yet." testID="section-upcoming" />
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.royal,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 13.5,
    color: colors.gray,
    marginBottom: 24,
    lineHeight: 19,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.royal,
    marginBottom: 12,
  },
  stack: {
    gap: 12,
  },
  empty: {
    fontSize: 13,
    color: colors.gray,
  },
  error: {
    fontSize: 13,
    color: colors.red,
    marginBottom: 16,
  },
  loader: {
    marginTop: 40,
  },
})
