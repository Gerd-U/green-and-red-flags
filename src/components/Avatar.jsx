import { memo } from 'react'
import { shade } from '../lib/avatar'

// Every avatar is drawn in the same box. The body polygon is split into
// facets (outer ring + inner fan) and each facet gets a flat shade depending
// on which way it "faces" a light coming from the top-left: low poly look.

const SHAPES = {
  triangle: { pts: [[60, 30], [113, 134], [7, 134]], c: [60, 98], face: 94, top: 50, topW: 22 },
  square: { pts: [[14, 40], [106, 40], [106, 134], [14, 134]], c: [60, 87], face: 78, top: 40, topW: 46 },
  hexagon: { pts: [[60, 32], [107, 58], [107, 112], [60, 138], [13, 112], [13, 58]], c: [60, 85], face: 78, top: 40, topW: 30 },
  rhombus: { pts: [[60, 28], [114, 86], [60, 142], [6, 86]], c: [60, 86], face: 82, top: 38, topW: 20 },
  crystal: { pts: [[46, 34], [80, 28], [108, 62], [100, 120], [66, 138], [20, 126], [10, 72]], c: [58, 84], face: 76, top: 33, topW: 36 },
  pentagon: { pts: [[60, 30], [110, 68], [92, 136], [28, 136], [10, 68]], c: [60, 90], face: 84, top: 40, topW: 28 },
}

const INK = '#1b1030'
const LIGHT = [-0.55, -0.83]

const pts = (arr) => arr.map((p) => p.join(',')).join(' ')

function facetShade(cx, cy, tri) {
  const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3 - cx
  const my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3 - cy
  const len = Math.hypot(mx, my) || 1
  return (mx * LIGHT[0] + my * LIGHT[1]) / len // -1 .. 1
}

const facetCache = new Map()
function bodyFacets(body, shape, color) {
  const key = body + color
  if (facetCache.has(key)) return facetCache.get(key)
  const [cx, cy] = shape.c
  const outer = shape.pts
  const inner = outer.map(([x, y]) => [cx - 3 + (x - cx) * 0.52, cy - 5 + (y - cy) * 0.52])
  const hub = [cx - 4, cy - 7]
  const out = []
  const n = outer.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const t1 = [outer[i], outer[j], inner[i]]
    const t2 = [outer[j], inner[j], inner[i]]
    const t3 = [inner[i], inner[j], hub]
    const s1 = facetShade(cx, cy, t1)
    const s2 = facetShade(cx, cy, t2)
    const s3 = facetShade(cx, cy, t3)
    out.push({ p: pts(t1), f: shade(color, s1 > 0 ? s1 * 0.3 : s1 * 0.42) })
    out.push({ p: pts(t2), f: shade(color, s2 > 0 ? s2 * 0.18 + 0.04 : s2 * 0.3) })
    out.push({ p: pts(t3), f: shade(color, s3 > 0 ? s3 * 0.22 + 0.12 : s3 * 0.15 + 0.06) })
  }
  facetCache.set(key, out)
  return out
}

const eyeShape = (x, y) => [[x, y - 8], [x + 8, y - 3], [x + 8, y + 4], [x, y + 9], [x - 8, y + 4], [x - 8, y - 3]]

