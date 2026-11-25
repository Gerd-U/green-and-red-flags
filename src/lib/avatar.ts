import type {
  AccessoryStyle,
  AvatarConfig,
  BottomStyle,
  EyeStyle,
  HairStyle,
  MouthStyle,
  ShoeStyle,
  TopStyle,
} from './types'

export const SKINS: string[] = ['#ffdbc4', '#f5c19c', '#e0a072', '#c68152', '#8d5a36', '#5c3a24']
export const HAIRS: HairStyle[] = ['bald', 'short', 'quiff', 'long', 'ponytail', 'bun', 'afro', 'mohawk']
export const HAIR_COLORS: string[] = [
  '#1f1a24', // black
  '#6b3e22', // brown
  '#f2c94c', // blonde
  '#d4572a', // red
  '#a7a3ad', // grey
  '#ff7eb6', // pink
  '#4b7bec', // blue
  '#2ecc71', // green
]
export const EYES: EyeStyle[] = ['normal', 'happy', 'angry', 'tired', 'hearts', 'stars']
export const MOUTHS: MouthStyle[] = ['smile', 'serious', 'surprised', 'tongue', 'teeth']
export const TOPS: TopStyle[] = ['tshirt', 'hoodie', 'jacket', 'shirt', 'dress', 'overalls']
export const BOTTOMS: BottomStyle[] = ['pants', 'shorts', 'skirt', 'ripped']
export const SHOES: ShoeStyle[] = ['sneakers', 'boots', 'flipflops', 'heels']
export const ACCESSORIES: AccessoryStyle[] = [
  'none',
  'glasses',
  'sunglasses',
  'cap',
  'crown',
  'headphones',
  'earrings',
  'flower',
  'scarf',
  'backpack',
]
/** Clothes palette */
export const COLORS: string[] = [
  '#ff3b5c', // red
  '#ff7a45', // orange
  '#ffd23f', // yellow
  '#a3e635', // lime
  '#22c55e', // green
  '#22d3ee', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ff5fa2', // pink
  '#f5f0e6', // cream
  '#2d2a3a', // black
  '#3f6fb5', // denim
]

export const LABELS: Record<string, string> = {
  quiff: 'Quiff',
  afro: 'Curly',
  bun: 'Bun',
  tshirt: 'T-shirt',
  shirt: 'Formal',
  ripped: 'Ripped jeans',
  flipflops: 'Flip-flops',
  sunglasses: 'Shades',
  none: 'Nothing',
}
export const pretty = (s: string) => LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1)

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

export function randomAvatar(): AvatarConfig {
  const topColor = pick(COLORS)
  let bottomColor = pick(COLORS)
  while (bottomColor === topColor) bottomColor = pick(COLORS)
  return {
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairColor: pick(HAIR_COLORS),
    eyes: pick(EYES),
    mouth: pick(MOUTHS),
    top: pick(TOPS),
    topColor,
    bottom: pick(BOTTOMS),
    bottomColor,
    shoes: pick(SHOES),
    // half of the random characters get an accessory
    accessory: Math.random() < 0.5 ? 'none' : pick(ACCESSORIES),
  }
}

/**
 * Validates any object coming from localStorage or the network.
 * Old saves (the polygon characters) don't have `skin`/`top`, so they get a
 * brand new random person instead of a broken mix.
 */
export function sanitizeAvatar(input: unknown): AvatarConfig {
  if (!input || typeof input !== 'object') return randomAvatar()
  const a = input as Record<string, unknown>
  if (typeof a.skin !== 'string' || typeof a.top !== 'string') return randomAvatar()
  const ok = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d)
  return {
    skin: ok(a.skin, SKINS, SKINS[1]),
    hair: ok(a.hair, HAIRS, 'short'),
    hairColor: ok(a.hairColor, HAIR_COLORS, HAIR_COLORS[0]),
    eyes: ok(a.eyes, EYES, 'normal'),
    mouth: ok(a.mouth, MOUTHS, 'smile'),
    top: ok(a.top, TOPS, 'tshirt'),
    topColor: ok(a.topColor, COLORS, COLORS[0]),
    bottom: ok(a.bottom, BOTTOMS, 'pants'),
    bottomColor: ok(a.bottomColor, COLORS, COLORS[11]),
    shoes: ok(a.shoes, SHOES, 'sneakers'),
    accessory: ok(a.accessory, ACCESSORIES, 'none'),
  }
}

// ---- color helpers ----
function hexToRgb(hex: string): number[] {
  if (typeof hex !== 'string' || hex[0] !== '#') hex = '#888888'
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(rgb: number[]): string {
  return (
    '#' +
    rgb
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

// amount -1..1 : negative darkens (towards deep purple), positive lightens
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  const base = amount < 0 ? [28, 12, 48] : [255, 255, 255]
  const k = Math.min(1, Math.abs(amount))
  return rgbToHex(rgb.map((c, i) => c + (base[i] - c) * k))
}
