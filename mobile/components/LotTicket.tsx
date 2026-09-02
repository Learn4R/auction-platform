import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors } from '../constants/colors'
import { Text } from './Text'

export type LotTicketSize = 'sm' | 'md' | 'lg'
export type LotTicketTheme = 'light' | 'dark'

// The web app's signature bordered numeric "ticket" — an ivory/white card
// with a thin gold border, a small uppercase tracked mono label, and a
// larger bold mono value underneath (e.g. `rounded-xl border border-gold/40
// bg-white p-4` in client/src/pages/Sell.tsx's KPI cards, or the price box
// in client/src/pages/ItemDetail.tsx's sidebar). One shared component now
// used everywhere a price/bid renders on mobile instead of plain text.
//
// `theme="dark"` is for the Live Auction screen specifically — its dark
// immersive background is a deliberate, correct departure from the rest of
// the (ivory) app, matching client/src/pages/LiveAuction.tsx's own
// `border-white/15 bg-white/5` stat boxes, so the ticket there uses a
// translucent-white-on-dark treatment instead of the ivory/gold one rather
// than looking pasted-on. Every other screen uses the default light theme.
export function LotTicket({
  label,
  value,
  size = 'md',
  theme = 'light',
  valueColor,
  align = 'left',
  style,
  testID,
  valueTestID,
}: {
  label: string
  value: string
  size?: LotTicketSize
  theme?: LotTicketTheme
  /** Defaults to colors.royal (light theme) or colors.gold (dark theme). */
  valueColor?: string
  align?: 'left' | 'center'
  style?: StyleProp<ViewStyle>
  testID?: string
  /** testID on just the value Text, for reading the price string alone. */
  valueTestID?: string
}) {
  const resolvedValueColor = valueColor ?? (theme === 'dark' ? colors.gold : colors.royal)

  return (
    <View
      style={[
        styles.ticket,
        SIZE_PADDING[size],
        theme === 'dark' ? styles.ticketDark : styles.ticketLight,
        align === 'center' && styles.alignCenter,
        style,
      ]}
      testID={testID}
    >
      <Text
        variant="mono"
        style={[
          styles.label,
          FONT_SIZE_LABEL[size],
          theme === 'dark' ? styles.labelDark : styles.labelLight,
          align === 'center' && styles.textCenter,
        ]}
      >
        {label}
      </Text>
      <Text
        variant="mono"
        testID={valueTestID}
        style={[
          styles.value,
          FONT_SIZE_VALUE[size],
          { color: resolvedValueColor },
          align === 'center' && styles.textCenter,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

const SIZE_PADDING: Record<LotTicketSize, ViewStyle> = {
  sm: { paddingHorizontal: 10, paddingVertical: 8 },
  md: { paddingHorizontal: 14, paddingVertical: 12 },
  lg: { paddingHorizontal: 16, paddingVertical: 16 },
}

const FONT_SIZE_LABEL: Record<LotTicketSize, { fontSize: number }> = {
  sm: { fontSize: 8.5 },
  md: { fontSize: 9.5 },
  lg: { fontSize: 10 },
}

const FONT_SIZE_VALUE: Record<LotTicketSize, { fontSize: number }> = {
  sm: { fontSize: 15 },
  md: { fontSize: 22 },
  lg: { fontSize: 30 },
}

const styles = StyleSheet.create({
  ticket: {
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  ticketLight: {
    backgroundColor: colors.ivory,
    borderColor: 'rgba(201,162,39,0.4)',
  },
  ticketDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  alignCenter: {
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  label: {
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 3,
  },
  labelLight: {
    color: colors.gray,
  },
  labelDark: {
    color: 'rgba(255,255,255,0.5)',
  },
  value: {
    fontWeight: '700',
  },
  textCenter: {
    textAlign: 'center',
  },
})
