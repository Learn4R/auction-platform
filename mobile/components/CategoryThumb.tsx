import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/colors'

// A simple placeholder visual for an item with no photo yet — a colored
// block bearing the category's initial, echoing the same fallback the web
// app's category grid uses. Porting the web's full parametric Emblem
// illustration system is its own later step, not part of this phase.
export function CategoryThumb({ categoryName, size = 64 }: { categoryName: string; size?: number }) {
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{categoryName.charAt(0).toUpperCase()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#F0E9CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: colors.gold,
    fontWeight: '600',
  },
})
