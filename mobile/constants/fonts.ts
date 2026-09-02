// The three brand type families from client/src/index.css's @theme block —
// display: Newsreader (serif headings), body: Inter, mono: IBM Plex Mono
// (prices, bid amounts, uppercase tracked labels — the "lot ticket" look).
// Each weight is its own separate font file/family under Expo's Google
// Fonts packages, so there's one exported name per family+weight rather
// than a single family name plus a `fontWeight` — see components/Text.tsx,
// which maps a plain `fontWeight` style value to the right one of these
// automatically so call sites don't need to know this detail.
export const fonts = {
  display: 'Newsreader_400Regular',
  displayMedium: 'Newsreader_500Medium',
  displaySemiBold: 'Newsreader_600SemiBold',
  displayBold: 'Newsreader_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemiBold: 'IBMPlexMono_600SemiBold',
  monoBold: 'IBMPlexMono_700Bold',
}

// The exact font map to pass to useFonts() in app/_layout.tsx.
export { Newsreader_400Regular, Newsreader_500Medium, Newsreader_600SemiBold, Newsreader_700Bold } from '@expo-google-fonts/newsreader'
export { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
export {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  IBMPlexMono_700Bold,
} from '@expo-google-fonts/ibm-plex-mono'
