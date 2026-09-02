import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors } from '../constants/colors'
import { Text } from './Text'

// A tap-to-expand section for the less-frequently-used attribute filters
// (Year, Material, Condition, Grade) — keeps the filter modal from feeling
// overwhelming on a small screen, while Status/Category/Price stay always
// visible since they're the filters people reach for first.
export function CollapsibleSection({
  title,
  badge,
  children,
  testID,
}: {
  title: string
  badge?: string | null
  children: React.ReactNode
  testID?: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded((v) => !v)} testID={testID}>
        <View style={styles.headerLeft}>
          <Text variant="mono" style={styles.title}>
            {title}
          </Text>
          {badge && (
            <Text variant="mono" style={styles.badge}>
              {badge}
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.royal,
    textTransform: 'uppercase',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
  },
  chevron: {
    fontSize: 10,
    color: colors.gray,
  },
  body: {
    paddingBottom: 14,
  },
})
