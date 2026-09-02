import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native'
import { fonts } from '../constants/fonts'

export type TextVariant = 'body' | 'display' | 'mono'

const FAMILY_BY_VARIANT_AND_WEIGHT: Record<TextVariant, Record<string, string>> = {
  body: {
    '400': fonts.body,
    normal: fonts.body,
    '500': fonts.bodyMedium,
    '600': fonts.bodySemiBold,
    '700': fonts.bodyBold,
    bold: fonts.bodyBold,
  },
  display: {
    '400': fonts.display,
    normal: fonts.display,
    '500': fonts.displayMedium,
    '600': fonts.displaySemiBold,
    '700': fonts.displayBold,
    bold: fonts.displayBold,
  },
  mono: {
    '400': fonts.mono,
    normal: fonts.mono,
    '500': fonts.monoMedium,
    '600': fonts.monoSemiBold,
    '700': fonts.monoBold,
    bold: fonts.monoBold,
  },
}

export interface AppTextProps extends TextProps {
  // 'body' (Inter) is the default for ordinary text everywhere. Pass
  // 'display' for headings/titles (Newsreader, matching client/src/index.css's
  // --font-display) or 'mono' for anything that should read as IBM Plex
  // Mono — prices are better served by <LotTicket> or <MonoText> below,
  // this is for one-off tracked-caps labels etc.
  variant?: TextVariant
}

// A drop-in replacement for React Native's own Text — every screen already
// declares emphasis via a plain `fontWeight` in its StyleSheet (400/500/600/
// 700), exactly matching the four weights loaded per family, so swapping
// the 'react-native' import for this one automatically gets every existing
// Text element the correct brand font with no per-call-site changes. Only
// headings/prices need an explicit `variant` prop; everything else was
// already implicitly "body weight 400" and needed nothing.
export function Text({ variant = 'body', style, ...rest }: AppTextProps) {
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined
  const weightKey = String(flattened?.fontWeight ?? '400')
  const family = FAMILY_BY_VARIANT_AND_WEIGHT[variant][weightKey] ?? FAMILY_BY_VARIANT_AND_WEIGHT[variant]['400']
  return <RNText {...rest} style={[style, { fontFamily: family }]} />
}