function Eyes({ type, mood, y }) {
  const L = 44
  const R = 76
  if (mood === 'happy') {
    return (
      <g stroke={INK} strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <polyline points={`${L - 7},${y + 3} ${L},${y - 4} ${L + 7},${y + 3}`} />
        <polyline points={`${R - 7},${y + 3} ${R},${y - 4} ${R + 7},${y + 3}`} />
      </g>
    )
  }
  if (mood === 'horror') {
    return (
      <g>
        {[L, R].map((x) => (
          <g key={x}>
            <polygon points={pts([[x, y - 11], [x + 10, y - 5], [x + 10, y + 6], [x, y + 12], [x - 10, y + 6], [x - 10, y - 5]])} fill="#fff" stroke={INK} strokeWidth="2.5" />
            <rect x={x - 2} y={y - 1} width="4" height="4" fill={INK} />
          </g>
        ))}
        <polyline points={`${L - 10},${y - 15} ${L + 6},${y - 19}`} stroke={INK} strokeWidth="3" />
        <polyline points={`${R + 10},${y - 15} ${R - 6},${y - 19}`} stroke={INK} strokeWidth="3" />
      </g>
    )
  }
  switch (type) {
    case 'angry':
      return (
        <g>
          {[L, R].map((x) => (
            <g key={x}>
              <polygon points={pts(eyeShape(x, y))} fill="#fff" stroke={INK} strokeWidth="2" />
              <polygon points={pts([[x - 3, y], [x + 3, y], [x, y + 5]])} fill={INK} />
            </g>
          ))}
          <polygon points={pts([[L - 11, y - 14], [L + 10, y - 6], [L + 9, y - 2], [L - 11, y - 9]])} fill={INK} />
          <polygon points={pts([[R + 11, y - 14], [R - 10, y - 6], [R - 9, y - 2], [R + 11, y - 9]])} fill={INK} />
        </g>
      )
    case 'tired':
      return (
        <g>
          {[L, R].map((x) => (
            <g key={x}>
              <polygon points={pts(eyeShape(x, y))} fill="#fff" stroke={INK} strokeWidth="2" />
              <polygon points={pts([[x - 3, y + 2], [x + 3, y + 2], [x, y + 7]])} fill={INK} />
              <polygon points={pts([[x - 9, y - 4], [x, y - 9], [x + 9, y - 4], [x + 9, y + 1], [x - 9, y + 1]])} fill="#6b5b86" stroke={INK} strokeWidth="2" />
              <polyline points={`${x - 7},${y + 13} ${x},${y + 15} ${x + 7},${y + 13}`} stroke="#6b5b86" strokeWidth="2" fill="none" />
            </g>
          ))}
        </g>
      )
    case 'hearts':
      return (
        <g>
          {[L, R].map((x) => (
            <g key={x}>
              <polygon points={pts([[x, y + 9], [x - 10, y - 1], [x - 9, y - 7], [x - 4, y - 9], [x, y - 4], [x + 4, y - 9], [x + 9, y - 7], [x + 10, y - 1]])} fill="#ff2d6f" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
              <polygon points={pts([[x - 7, y - 4], [x - 4, y - 7], [x - 3, y - 3]])} fill="#ff9dbd" />
            </g>
          ))}
        </g>
      )
    case 'glasses':
      return (
        <g>
          {[L, R].map((x) => (
            <g key={x}>
              <rect x={x - 11} y={y - 9} width="22" height="18" fill="#bfe9ff" fillOpacity={mood ? 0.25 : 1} stroke={INK} strokeWidth="3.5" />
              {!mood && <polygon points={pts([[x - 8, y - 6], [x - 2, y - 6], [x - 8, y + 2]])} fill="#fff" opacity="0.8" />}
              {!mood && <rect x={x - 2} y={y - 1} width="5" height="5" fill={INK} />}
            </g>
          ))}
          <line x1={L + 11} y1={y - 3} x2={R - 11} y2={y - 3} stroke={INK} strokeWidth="3.5" />
        </g>
      )
    case 'starry':
      return (
        <g>
          {[L, R].map((x) => (
            <g key={x}>
              <polygon points={pts(eyeShape(x, y))} fill={INK} />
              <polygon points={pts([[x, y - 6], [x + 2, y - 1], [x + 6, y], [x + 2, y + 2], [x, y + 6], [x - 2, y + 2], [x - 6, y], [x - 2, y - 1]])} fill="#ffe14d" />
            </g>
          ))}
        </g>
      )
    default:
      return (
        <g>
          {[L, R].map((x) => (
            <g key={x}>
              <polygon points={pts(eyeShape(x, y))} fill="#fff" stroke={INK} strokeWidth="2" />
              <polygon points={pts([[x + 1, y - 4], [x + 5, y + 1], [x + 1, y + 5], [x - 3, y + 1]])} fill={INK} />
              <rect x={x + 1} y={y - 3} width="2" height="2" fill="#fff" />
            </g>
          ))}
        </g>
      )
  }
}

