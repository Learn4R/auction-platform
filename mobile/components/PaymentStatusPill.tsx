import { StyleSheet, View } from 'react-native'
import { colors } from '../constants/colors'
import type { PaymentStatus } from '../lib/api'
import { Text } from './Text'

// Mirrors client/src/components/OrderStatus.tsx's PaymentStatusBadge —
// including its font-mono treatment for the pill text.
const BG: Record<PaymentStatus, string> = {
  pending: 'rgba(201,162,39,0.1)',
  paid: 'rgba(22,133,91,0.1)',
  failed: 'rgba(200,59,59,0.1)',
  refunded: '#F3F4F6',
}
const FG: Record<PaymentStatus, string> = {
  pending: '#8a6e18',
  paid: colors.green,
  failed: colors.red,
  refunded: colors.gray,
}
const LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending Payment',
  paid: 'Paid',
  failed: 'Payment Failed',
  refunded: 'Refunded',
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return (
    <View style={[styles.pill, { backgroundColor: BG[status] }]} testID={`payment-status-pill-${status}`}>
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
