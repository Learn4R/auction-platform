import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { AuctionsFilterModal, activeFilterCount, EMPTY_FILTERS, type AuctionFilters } from '../../components/AuctionsFilterModal'
import { AuctionsSortModal, SORT_OPTIONS, type SortKey } from '../../components/AuctionsSortModal'
import { ItemCard } from '../../components/ItemCard'
import { colors } from '../../constants/colors'
import { getCategories, getItemFilterOptions, getItems, type Category, type ItemFilterOptions, type ItemSummary } from '../../lib/api'

function itemPrice(item: ItemSummary): number {
  return Number(item.auction?.currentBid ?? item.auction?.startingBid ?? 0)
}

function sortItems(items: ItemSummary[], sort: SortKey): ItemSummary[] {
  const sorted = [...items]
  switch (sort) {
    case 'ending':
      return sorted.sort((a, b) => {
        const aTime = a.auction ? new Date(a.auction.endTime).getTime() : Infinity
        const bTime = b.auction ? new Date(b.auction.endTime).getTime() : Infinity
        return aTime - bTime
      })
    case 'low':
      return sorted.sort((a, b) => itemPrice(a) - itemPrice(b))
    case 'high':
      return sorted.sort((a, b) => itemPrice(b) - itemPrice(a))
    case 'newest':
      return sorted.sort((a, b) => {
        const aTime = a.auction ? new Date(a.auction.startTime).getTime() : 0
        const bTime = b.auction ? new Date(b.auction.startTime).getTime() : 0
        return bTime - aTime
      })
    case 'mostBids':
      return sorted.sort((a, b) => (b.auction?._count.bids ?? 0) - (a.auction?._count.bids ?? 0))
    default:
      return sorted
  }
}

function matchesFilters(item: ItemSummary, f: AuctionFilters): boolean {
  if (f.status !== 'all' && item.auction?.status !== f.status) return false
  if (f.categorySlugs.size > 0 && !f.categorySlugs.has(item.category.slug)) return false
  if (f.minPrice && itemPrice(item) < Number(f.minPrice)) return false
  if (f.maxPrice && itemPrice(item) > Number(f.maxPrice)) return false
  if (f.year && String(item.year ?? '') !== f.year) return false
  if (f.material && item.material !== f.material) return false
  if (f.condition && item.condition !== f.condition) return false
  if (f.grade && item.grade !== f.grade) return false
  if (f.hasCertificate && !item.certificateNumber?.trim()) return false
  return true
}

// Search and every filter are applied client-side against the already-
// loaded full catalog — the same simple approach the web Browse page uses
// for its own search box (client/src/pages/Browse.tsx), extended to the
// rest of the filters here since Category is multi-select and Price Range
// has no server-side equivalent to round-trip to anyway.
export default function Auctions() {
  const [items, setItems] = useState<ItemSummary[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [filterOptions, setFilterOptions] = useState<ItemFilterOptions | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<AuctionFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortKey>('recommended')
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [sortModalVisible, setSortModalVisible] = useState(false)

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load auctions'))
    getCategories()
      .then(setCategories)
      .catch(() => {})
    getItemFilterOptions()
      .then(setFilterOptions)
      .catch(() => {})
  }, [])

  const filteredItems = useMemo(() => {
    if (!items) return []
    return items.filter((item) => matchesFilters(item, filters))
  }, [items, filters])

  const searchedItems = useMemo(() => {
    if (!search.trim()) return filteredItems
    const q = search.trim().toLowerCase()
    return filteredItems.filter((item) => item.title.toLowerCase().includes(q))
  }, [filteredItems, search])

  const sortedItems = useMemo(() => sortItems(searchedItems, sort), [searchedItems, sort])

  const count = activeFilterCount(filters)
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Recommended'

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error} testID="auctions-error">
          Couldn&apos;t load auctions: {error}
        </Text>
      </View>
    )
  }

  if (!items) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.royal} testID="auctions-loading" />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <FlatList
        testID="auctions-list"
        style={styles.container}
        contentContainerStyle={styles.content}
        data={sortedItems}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <ItemCard item={item} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>All Auctions</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search by title…"
              placeholderTextColor={colors.gray}
              value={search}
              onChangeText={setSearch}
              testID="auctions-search"
            />

            <View style={styles.controlsRow}>
              <Pressable
                style={styles.controlButton}
                onPress={() => setFilterModalVisible(true)}
                testID="auctions-filters-button"
              >
                <Text style={styles.controlButtonText}>Filters</Text>
                {count > 0 && (
                  <View style={styles.badge} testID="auctions-filter-count">
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable style={styles.controlButton} onPress={() => setSortModalVisible(true)} testID="auctions-sort-button">
                <Text style={styles.controlButtonText} numberOfLines={1}>
                  Sort: {sortLabel}
                </Text>
              </Pressable>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultText} testID="auctions-result-count">
                <Text style={styles.resultCount}>{sortedItems.length}</Text> lot{sortedItems.length === 1 ? '' : 's'} found
                {search.trim() ? ` for "${search.trim()}"` : ''}
              </Text>
              {count > 0 && (
                <Pressable onPress={() => setFilters(EMPTY_FILTERS)} testID="auctions-clear-filters">
                  <Text style={styles.clearLink}>Reset all</Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty} testID="auctions-empty">
            <Text style={styles.emptyTitle}>No lots match these filters</Text>
            <Text style={styles.emptySubtitle}>Try clearing a filter or checking back later.</Text>
          </View>
        }
      />

      <AuctionsFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onChange={setFilters}
        categories={categories}
        filterOptions={filterOptions}
      />
      <AuctionsSortModal visible={sortModalVisible} onClose={() => setSortModalVisible(false)} value={sort} onChange={setSort} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.royal,
    marginBottom: 14,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.charcoal,
    backgroundColor: colors.white,
    marginBottom: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  controlButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.charcoal,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.royal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10.5,
    fontWeight: '700',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  resultText: {
    fontSize: 12.5,
    color: colors.gray,
    flex: 1,
  },
  resultCount: {
    fontWeight: '700',
    color: colors.charcoal,
  },
  clearLink: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.royal,
  },
  separator: {
    height: 12,
  },
  empty: {
    alignItems: 'center',
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    padding: 20,
  },
  error: {
    fontSize: 13,
    color: colors.red,
    textAlign: 'center',
  },
})
