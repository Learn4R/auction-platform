import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { colors } from '../constants/colors'
import { Text } from './Text'

export type SortKey = 'recommended' | 'ending' | 'newest' | 'low' | 'high' | 'mostBids'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'ending', label: 'Ending Soon' },
  { value: 'newest', label: 'Newest' },
  { value: 'low', label: 'Lowest Bid' },
  { value: 'high', label: 'Highest Bid' },
  { value: 'mostBids', label: 'Most Bids' },
]

export function AuctionsSortModal({
  visible,
  onClose,
  value,
  onChange,
}: {
  visible: boolean
  onClose: () => void
  value: SortKey
  onChange: (v: SortKey) => void
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="sort-modal-backdrop">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} testID="sort-modal">
          <Text variant="display" style={styles.title}>
            Sort By
          </Text>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={styles.row}
              onPress={() => {
                onChange(opt.value)
                onClose()
              }}
              testID={`sort-option-${opt.value}`}
            >
              <View style={[styles.radio, value === opt.value && styles.radioActive]} />
              <Text style={[styles.rowText, value === opt.value && styles.rowTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(32,36,42,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.royal,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  radioActive: {
    borderColor: colors.royal,
    backgroundColor: colors.royal,
  },
  rowText: {
    fontSize: 14,
    color: colors.charcoal,
  },
  rowTextActive: {
    fontWeight: '700',
    color: colors.royal,
  },
})
