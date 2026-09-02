import { StyleSheet, View } from 'react-native'
import { colors } from '../constants/colors'
import type { ItemDetail } from '../lib/api'
import { Text } from './Text'

type SpecItem = Pick<
  ItemDetail,
  | 'category'
  | 'year'
  | 'material'
  | 'denomination'
  | 'mint'
  | 'rulerAuthority'
  | 'period'
  | 'weight'
  | 'diameter'
  | 'grade'
  | 'certificateNumber'
  | 'gradingCompany'
>

// Only the fields an item actually has are shown — mirrors
// client/src/components/ItemSpecs.tsx exactly.
export function ItemSpecs({ item }: { item: SpecItem }) {
  const rows: [string, string | number][] = [['Category', item.category.name]]
  if (item.year) rows.push(['Year', item.year])
  if (item.denomination) rows.push(['Denomination', item.denomination])
  if (item.mint) rows.push(['Mint', item.mint])
  if (item.rulerAuthority) rows.push(['Ruler / Authority', item.rulerAuthority])
  if (item.period) rows.push(['Period', item.period])
  if (item.material) rows.push(['Material', item.material])
  if (item.weight) rows.push(['Weight', item.weight])
  if (item.diameter) rows.push(['Diameter', item.diameter])
  if (item.grade) rows.push(['Grade', item.grade])
  if (item.gradingCompany) rows.push(['Grading Company', item.gradingCompany])
  if (item.certificateNumber) rows.push(['Certificate Number', item.certificateNumber])

  return (
    <View style={styles.grid}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  label: {
    fontSize: 13,
    color: colors.gray,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.charcoal,
  },
})
