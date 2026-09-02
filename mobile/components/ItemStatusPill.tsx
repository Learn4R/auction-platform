import { StyleSheet, View } from 'react-native'
import { colors } from '../constants/colors'
import type { ItemStatus } from '../lib/api'
import { Text } from './Text'

// Mirrors client/src/components/ItemStatusBadge.tsx — same status set,
// same colors, same labels, same font-mono treatment, just as a native
// pill instead of a <span>.
const BG: Record<ItemStatus, string> = {
  draft: '#F3F4F6',
  submitted: 'rgba(201,162,39,0.1)',
  under_review: 'rgba(35,79,140,0.1)',
  changes_requested: 'rgba(200,59,59,0.1)',
  approved: 'rgba(22,133,91,0.1)',
  rejected: 'rgba(200,59,59,0.1)',
}
const FG: Record<ItemStatus, string> = {
  draft: colors.gray,
  submitted: '#8a6e18',
  under_review: colors.deepblue,
  changes_requested: colors.red,
  approved: colors.green,
  rejected: colors.red,
}
const LABELS: Record<ItemStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function ItemStatusPill({ status }: { status: ItemStatus }) {
  return (
    <View style={[styles.pill, { backgroundColor: BG[status] }]} testID={`item-status-pill-${status}`}>
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
