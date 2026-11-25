export const BODIES = ['triangle', 'square', 'hexagon', 'rhombus', 'crystal', 'pentagon']
export const EYES = ['normal', 'angry', 'tired', 'hearts', 'glasses', 'starry']
export const MOUTHS = ['smile', 'serious', 'surprised', 'tongue', 'grin']
export const HATS = ['none', 'cap', 'crown', 'horns', 'antenna', 'bow']
export const COLORS = [
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
]

export const PARTS = [
  { key: 'body', label: 'Body', options: BODIES },
  { key: 'eyes', label: 'Eyes', options: EYES },
  { key: 'mouth', label: 'Mouth', options: MOUTHS },
  { key: 'hat', label: 'Head', options: HATS },
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export function randomAvatar() {
  const color1 = pick(COLORS)
  let color2 = pick(COLORS)
  while (color2 === color1) color2 = pick(COLORS)
  return {
    body: pick(BODIES),
    eyes: pick(EYES),
    mouth: pick(MOUTHS),
    hat: pick(HATS),
    color1,
    color2,
  }
}

export function sanitizeAvatar(a) {
  if (!a || typeof a !== 'object') return randomAvatar()
  const ok = (v, list, d) => (list.includes(v) ? v : d)
  return {
    body: ok(a.body, BODIES, BODIES[0]),
    eyes: ok(a.eyes, EYES, EYES[0]),
    mouth: ok(a.mouth, MOUTHS, MOUTHS[0]),
    hat: ok(a.hat, HATS, HATS[0]),
    color1: ok(a.color1, COLORS, COLORS[0]),
    color2: ok(a.color2, COLORS, COLORS[4]),
  }
}

// ---- color helpers ----
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(rgb) {
  return (
    '#' +
    rgb
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

// amount -1..1 : negative darkens (towards deep purple), positive lightens
export function shade(hex, amount) {
  const rgb = hexToRgb(hex)
  const base = amount < 0 ? [28, 12, 48] : [255, 255, 255]
  const k = Math.min(1, Math.abs(amount))
  return rgbToHex(rgb.map((c, i) => c + (base[i] - c) * k))
}
