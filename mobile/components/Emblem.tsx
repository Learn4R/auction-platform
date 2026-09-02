import type { ReactElement } from 'react'
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { colors } from '../constants/colors'
import { fonts } from '../constants/fonts'

// A direct port of the web app's parametric engraved-emblem illustration
// system (client/src/components/Emblem.tsx) to react-native-svg, standing
// in for a photo wherever an item has none. Every shape here is derived
// from the item's own fields (ruler/authority, material, denomination,
// era, certification) so a new listing automatically gets an appropriate
// look without a hardcoded per-item drawing — a coin from one ruler looks
// visibly different from another, notes look different from coins, and
// certified items show their seal, exactly mirroring web's logic. Kept in
// lockstep with the web file rather than simplified: same match tables,
// same shape math, same conditions, just swapped to RN-SVG's element set
// and the app's own loaded font families in place of raw CSS.
const ROYAL = colors.royal
const GOLD = colors.gold
const CHAMPAGNE = colors.champagne

export interface EmblemItem {
  rulerAuthority?: string | null
  material?: string | null
  denomination?: string | null
  period?: string | null
  certificateNumber?: string | null
  gradingCompany?: string | null
}

type CrownConfig = { points: number; jewels: boolean; finial: boolean; monogram: string }

// One entry per ruler/authority string already seen in the catalog. Matching
// is substring-based against a lowercased field, so close variants (e.g.
// "Victoria, Empress of India" vs "Queen Victoria") resolve to the same
// device. Anything unmatched (including rulers not listed here yet) falls
// through to the plain roundel — no crash, no guessing.
const CROWN_BY_RULER: [match: string, config: CrownConfig][] = [
  ['william', { points: 3, jewels: false, finial: false, monogram: 'W IV' }],
  ['victoria', { points: 5, jewels: true, finial: false, monogram: 'V R' }],
  ['edward', { points: 4, jewels: false, finial: true, monogram: 'E VII' }],
  ['george vi', { points: 3, jewels: false, finial: true, monogram: 'G VI' }],
  ['george v', { points: 4, jewels: true, finial: false, monogram: 'G V' }],
]

function matchCrown(rulerAuthority: string | null | undefined): CrownConfig | null {
  if (!rulerAuthority) return null
  const key = rulerAuthority.toLowerCase()
  for (const [match, config] of CROWN_BY_RULER) {
    if (key.includes(match)) return config
  }
  return null
}

function isRepublicEra(item: EmblemItem): boolean {
  const text = `${item.rulerAuthority ?? ''} ${item.period ?? ''}`.toLowerCase()
  return text.includes('republic')
}

function isNoteMaterial(material: string | null | undefined): boolean {
  return (material ?? '').toLowerCase() === 'paper'
}

// Coarse word-to-value parser for the denomination strings already in use
// ("One Rupee", "Ten Rupees", "10 Naye Paise", "Two Annas", ...). Only the
// relative size matters — it buckets notes into a border tier — so an
// unrecognised string just defaults to the plainest tier rather than erroring.
const NUMBER_WORDS: Record<string, number> = {
  quarter: 0.25,
  half: 0.5,
  one: 1,
  two: 2,
  five: 5,
  ten: 10,
  hundred: 100,
}

function parseDenominationValue(denomination: string | null | undefined): number {
  if (!denomination) return 0
  const lower = denomination.toLowerCase()
  const digitMatch = lower.match(/\d+(\.\d+)?/)
  if (digitMatch) {
    const value = Number(digitMatch[0])
    // "10 Naye Paise" etc. — paise are hundredths of a rupee.
    return lower.includes('paise') || lower.includes('paisa') ? value / 100 : value
  }
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (lower.includes(word)) return value
  }
  return 0
}

function noteTier(value: number): 'low' | 'mid' | 'high' {
  if (value >= 20) return 'high'
  if (value >= 5) return 'mid'
  return 'low'
}

function GuillocheRing() {
  return (
    <G opacity={0.5} stroke={ROYAL} strokeWidth={0.6} fill="none">
      {Array.from({ length: 12 }).map((_, i) => (
        <Ellipse key={i} cx={100} cy={100} rx={86} ry={34} transform={`rotate(${i * 15} 100 100)`} />
      ))}
    </G>
  )
}

