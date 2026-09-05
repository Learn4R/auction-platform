import { StyleSheet, View } from 'react-native'
import { colors } from '../constants/colors'
import type { PayoutStatus } from '../lib/api'
import { Text } from './Text'

// Mirrors client/src/components/OrderStatus.tsx's PayoutStatusBadge —
// same status set, same colors, same labels, same font-mono treatment.
const BG: Record<PayoutStatus, string> = {
  pending: 'rgba(201,162,39,0.1)',
  processing: 'rgba(35,79,140,0.1)',
  paid: 'rgba(22,133,91,0.1)',
  failed: 'rgba(200,59,59,0.1)',
  on_hold: '#F3F4F6',
}
const FG: Record<PayoutStatus, string> = {
  pending: '#8a6e18',
  processing: colors.deepblue,
  paid: colors.green,
  failed: colors.red,
  on_hold: colors.gray,
}
const LABELS: Record<PayoutStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
  on_hold: 'On Hold',
}

export function PayoutStatusPill({ status }: { status: PayoutStatus }) {
  return (
    <View style={[styles.pill, { backgroundColor: BG[status] }]} testID={`payout-status-pill-${status}`}>
      <Text variant="mono" style={[styles.text, { color: FG[status] }]}>
        {LABELS[status]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
