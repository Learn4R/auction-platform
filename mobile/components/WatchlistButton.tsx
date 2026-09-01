import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Pressable, StyleSheet, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native'
import { colors } from '../constants/colors'
import { useAuth } from '../lib/auth'
import { useWatchlist } from '../lib/watchlist'

// Mirrors client/src/components/WatchlistButton.tsx: a small heart toggle
// that works anywhere an item shows up (ItemCard on Home/Auctions, Item
// Detail, Live Auction), reading/writing the shared WatchlistProvider so
// every instance of the same item updates together with no screen refresh.
export function WatchlistButton({ itemId, style }: { itemId: string; style?: StyleProp<ViewStyle> }) {
  const { user } = useAuth()
  const { isWatchlisted, toggle } = useWatchlist()
  const active = user ? isWatchlisted(itemId) : false

  function handlePress(e: GestureResponderEvent) {
    // This button typically sits inside a card that's itself pressable
    // (navigates to the item) — on react-native-web a press here can bubble
    // to that outer Pressable too, unlike on native where the innermost
    // responder alone wins. Stop it explicitly, same as the web app's own
    // WatchlistButton does with e.stopPropagation().
    e.stopPropagation()
    if (!user) {
      router.push('/login')
      return
    }
    void toggle(itemId)
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, style]}
      hitSlop={8}
      testID={`watchlist-toggle-${itemId}`}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <Ionicons name={active ? 'heart' : 'heart-outline'} size={16} color={active ? colors.red : colors.royal} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#173B70',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
})