// A geometric crown, its point count / jewels / finial all driven by props
// rather than drawn per-monarch — the visual differences below come from the
// CROWN_BY_RULER table, not from separate artwork.
function Crown({
  cx,
  cy,
  points,
  jewels,
  finial,
  scale = 1,
}: { cx: number; cy: number; scale?: number } & Omit<CrownConfig, 'monogram'>) {
  const s = scale
  const width = 34 * s
  const bandTop = cy - 4 * s
  const bandBottom = cy + 5 * s
  const peakY = cy - 16 * s
  const peakXs = Array.from({ length: points }, (_, i) => cx - width / 2 + (i * width) / (points - 1))
  const valleyXs = peakXs.slice(0, -1).map((x, i) => (x + peakXs[i + 1]!) / 2)

  const zigzag = peakXs
    .map((x, i) => {
      const segment = `L ${x} ${peakY}`
      return i < valleyXs.length ? `${segment} L ${valleyXs[i]} ${bandTop}` : segment
    })
    .join(' ')

  return (
    <G stroke={GOLD} strokeWidth={s} fill="none" strokeLinejoin="round">
      <Path
        d={`M ${cx - width / 2 - 2 * s} ${bandBottom} Q ${cx} ${bandBottom + 4 * s} ${cx + width / 2 + 2 * s} ${bandBottom}`}
      />
      <Path
        d={`M ${cx - width / 2 - 2 * s} ${bandTop} L ${cx - width / 2 - 2 * s} ${bandBottom} L ${cx + width / 2 + 2 * s} ${bandBottom} L ${cx + width / 2 + 2 * s} ${bandTop} Z`}
      />
      <Path d={`M ${peakXs[0]} ${bandTop} ${zigzag}`} />
      {jewels &&
        peakXs.map((x, i) => <Circle key={i} cx={x} cy={peakY - 2 * s} r={1.3 * s} fill={CHAMPAGNE} stroke="none" />)}
      {finial && (
        <>
          <Circle cx={cx} cy={peakY - 6 * s} r={2 * s} fill="none" />
          <Path
            d={`M ${cx} ${peakY - 8.5 * s} L ${cx} ${peakY - 3.5 * s} M ${cx - 2 * s} ${peakY - 6 * s} L ${cx + 2 * s} ${peakY - 6 * s}`}
          />
        </>
      )}
    </G>
  )
}

// Abstracted, deliberately non-literal stand-in for the Ashoka Lion Capital —
// a fluted column, an abacus band, three overlapping roundels suggesting the
// lions seen from the front, and a spoked wheel for the chakra. Shared by
// Republic-era coins and Republic-era notes alike.
function AshokaDevice({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const s = scale
  return (
    <G stroke={GOLD} strokeWidth={0.9 / s} fill="none" transform={`translate(${cx} ${cy}) scale(${s})`}>
      {/* three lion roundels, front-on abstraction, sitting above the capital */}
      <Circle cx={-5} cy={-9} r={4.5} />
      <Circle cx={0} cy={-10} r={5} />
      <Circle cx={5} cy={-9} r={4.5} />
      {/* abacus band */}
      <Rect x={-9} y={-4} width={18} height={3.5} rx={1} />
      {/* short fluted column below the capital */}
      <Line x1={-3} y1={-0.3} x2={-3} y2={6} />
      <Line x1={0} y1={-0.3} x2={0} y2={6} strokeWidth={1.4 / s} />
      <Line x1={3} y1={-0.3} x2={3} y2={6} />
      {/* Ashoka Chakra, spaced apart from the pillar */}
      <Circle cy={19} r={8} strokeWidth={0.7 / s} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Line
          key={i}
          x1={0}
          y1={19}
          x2={8 * Math.cos((i * Math.PI) / 4)}
          y2={19 + 8 * Math.sin((i * Math.PI) / 4)}
          strokeWidth={0.5 / s}
        />
      ))}
    </G>
  )
}

function CoinFace({ item }: { item: EmblemItem }) {
  if (isRepublicEra(item)) {
    return (
      <>
        <Circle cx={100} cy={100} r={58} fill={colors.white} stroke={GOLD} strokeWidth={1.1} />
        <Circle cx={100} cy={100} r={52} fill="none" stroke={CHAMPAGNE} strokeWidth={0.5} />
        <AshokaDevice cx={100} cy={82} scale={1.15} />
      </>
    )
  }

  const crown = matchCrown(item.rulerAuthority)
  return (
    <>
      <Circle cx={100} cy={100} r={58} fill={colors.white} stroke={GOLD} strokeWidth={1.1} />
      <Circle cx={100} cy={100} r={52} fill="none" stroke={CHAMPAGNE} strokeWidth={0.5} />
      {crown ? (
        <>
          <Crown cx={100} cy={92} points={crown.points} jewels={crown.jewels} finial={crown.finial} />
          <SvgText x={100} y={128} textAnchor="middle" fontFamily={fonts.displayMediumItalic} fontSize={17} fill={ROYAL}>
            {crown.monogram}
          </SvgText>
        </>
      ) : (
        <Circle cx={100} cy={100} r={30} fill="none" stroke={ROYAL} strokeWidth={0.5} opacity={0.4} />
      )}
    </>
  )
}

type Flip = 1 | -1

