import type { ItemSummary } from '../lib/api'

type SpecItem = Pick<
  ItemSummary,
  | 'category'
  | 'year'
  | 'material'
  | 'condition'
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

// Only the fields an item actually has are shown, so a numismatic item
// displays most of these while other categories show fewer.
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
  if (item.condition) rows.push(['Condition', item.condition])
  if (item.grade) rows.push(['Grade', item.grade])
  if (item.gradingCompany) rows.push(['Grading Company', item.gradingCompany])
  if (item.certificateNumber) rows.push(['Certificate Number', item.certificateNumber])

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between border-b border-dashed border-gray-200 pb-2 text-[13px]">
          <span className="text-gray-500">{label}</span>
          <span className="font-semibold">{value}</span>
        </div>
      ))}
    </div>
  )
}