function Mouth({ type, mood, y }) {
  const m = mood === 'happy' ? 'happy' : mood === 'horror' ? 'horror' : type
  switch (m) {
    case 'happy':
      return (
        <g>
          <polygon points={pts([[44, y - 3], [76, y - 3], [70, y + 9], [60, y + 13], [50, y + 9]])} fill={INK} />
          <polygon points={pts([[52, y + 7], [60, y + 4], [68, y + 7], [60, y + 12]])} fill="#ff6b8a" />
        </g>
      )
    case 'horror':
      return (
        <g>
          <polygon points={pts([[50, y - 4], [70, y - 4], [74, y + 6], [68, y + 16], [52, y + 16], [46, y + 6]])} fill={INK} />
          <polyline points={`50,${y - 2} 54,${y + 2} 58,${y - 2} 62,${y + 2} 66,${y - 2} 70,${y + 2}`} stroke="#fff" strokeWidth="2" fill="none" />
        </g>
      )
    case 'serious':
      return <rect x="48" y={y} width="24" height="4" fill={INK} />
    case 'surprised':
      return <polygon points={pts([[60, y - 5], [66, y - 2], [66, y + 5], [60, y + 8], [54, y + 5], [54, y - 2]])} fill={INK} />
    case 'tongue':
      return (
        <g>
          <polygon points={pts([[47, y - 2], [73, y - 2], [66, y + 5], [54, y + 5]])} fill={INK} />
          <polygon points={pts([[56, y + 3], [66, y + 3], [65, y + 12], [61, y + 14], [57, y + 12]])} fill="#ff6b8a" stroke={INK} strokeWidth="1.5" />
        </g>
      )
    case 'grin':
      return (
        <g>
          <polygon points={pts([[44, y - 3], [76, y - 3], [70, y + 7], [50, y + 7]])} fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <line x1="53" y1={y - 3} x2="53" y2={y + 7} stroke={INK} strokeWidth="1.5" />
          <line x1="60" y1={y - 3} x2="60" y2={y + 7} stroke={INK} strokeWidth="1.5" />
          <line x1="67" y1={y - 3} x2="67" y2={y + 7} stroke={INK} strokeWidth="1.5" />
        </g>
      )
    default: // smile
      return <polygon points={pts([[46, y - 2], [52, y + 6], [60, y + 9], [68, y + 6], [74, y - 2], [68, y + 2], [60, y + 4], [52, y + 2]])} fill={INK} />
  }
}

function Hat({ type, shape, c2 }) {
  const y = shape.top
  const w = shape.topW
  const light = shade(c2, 0.3)
  const dark = shade(c2, -0.3)
  switch (type) {
    case 'cap':
      return (
        <g>
          <polygon points={pts([[60 - w / 2 - 8, y + 4], [60 - w / 2 - 2, y - 14], [60, y - 20], [60, y + 4]])} fill={light} />
          <polygon points={pts([[60, y - 20], [60 + w / 2 + 2, y - 14], [60 + w / 2 + 8, y + 4], [60, y + 4]])} fill={c2} />
          <polygon points={pts([[60 + w / 2 + 4, y - 2], [60 + w / 2 + 30, y + 3], [60 + w / 2 + 4, y + 5]])} fill={dark} />
          <rect x="57" y={y - 24} width="6" height="5" fill={dark} />
        </g>
      )
    case 'crown':
      return (
        <g>
          <polygon points={pts([[38, y + 4], [36, y - 22], [47, y - 10], [60, y - 28], [73, y - 10], [84, y - 22], [82, y + 4]])} fill="#ffd23f" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <polygon points={pts([[47, y - 10], [60, y - 28], [60, y + 4], [38, y + 4]])} fill="#ffe680" />
          <polygon points={pts([[60, y - 9], [64, y - 5], [60, y - 1], [56, y - 5]])} fill={c2} stroke={INK} strokeWidth="1.5" />
        </g>
      )
    case 'horns':
      return (
        <g>
          <polygon points={pts([[40, y + 12], [30, y - 22], [52, y + 8]])} fill={c2} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <polygon points={pts([[40, y + 12], [30, y - 22], [44, y + 10]])} fill={light} />
          <polygon points={pts([[80, y + 12], [90, y - 22], [68, y + 8]])} fill={c2} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <polygon points={pts([[80, y + 12], [90, y - 22], [86, y + 10]])} fill={dark} />
        </g>
      )
    case 'antenna':
      return (
        <g>
          <polyline points={`60,${y + 4} 60,${y - 14} 68,${y - 22}`} stroke={INK} strokeWidth="3" fill="none" strokeLinejoin="round" />
          <polygon points={pts([[68, y - 32], [76, y - 26], [72, y - 17], [62, y - 18], [61, y - 27]])} fill={c2} stroke={INK} strokeWidth="2" />
          <polygon points={pts([[68, y - 32], [61, y - 27], [68, y - 24]])} fill={light} />
        </g>
      )
    case 'bow':
      return (
        <g>
          <polygon points={pts([[60, y - 6], [42, y - 18], [44, y + 4]])} fill={c2} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <polygon points={pts([[60, y - 6], [78, y - 18], [76, y + 4]])} fill={dark} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <polygon points={pts([[55, y - 11], [65, y - 11], [65, y - 1], [55, y - 1]])} fill={light} stroke={INK} strokeWidth="2" />
        </g>
      )
    default:
      return null
  }
}

