import Svg, { Circle, Ellipse, G, Text as SvgText } from 'react-native-svg'
import { colors } from '../constants/colors'
import { fonts } from '../constants/fonts'

// A direct port of the circular "lot ticket" medallion illustration from
// the web hero (client/src/pages/Home.tsx) — the same 20-ellipse guilloché
// ring pattern behind a coin-style center bearing a year and denomination,
// rebuilt with react-native-svg (Expo-Go compatible) instead of raw <svg>.
// Kept parametric like the web version rather than a flattened image so it
// stays crisp at any size and the illustration logic lives in one place.
export function HeroMedallion({ size = 280 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 520 520" fill="none">
      <G opacity={0.16} stroke={colors.royal} strokeWidth={0.7}>
        {Array.from({ length: 20 }).map((_, i) => (
          <Ellipse key={i} cx={260} cy={260} rx={230} ry={90} transform={`rotate(${i * 9} 260 260)`} />
        ))}
      </G>
      <Circle cx={260} cy={260} r={150} fill={colors.white} stroke={colors.gold} strokeWidth={1.2} />
      <Circle cx={260} cy={260} r={138} fill="none" stroke={colors.champagne} strokeWidth={0.6} />
      <SvgText
        x={260}
        y={230}
        textAnchor="middle"
        fontFamily={fonts.mono}
        fontSize={13}
        letterSpacing={3}
        fill={colors.gray}
      >
        MUDRA HOUSE
      </SvgText>
      <SvgText
        x={260}
        y={275}
        textAnchor="middle"
        fontFamily={fonts.displayMedium}
        fontSize={46}
        fill={colors.royal}
      >
        1901
      </SvgText>
      <SvgText
        x={260}
        y={304}
        textAnchor="middle"
        fontFamily={fonts.mono}
        fontSize={11}
        letterSpacing={2}
        fill={colors.gray}
      >
        ONE RUPEE · SILVER
      </SvgText>
    </Svg>
  )
}