// Each corner ornament is drawn as if in the top-left, then mirrored into
// place by flipX/flipY — so the four corners of a frame always stay in sync
// with each other while still varying, as a set, by denomination tier.
const NOTE_CORNER: Record<'low' | 'mid' | 'high', (x: number, y: number, flipX: Flip, flipY: Flip) => ReactElement> = {
  low: (x, y, flipX, flipY) => (
    <Path d={`M ${x} ${y + 9 * flipY} L ${x} ${y} L ${x + 9 * flipX} ${y}`} stroke={GOLD} strokeWidth={1} fill="none" />
  ),
  mid: (x, y, flipX, flipY) => (
    <Path
      d={`M ${x} ${y + 10 * flipY} Q ${x} ${y} ${x + 10 * flipX} ${y}`}
      stroke={GOLD}
      strokeWidth={1}
      fill="none"
    />
  ),
  high: (x, y) => (
    <>
      <Circle cx={x} cy={y} r={5} stroke={GOLD} strokeWidth={0.9} fill="none" />
      <Circle cx={x} cy={y} r={2} stroke={CHAMPAGNE} strokeWidth={0.7} fill="none" />
    </>
  ),
}

function NoteFace({ item }: { item: EmblemItem }) {
  const tier = noteTier(parseDenominationValue(item.denomination))
  const republic = isRepublicEra(item)
  const x0 = 34
  const y0 = 68
  const w = 132
  const h = 64
  const numeral = item.denomination?.match(/\d+/)?.[0] ?? null
  const corner = NOTE_CORNER[tier]

  return (
    <>
      <Rect x={x0} y={y0} width={w} height={h} rx={3} fill={colors.white} stroke={GOLD} strokeWidth={1.1} />
      <Rect
        x={x0 + 6}
        y={y0 + 6}
        width={w - 12}
        height={h - 12}
        rx={2}
        fill="none"
        stroke={CHAMPAGNE}
        strokeWidth={0.5}
      />

      {corner(x0 + 10, y0 + 10, 1, 1)}
      {corner(x0 + w - 10, y0 + 10, -1, 1)}
      {corner(x0 + 10, y0 + h - 10, 1, -1)}
      {corner(x0 + w - 10, y0 + h - 10, -1, -1)}

      {republic ? (
        <AshokaDevice cx={100} cy={y0 + h / 2 - 8} scale={0.75} />
      ) : (
        <>
          <Ellipse cx={100} cy={y0 + h / 2} rx={15} ry={18} fill="none" stroke={GOLD} strokeWidth={0.8} />
          <Crown cx={100} cy={y0 + h / 2 - 1} points={4} jewels={false} finial={false} scale={0.55} />
        </>
      )}

      {numeral && (
        <>
          <SvgText x={x0 + 15} y={y0 + h - 12} textAnchor="middle" fontFamily={fonts.display} fontSize={12} fill={ROYAL}>
            {numeral}
          </SvgText>
          <SvgText x={x0 + w - 15} y={y0 + 22} textAnchor="middle" fontFamily={fonts.display} fontSize={12} fill={ROYAL}>
            {numeral}
          </SvgText>
        </>
      )}
    </>
  )
}

function CertSeal() {
  return (
    <G transform="translate(150 46)">
      <Path d="M -3 8 L -3 26 L 0 22 L 3 26 L 3 8 Z" fill={GOLD} opacity={0.9} />
      <Circle r={15} fill={colors.white} stroke={GOLD} strokeWidth={1.3} />
      <Circle r={11.5} fill="none" stroke={CHAMPAGNE} strokeWidth={0.6} />
      <Path
        d="M -5.5 0.5 L -2 4.5 L 5.5 -4.5"
        stroke={ROYAL}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  )
}

export function Emblem({ item, label, size = 64 }: { item?: EmblemItem; label?: string; size?: number }) {
  const certified = Boolean(item?.certificateNumber && item?.gradingCompany)
  const recognised = item && (item.rulerAuthority || item.denomination || isNoteMaterial(item.material))

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none" stroke={ROYAL} strokeWidth={0.6}>
      <GuillocheRing />

      {recognised && item ? (
        isNoteMaterial(item.material) ? (
          <NoteFace item={item} />
        ) : (
          <CoinFace item={item} />
        )
      ) : (
        <>
          <Circle cx={100} cy={100} r={58} fill={colors.white} stroke={GOLD} strokeWidth={1.1} />
          <Circle cx={100} cy={100} r={52} fill="none" stroke={CHAMPAGNE} strokeWidth={0.5} />
          {label && (
            <SvgText x={100} y={106} textAnchor="middle" fontFamily={fonts.displayMedium} fontSize={15} fill={ROYAL}>
              {label}
            </SvgText>
          )}
        </>
      )}

      {certified && <CertSeal />}
    </Svg>
  )
}
