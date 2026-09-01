import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { ItemCard } from '../../components/ItemCard'
import { colors } from '../../constants/colors'
import { getItems, type ItemSummary } from '../../lib/api'

// A plain, complete list of every live catalog item — no filters or search
// yet, that's a later phase. Same GET /api/items endpoint as the Home tab.
export default function Auctions() {
  const [items, setItems] = useState<ItemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load auctions'))
  }, [])

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
    <FlatList
      testID="auctions-list"
      style={styles.container}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <ItemCard item={item} />}
      ListHeaderComponent={<Text style={styles.title}>All Auctions</Text>}
      ListEmptyComponent={<Text style={styles.empty}>No items in the catalog yet.</Text>}
    />
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.royal,
    marginBottom: 16,
  },
  separator: {
    height: 12,
  },
  empty: {
    fontSize: 13,
    color: colors.gray,
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
