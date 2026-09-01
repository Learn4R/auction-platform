import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/colors'
import type { AuctionStatus } from '../lib/api'

const LABELS: Record<AuctionStatus, string> = { live: 'Live', upcoming: 'Upcoming', ended: 'Ended' }
const BG: Record<AuctionStatus, string> = {
  live: 'rgba(200, 59, 59, 0.1)',
  upcoming: 'rgba(35, 79, 140, 0.1)',
  ended: '#F3F4F6',
}
const FG: Record<AuctionStatus, string> = { live: colors.red, upcoming: colors.deepblue, ended: colors.gray }

export function StatusPill({ status }: { status: AuctionStatus }) {
  return (
    <View style={[styles.pill, { backgroundColor: BG[status] }]} testID={`status-pill-${status}`}>
      <Text style={[styles.text, { color: FG[status] }]}>{LABELS[status]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
