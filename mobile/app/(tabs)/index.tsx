import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CategoryThumb } from '../../components/CategoryThumb'
import { HeroMedallion } from '../../components/HeroMedallion'
import { ItemCard } from '../../components/ItemCard'
import { Text } from '../../components/Text'
import { colors } from '../../constants/colors'
import { getCategories, getItems, type Category, type ItemSummary } from '../../lib/api'

// Eyebrow + display-font title, matching the web homepage's SectionHead
// (client/src/pages/Home.tsx) — the small gold rule + tracked mono label
// above every section title, including the hero's own eyebrow.
function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowRule} />
        <Text variant="mono" style={styles.eyebrow}>
          {eyebrow}
        </Text>
      </View>
      <Text variant="display" style={styles.sectionTitle}>
        {title}
      </Text>
    </View>
  )
}

const RAIL_CARD_WIDTH = 300

// A horizontally-scrolling lane of ItemCards — the mobile equivalent of the
// web homepage's own Rail component, which already renders Live Now and
// Upcoming this way. Featured Lots joins them here as a third rail instead
// of a plain vertical stack, so each section reads as its own distinct lane
// rather than blending into one long list.
function Rail({ items, emptyText, testID }: { items: ItemSummary[]; emptyText: string; testID: string }) {
  if (items.length === 0) {
    return (
      <Text style={styles.empty} testID={testID}>
        {emptyText}
      </Text>
    )
  }
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.railContent}
      ItemSeparatorComponent={() => <View style={styles.railGap} />}
      renderItem={({ item }) => (
        <View style={styles.railCard}>
          <ItemCard item={item} />
        </View>
      )}
      testID={testID}
    />
  )
}

// A horizontally-scrolling row of category cards — icon, name, and real lot
// count from the same /api/categories endpoint the web grid uses. Tapping
// one jumps to the Auctions tab pre-filtered to that category, the mobile
// equivalent of web's <Link to={`/browse?category=${cat.slug}`}>.
function CategoryRail({ categories }: { categories: Category[] }) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={categories}
      keyExtractor={(cat) => cat.id}
      contentContainerStyle={styles.railContent}
      ItemSeparatorComponent={() => <View style={styles.categoryGap} />}
      renderItem={({ item: cat }) => (
        <Pressable
          style={({ pressed }) => [styles.categoryCard, pressed && styles.categoryCardPressed]}
          onPress={() => router.push({ pathname: '/auctions', params: { category: cat.slug } })}
          testID={`home-category-${cat.slug}`}
        >
          <CategoryThumb categoryName={cat.name} size={44} />
          <Text variant="display" style={styles.categoryName} numberOfLines={1}>
            {cat.name}
          </Text>
          <Text variant="mono" style={styles.categoryCount}>
            {cat.itemCount} lot{cat.itemCount === 1 ? '' : 's'}
          </Text>
        </Pressable>
      )}
      testID="home-categories"
    />
  )
}

export default function Home() {
  // The tab navigator renders this screen with headerShown: false (see
  // (tabs)/_layout.tsx), so nothing else reserves space for the status
  // bar/notch — the hero has to add that padding itself, or its eyebrow
  // sits right under the clock/signal icons on any real device.
  const insets = useSafeAreaInsets()

  const [items, setItems] = useState<ItemSummary[] | null>(null)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load auctions'))
    getCategories()
      .then(setCategories)
      .catch(() => {})
  }, [])

  const live = items?.filter((i) => i.auction?.status === 'live') ?? []
  const upcoming = items?.filter((i) => i.auction?.status === 'upcoming') ?? []
  const featured = items?.filter((i) => i.auction?.status !== 'ended').slice(0, 4) ?? []

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="home-scroll">
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]} testID="home-hero">
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowRule} />
          <Text variant="mono" style={styles.eyebrow}>
            TRUSTED INDIAN AUCTION HOUSE
          </Text>
        </View>
        <Text variant="display" style={styles.heroTitle}>
          Discover History.{'\n'}Own{' '}
          <Text variant="display" italic style={styles.heroEmphasis}>
            Rarity
          </Text>
          .
        </Text>
        <Text style={styles.heroSubtitle}>
          Bid on rare Indian currencies, historic coins, antiques and exceptional collectibles from trusted,
          verified sellers.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.heroButton, pressed && styles.heroButtonPressed]}
          onPress={() => router.push({ pathname: '/auctions', params: { status: 'live' } })}
          testID="hero-explore-live"
        >
          <Text style={styles.heroButtonText}>Explore Live Auctions</Text>
        </Pressable>
        <View style={styles.medallionWrap}>
          <HeroMedallion size={220} />
        </View>
      </View>

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
            <SectionHead eyebrow="Curated Selection" title="Featured Lots" />
            <Rail items={featured} emptyText="Nothing here yet." testID="section-featured" />
          </View>

          <View style={[styles.section, styles.sectionShaded]}>
            <SectionHead eyebrow="Happening Now" title="Live Now" />
            <Rail items={live} emptyText="No live auctions right now." testID="section-live" />
          </View>

          <View style={styles.section}>
            <SectionHead eyebrow="Mark Your Calendar" title="Upcoming Auctions" />
            <Rail items={upcoming} emptyText="Nothing scheduled yet." testID="section-upcoming" />
          </View>

          <View style={[styles.section, styles.sectionShaded, styles.lastSection]}>
            <SectionHead eyebrow="Browse by Interest" title="Categories" />
            {!categories ? (
              <ActivityIndicator color={colors.royal} testID="categories-loading" />
            ) : (
              <CategoryRail categories={categories} />
            )}
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
    paddingBottom: 40,
  },
  hero: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 6,
    backgroundColor: '#FDFCFA',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(23,59,112,0.07)',
    alignItems: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  eyebrowRule: {
    width: 20,
    height: 1,
    backgroundColor: colors.gold,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.deepblue,
    textTransform: 'uppercase',
  },
  heroTitle: {
    alignSelf: 'flex-start',
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '500',
    color: colors.royal,
    marginBottom: 12,
  },
  heroEmphasis: {
    color: colors.gold,
  },
  heroSubtitle: {
    alignSelf: 'flex-start',
    fontSize: 15,
    lineHeight: 22,
    color: colors.gray,
    marginBottom: 20,
  },
  heroButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  heroButtonPressed: {
    opacity: 0.88,
  },
  heroButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  medallionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontSize: 13,
    color: colors.red,
    marginHorizontal: 20,
    marginTop: 16,
  },
  loader: {
    marginTop: 40,
  },
  section: {
    paddingVertical: 24,
  },
  sectionShaded: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(23,59,112,0.06)',
  },
  lastSection: {
    borderBottomWidth: 0,
  },
  sectionHead: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.royal,
    marginTop: 2,
  },
  railContent: {
    paddingHorizontal: 20,
  },
  railGap: {
    width: 12,
  },
  railCard: {
    width: RAIL_CARD_WIDTH,
  },
  empty: {
    fontSize: 13,
    color: colors.gray,
    marginHorizontal: 20,
  },
  categoryGap: {
    width: 10,
  },
  categoryCard: {
    width: 130,
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  categoryCardPressed: {
    opacity: 0.85,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.charcoal,
  },
  categoryCount: {
    fontSize: 10.5,
    color: colors.gray,
  },
})
