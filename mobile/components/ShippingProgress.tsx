import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/colors'
import type { ShippingStatus } from '../lib/api'

// Mirrors client/src/components/OrderStatus.tsx's ShippingProgress — the
// same four-step row, as dots connected by lines instead of flex-1 divs.
const STEPS: { value: ShippingStatus; label: string }[] = [
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'inTransit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
]

export function ShippingProgress({ status }: { status: ShippingStatus }) {
  const activeIndex = STEPS.findIndex((s) => s.value === status)

  return (
    <View style={styles.row} testID="shipping-progress">
      {STEPS.map((step, i) => (
        <View key={step.value} style={styles.stepWrap}>
          <View style={styles.stepRow}>
            <View style={[styles.dot, i <= activeIndex && styles.dotActive]} />
            {i < STEPS.length - 1 && <View style={[styles.line, i < activeIndex && styles.lineActive]} />}
          </View>
          <Text style={[styles.label, i <= activeIndex && styles.labelActive]}>{step.label}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  stepWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.royal,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  lineActive: {
    backgroundColor: colors.royal,
  },
  label: {
    fontSize: 9.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.gray,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.royal,
    fontWeight: '700',
  },
})