/**
 * config: { body, eyes, mouth, hat, color1, color2 }
 * mood:   undefined | 'happy' | 'horror'
 * effect: undefined | power id (adds a visual effect)
 * animate: idle breathe / bounce
 */
function AvatarImpl({ config, mood, effect, animate = true, size = 120, className = '', dim = false }) {
  if (!config) return null
  const shape = SHAPES[config.body] || SHAPES.square
  const facets = bodyFacets(config.body, shape, config.color1)
  const c2 = config.color2
  const outline = shade(config.color1, -0.55)
  const cx = shape.c[0]
  const bottom = shape.pts.reduce((m, p) => Math.max(m, p[1]), 0)
  const by = Math.min(bottom - 22, 118)
  const belly = [[cx, by - 8], [cx + 8, by], [cx, by + 8], [cx - 8, by]]
  const footColor = shade(c2, -0.35)
  return (
    <svg
      viewBox="-8 -30 136 180"
      width={size}
      height={(size * 180) / 136}
      className={`avatar ${animate ? 'avatar-anim' : ''} ${mood ? `mood-${mood}` : ''} ${effect ? `fx-${effect}` : ''} ${dim ? 'avatar-dim' : ''} ${className}`}
      aria-hidden="true"
    >
      <g className="avatar-body">
        <polygon points="32,132 48,132 52,146 28,146" fill={footColor} />
        <polygon points="72,132 88,132 92,146 68,146" fill={footColor} />
        <polygon points={pts(shape.pts)} fill={outline} stroke={outline} strokeWidth="6" strokeLinejoin="round" />
        {facets.map((f, i) => (
          <polygon key={i} points={f.p} fill={f.f} stroke={f.f} strokeWidth="0.6" strokeLinejoin="round" />
        ))}
        <polygon points={pts(belly)} fill={c2} />
        <polygon points={pts([belly[0], belly[1], [cx, by]])} fill={shade(c2, 0.35)} />
        <polygon points={pts([belly[2], belly[3], [cx, by]])} fill={shade(c2, -0.3)} />
        <Hat type={config.hat} shape={shape} c2={c2} />
        <Eyes type={config.eyes} mood={mood} y={shape.face - 8} />
        {config.eyes === 'glasses' && mood && <Eyes type="glasses" mood={mood} y={shape.face - 8} />}
        <Mouth type={config.mouth} mood={mood} y={shape.face + 12} />
        {effect === 'exback' && (
          <g>
            <polygon points={pts(shape.pts)} fill="#bde9ff" opacity="0.5" />
            <polygon points="20,60 40,50 34,80" fill="#fff" opacity="0.7" />
            <polygon points="80,100 96,90 92,118" fill="#fff" opacity="0.6" />
            <polygon points="62,40 70,44 64,56" fill="#fff" opacity="0.6" />
          </g>
        )}
      </g>
      {effect === 'lovebombing' && (
        <g className="fx-hearts">
          <polygon points="4,40 -4,30 -2,24 4,26 10,24 12,30" fill="#ff2d6f" />
          <polygon points="112,70 104,60 106,54 112,56 118,54 120,60" fill="#ff5fa2" />
          <polygon points="100,10 94,3 95,-2 100,0 105,-2 106,3" fill="#ff9dbd" />
        </g>
      )}
      {effect === 'gaslighting' && (
        <g className="fx-spiral" stroke="#d8b4fe" strokeWidth="3" fill="none">
          <polyline points="50,-6 70,-6 70,6 54,6 54,-2 64,-2" />
        </g>
      )}
    </svg>
  )
}

const Avatar = memo(
  AvatarImpl,
  (a, b) =>
    a.mood === b.mood &&
    a.effect === b.effect &&
    a.size === b.size &&
    a.animate === b.animate &&
    a.dim === b.dim &&
    a.className === b.className &&
    a.config?.body === b.config?.body &&
    a.config?.eyes === b.config?.eyes &&
    a.config?.mouth === b.config?.mouth &&
    a.config?.hat === b.config?.hat &&
    a.config?.color1 === b.config?.color1 &&
    a.config?.color2 === b.config?.color2
)

export default Avatar
