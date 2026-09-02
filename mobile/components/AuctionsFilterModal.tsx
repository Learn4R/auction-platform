import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { CollapsibleSection } from './CollapsibleSection'
import { colors } from '../constants/colors'
import type { AuctionStatus, Category, ItemFilterOptions } from '../lib/api'

export interface AuctionFilters {
  status: AuctionStatus | 'all'
  categorySlugs: Set<string>
  minPrice: string
  maxPrice: string
  year: string | null
  material: string | null
  condition: string | null
  grade: string | null
  hasCertificate: boolean
}

export const EMPTY_FILTERS: AuctionFilters = {
  status: 'all',
  categorySlugs: new Set(),
  minPrice: '',
  maxPrice: '',
  year: null,
  material: null,
  condition: null,
  grade: null,
  hasCertificate: false,
}

const STATUS_OPTIONS: { value: AuctionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
]

function StatusPills({ value, onChange }: { value: AuctionStatus | 'all'; onChange: (v: AuctionStatus | 'all') => void }) {
  return (
    <View style={styles.chipWrap}>
      {STATUS_OPTIONS.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[styles.chip, value === opt.value && styles.chipActive]}
          testID={`filter-status-${opt.value}`}
        >
          <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function AttributeChips({
  value,
  options,
  onChange,
}: {
  value: string | null
  options: (string | number)[]
  onChange: (v: string | null) => void
}) {
  return (
    <View style={styles.chipWrap}>
      <Pressable
        onPress={() => onChange(null)}
        style={[styles.chip, value === null && styles.chipActive]}
        testID="attr-chip-all"
      >
        <Text style={[styles.chipText, value === null && styles.chipTextActive]}>All</Text>
      </Pressable>
      {options.map((opt) => {
        const str = String(opt)
        return (
          <Pressable
            key={str}
            onPress={() => onChange(str)}
            style={[styles.chip, value === str && styles.chipActive]}
            testID={`attr-chip-${str}`}
          >
            <Text style={[styles.chipText, value === str && styles.chipTextActive]}>{str}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function activeFilterCount(f: AuctionFilters): number {
  return (
    (f.status !== 'all' ? 1 : 0) +
    f.categorySlugs.size +
    (f.minPrice || f.maxPrice ? 1 : 0) +
    (f.year ? 1 : 0) +
    (f.material ? 1 : 0) +
    (f.condition ? 1 : 0) +
    (f.grade ? 1 : 0) +
    (f.hasCertificate ? 1 : 0)
  )
}

export function AuctionsFilterModal({
  visible,
  onClose,
  filters,
  onChange,
  categories,
  filterOptions,
}: {
  visible: boolean
  onClose: () => void
  filters: AuctionFilters
  onChange: (next: AuctionFilters) => void
  categories: Category[]
  filterOptions: ItemFilterOptions | null
}) {
  function update<K extends keyof AuctionFilters>(key: K, value: AuctionFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  function toggleCategory(slug: string) {
    const next = new Set(filters.categorySlugs)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    update('categorySlugs', next)
  }

  const count = activeFilterCount(filters)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container} testID="filter-modal">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filters</Text>
          <Pressable onPress={onClose} testID="filter-modal-close" hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <StatusPills value={filters.status} onChange={(v) => update('status', v)} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryList}>
              {categories.map((cat) => {
                const checked = filters.categorySlugs.has(cat.slug)
                return (
                  <Pressable
                    key={cat.id}
                    style={styles.categoryRow}
                    onPress={() => toggleCategory(cat.slug)}
                    testID={`filter-category-${cat.slug}`}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]} />
                    <Text style={styles.categoryLabel}>{cat.name}</Text>
                    <Text style={styles.categoryCount}>{cat.itemCount}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Range (₹)</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="Min"
                keyboardType="numeric"
                value={filters.minPrice}
                onChangeText={(v) => update('minPrice', v)}
                testID="filter-min-price"
              />
              <Text style={styles.priceDash}>–</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="Max"
                keyboardType="numeric"
                value={filters.maxPrice}
                onChangeText={(v) => update('maxPrice', v)}
                testID="filter-max-price"
              />
            </View>
          </View>

          {filterOptions && (
            <View>
              {filterOptions.year.length > 0 && (
                <CollapsibleSection title="Year" badge={filters.year} testID="filter-section-year">
                  <AttributeChips value={filters.year} options={filterOptions.year} onChange={(v) => update('year', v)} />
                </CollapsibleSection>
              )}
              {filterOptions.material.length > 0 && (
                <CollapsibleSection title="Material" badge={filters.material} testID="filter-section-material">
                  <AttributeChips
                    value={filters.material}
                    options={filterOptions.material}
                    onChange={(v) => update('material', v)}
                  />
                </CollapsibleSection>
              )}
              {filterOptions.condition.length > 0 && (
                <CollapsibleSection title="Condition" badge={filters.condition} testID="filter-section-condition">
                  <AttributeChips
                    value={filters.condition}
                    options={filterOptions.condition}
                    onChange={(v) => update('condition', v)}
                  />
                </CollapsibleSection>
              )}
              {filterOptions.grade.length > 0 && (
                <CollapsibleSection title="Grade" badge={filters.grade} testID="filter-section-grade">
                  <AttributeChips value={filters.grade} options={filterOptions.grade} onChange={(v) => update('grade', v)} />
                </CollapsibleSection>
              )}
            </View>
          )}

          <Pressable
            style={styles.certificateRow}
            onPress={() => update('hasCertificate', !filters.hasCertificate)}
            testID="filter-has-certificate"
          >
            <View style={[styles.checkbox, filters.hasCertificate && styles.checkboxChecked]} />
            <Text style={styles.categoryLabel}>Certificate Available</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.footerButton, styles.resetButton]}
            onPress={() => onChange(EMPTY_FILTERS)}
            disabled={count === 0}
            testID="filter-reset"
          >
            <Text style={[styles.resetButtonText, count === 0 && styles.disabledText]}>Reset all</Text>
          </Pressable>
          <Pressable style={[styles.footerButton, styles.showButton]} onPress={onClose} testID="filter-show-results">
            <Text style={styles.showButtonText}>Show Results</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.royal,
  },
  closeText: {
    fontSize: 18,
    color: colors.gray,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.royal,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.royal,
    borderColor: colors.royal,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.charcoal,
  },
  chipTextActive: {
    color: colors.white,
  },
  categoryList: {
    gap: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.royal,
  },
  checkboxChecked: {
    backgroundColor: colors.royal,
  },
  categoryLabel: {
    fontSize: 13.5,
    color: colors.charcoal,
    flex: 1,
  },
  categoryCount: {
    fontSize: 11,
    color: colors.gray,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: colors.charcoal,
    backgroundColor: colors.white,
  },
  priceInput: {
    flex: 1,
  },
  priceDash: {
    color: colors.gray,
  },
  certificateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  resetButton: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    color: colors.charcoal,
    fontWeight: '600',
    fontSize: 13.5,
  },
  disabledText: {
    color: colors.gray,
    opacity: 0.5,
  },
  showButton: {
    backgroundColor: colors.royal,
  },
  showButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13.5,
  },
})
