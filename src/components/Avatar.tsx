import { memo, type ReactNode } from 'react'
import { shade } from '../lib/avatar'
import type { AvatarConfig, EyeStyle, MouthStyle, Pose, PowerId } from '../lib/types'

// Chibi low poly person drawn in a 120 x 150 box (big head, short body).
// Head and torso are split into flat-shaded facets lit from the top-left;
// limbs are split in two tones. Poses are pure CSS on the limb groups.

type Pt = [number, number]
const INK = '#1b1030'
const LIGHT: Pt = [-0.55, -0.83]
const P = (arr: Pt[]): string => arr.map((p) => p.join(',')).join(' ')

// ---------- facet shading ----------
const facetCache = new Map<string, { p: string; f: string }[]>()
function facets(key: string, outer: Pt[], c: Pt, color: string) {
  const k = key + color
  const hit = facetCache.get(k)
  if (hit) return hit
  const [cx, cy] = c
  const inner: Pt[] = outer.map(([x, y]) => [cx - 2 + (x - cx) * 0.55, cy - 3 + (y - cy) * 0.55])
  const hub: Pt = [cx - 3, cy - 5]
  const out: { p: string; f: string }[] = []
  const sh = (tri: Pt[]) => {
    const mx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3 - cx
    const my = (tri[0][1] + tri[1][1] + tri[2][1]) / 3 - cy
    const len = Math.hypot(mx, my) || 1
    return (mx * LIGHT[0] + my * LIGHT[1]) / len
  }
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length
    const t1: Pt[] = [outer[i], outer[j], inner[i]]
    const t2: Pt[] = [outer[j], inner[j], inner[i]]
    const t3: Pt[] = [inner[i], inner[j], hub]
    const s1 = sh(t1)
    const s2 = sh(t2)
    const s3 = sh(t3)
    out.push({ p: P(t1), f: shade(color, s1 > 0 ? s1 * 0.26 : s1 * 0.34) })
    out.push({ p: P(t2), f: shade(color, s2 > 0 ? s2 * 0.16 + 0.03 : s2 * 0.24) })
    out.push({ p: P(t3), f: shade(color, s3 > 0 ? s3 * 0.18 + 0.1 : s3 * 0.1 + 0.05) })
  }
  facetCache.set(k, out)
  return out
}

function Faceted({ id, pts, c, color }: { id: string; pts: Pt[]; c: Pt; color: string }) {
  const outline = shade(color, -0.45)
  return (
    <g>
      <polygon points={P(pts)} fill={outline} stroke={outline} strokeWidth="2.5" strokeLinejoin="round" />
      {facets(id, pts, c, color).map((f, i) => (
        <polygon key={i} points={f.p} fill={f.f} stroke={f.f} strokeWidth="0.5" strokeLinejoin="round" />
      ))}
    </g>
  )
}

/** Quad split in a light and a dark triangle (limbs, hair pieces). */
function Two({ pts, color, flip = false }: { pts: Pt[]; color: string; flip?: boolean }) {
  const [a, b, c, d] = pts
  const light = shade(color, 0.12)
  const dark = shade(color, -0.18)
  if (pts.length !== 4) return <polygon points={P(pts)} fill={color} />
  return (
    <g>
      <polygon points={P([a, b, c])} fill={flip ? dark : light} stroke={flip ? dark : light} strokeWidth="0.5" />
      <polygon points={P([a, c, d])} fill={flip ? light : dark} stroke={flip ? light : dark} strokeWidth="0.5" />
    </g>
  )
}

/** Any polygon with a simple 2-tone split through its first vertex. */
function Poly2({ pts, color }: { pts: Pt[]; color: string }) {
  const mid = Math.floor(pts.length / 2)
  const a = pts.slice(0, mid + 1)
  const b = [pts[0], ...pts.slice(mid)]
  return (
    <g>
      <polygon points={P(a)} fill={shade(color, 0.1)} stroke={shade(color, 0.1)} strokeWidth="0.5" />
      <polygon points={P(b)} fill={shade(color, -0.15)} stroke={shade(color, -0.15)} strokeWidth="0.5" />
    </g>
  )
}

// ---------- geometry ----------
const HEAD: Pt[] = [[60, 15], [78, 19], [89, 30], [92, 47], [88, 64], [76, 77], [60, 81], [44, 77], [32, 64], [28, 47], [31, 30], [42, 19]]
const TORSO: Pt[] = [[42, 84], [78, 84], [85, 96], [83, 121], [37, 121], [35, 96]]
const ARM_L: Pt[] = [[35, 88], [44, 87], [42, 112], [33, 112]]
const ARM_R: Pt[] = [[76, 87], [85, 88], [87, 112], [78, 112]]
const LEG_L: Pt[] = [[43, 118], [58, 118], [57, 142], [46, 142]]
const LEG_R: Pt[] = [[62, 118], [77, 118], [74, 142], [63, 142]]
const EYE_Y = 51
const EL = 48
const ER = 72

function afroBlob(): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 ? 38 : 44
    out.push([60 + Math.cos(a) * r * 1.05, 44 + Math.sin(a) * r * 0.92])
  }
  return out
}
const AFRO = afroBlob()

// ---------- hair ----------
function HairBack({ style, color }: { style: AvatarConfig['hair']; color: string }) {
  const d = shade(color, -0.25)
  switch (style) {
    case 'long':
      return <polygon points={P([[27, 34], [22, 104], [40, 108], [44, 72], [76, 72], [80, 108], [98, 104], [93, 34], [60, 10]])} fill={d} />
    case 'ponytail':
      return <Poly2 pts={[[84, 26], [104, 32], [112, 60], [102, 90], [96, 66], [92, 42]]} color={color} />
    case 'bun':
      return <Poly2 pts={[[60, -6], [71, 0], [72, 12], [60, 18], [48, 12], [49, 0]]} color={color} />
    case 'afro':
      return <Faceted id="afro" pts={AFRO} c={[60, 40]} color={color} />
    default:
      return null
  }
}

function HairFront({ style, color }: { style: AvatarConfig['hair']; color: string }) {
  switch (style) {
    case 'bald':
      return <polygon points={P([[44, 23], [56, 19], [50, 28]])} fill="#fff" opacity="0.35" />
    case 'short':
    case 'ponytail':
      return <Poly2 pts={[[29, 46], [28, 33], [37, 20], [50, 13], [68, 12], [83, 19], [92, 32], [92, 46], [86, 37], [76, 30], [63, 33], [50, 29], [38, 35]]} color={color} />
    case 'quiff':
      return (
        <g>
          <Poly2 pts={[[30, 40], [32, 28], [42, 18], [58, 14], [78, 17], [89, 28], [90, 40], [84, 31], [60, 27], [37, 31]]} color={color} />
          <Poly2 pts={[[44, 24], [52, 2], [80, 6], [74, 24]]} color={color} />
        </g>
      )
    case 'long':
      return <Poly2 pts={[[28, 62], [27, 34], [37, 20], [50, 13], [68, 12], [83, 19], [93, 34], [92, 62], [86, 40], [72, 30], [50, 30], [34, 40]]} color={color} />
    case 'bun':
      return <Poly2 pts={[[29, 44], [30, 30], [40, 19], [60, 14], [80, 19], [90, 30], [91, 44], [84, 33], [60, 28], [36, 33]]} color={color} />
    case 'afro':
      return <Poly2 pts={[[28, 46], [26, 30], [34, 18], [46, 10], [60, 8], [74, 10], [86, 18], [94, 30], [92, 46], [86, 34], [78, 30], [70, 35], [60, 30], [50, 35], [42, 30], [34, 34]]} color={color} />
    case 'mohawk':
      return (
        <g>
          <polygon points={P([[31, 40], [33, 28], [44, 19], [76, 19], [87, 28], [89, 40], [80, 30], [40, 30]])} fill={color} opacity="0.35" />
          <Poly2 pts={[[52, 28], [49, -4], [56, 7], [60, -9], [64, 7], [71, -4], [68, 28]]} color={color} />
        </g>
      )
  }
}

// ---------- face ----------
type FaceMood = 'cheer' | 'scared' | 'cry' | undefined

function Eyes({ type, mood }: { type: EyeStyle; mood: FaceMood }) {
  const y = EYE_Y
  const both = (fn: (x: number) => ReactNode) => (
    <>
      <g>{fn(EL)}</g>
      <g>{fn(ER)}</g>
    </>
  )
  if (mood === 'cheer' || (type === 'happy' && !mood)) {
    return (
      <g stroke={INK} strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round">
        {both((x) => <polyline points={`${x - 5},${y + 2} ${x},${y - 3} ${x + 5},${y + 2}`} />)}
      </g>
    )
  }
  if (mood === 'scared') {
    return both((x) => (
      <g>
        <polygon points={P([[x, y - 8], [x + 7, y - 4], [x + 7, y + 4], [x, y + 8], [x - 7, y + 4], [x - 7, y - 4]])} fill="#fff" stroke={INK} strokeWidth="2" />
        <rect x={x - 1.5} y={y - 1.5} width="3" height="3" fill={INK} />
      </g>
    ))
  }
  if (mood === 'cry') {
    return (
      <g>
        <g stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round">
          {both((x) => <polyline points={`${x - 5},${y - 1} ${x},${y + 3} ${x + 5},${y - 1}`} />)}
        </g>
        <g className="av-tears">
          <polygon points={P([[EL - 2, y + 5], [EL + 1, y + 5], [EL + 2, y + 14], [EL - 1, y + 16], [EL - 3, y + 13]])} fill="#7dd3fc" />
          <polygon points={P([[ER - 1, y + 5], [ER + 2, y + 5], [ER + 3, y + 13], [ER + 1, y + 16], [ER - 2, y + 14]])} fill="#7dd3fc" />
        </g>
      </g>
    )
  }
  switch (type) {
    case 'angry':
      return (
        <g>
          {both((x) => <polygon points={P([[x, y - 3], [x + 3.5, y], [x + 3.5, y + 3], [x, y + 5], [x - 3.5, y + 3], [x - 3.5, y]])} fill={INK} />)}
          <polygon points={P([[EL - 8, y - 11], [EL + 7, y - 6], [EL + 6, y - 3], [EL - 8, y - 7]])} fill={INK} />
          <polygon points={P([[ER + 8, y - 11], [ER - 7, y - 6], [ER - 6, y - 3], [ER + 8, y - 7]])} fill={INK} />
        </g>
      )
    case 'tired':
      return both((x) => (
        <g>
          <polygon points={P([[x - 4, y + 1], [x + 4, y + 1], [x + 3, y + 5], [x - 3, y + 5]])} fill={INK} />
          <line x1={x - 6} y1={y} x2={x + 6} y2={y} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <polyline points={`${x - 5},${y + 9} ${x},${y + 10} ${x + 5},${y + 9}`} stroke="#8a6a9a" strokeWidth="1.5" fill="none" />
        </g>
      ))
    case 'hearts':
      return both((x) => (
        <polygon points={P([[x, y + 6], [x - 7, y - 1], [x - 6, y - 5], [x - 3, y - 6], [x, y - 3], [x + 3, y - 6], [x + 6, y - 5], [x + 7, y - 1]])} fill="#ff2d6f" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      ))
    case 'stars':
      return both((x) => (
        <polygon points={P([[x, y - 7], [x + 2, y - 2], [x + 7, y - 1], [x + 3, y + 2], [x + 4, y + 7], [x, y + 4], [x - 4, y + 7], [x - 3, y + 2], [x - 7, y - 1], [x - 2, y - 2]])} fill="#ffd23f" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      ))
    default:
      return both((x) => (
        <g>
          <polygon points={P([[x, y - 5], [x + 3.5, y - 2], [x + 3.5, y + 2], [x, y + 5], [x - 3.5, y + 2], [x - 3.5, y - 2]])} fill={INK} />
          <rect x={x} y={y - 3} width="2" height="2" fill="#fff" />
        </g>
      ))
  }
}

function Mouth({ type, mood }: { type: MouthStyle; mood: FaceMood }) {
  const y = 66
  const m = mood === 'cheer' ? 'open' : mood === 'scared' ? 'scream' : mood === 'cry' ? 'frown' : type
  switch (m) {
    case 'open':
      return (
        <g>
          <polygon points={P([[50, y - 2], [70, y - 2], [66, y + 6], [60, y + 8], [54, y + 6]])} fill={INK} />
          <polygon points={P([[55, y + 4], [60, y + 2], [65, y + 4], [60, y + 7]])} fill="#ff6b8a" />
        </g>
      )
    case 'scream':
      return <polygon points={P([[55, y - 2], [65, y - 2], [68, y + 5], [64, y + 11], [56, y + 11], [52, y + 5]])} fill={INK} />
    case 'frown':
      return <polyline points={`52,${y + 4} 60,${y - 1} 68,${y + 4}`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    case 'serious':
      return <rect x="53" y={y} width="14" height="3" fill={INK} />
    case 'surprised':
      return <polygon points={P([[60, y - 3], [64, y - 1], [64, y + 4], [60, y + 6], [56, y + 4], [56, y - 1]])} fill={INK} />
    case 'tongue':
      return (
        <g>
          <polygon points={P([[51, y - 1], [69, y - 1], [64, y + 4], [56, y + 4]])} fill={INK} />
          <polygon points={P([[57, y + 2], [64, y + 2], [63, y + 9], [60, y + 10], [57, y + 8]])} fill="#ff6b8a" stroke={INK} strokeWidth="1" />
        </g>
      )
    case 'teeth':
      return (
        <g>
          <polygon points={P([[50, y - 2], [70, y - 2], [66, y + 5], [54, y + 5]])} fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <line x1="57" y1={y - 2} x2="57" y2={y + 5} stroke={INK} strokeWidth="1" />
          <line x1="63" y1={y - 2} x2="63" y2={y + 5} stroke={INK} strokeWidth="1" />
        </g>
      )
    default:
      return <polygon points={P([[51, y - 1], [55, y + 4], [60, y + 6], [65, y + 4], [69, y - 1], [65, y + 1], [60, y + 3], [55, y + 1]])} fill={INK} />
  }
}

// ---------- clothes ----------
function Legs({ cfg }: { cfg: AvatarConfig }) {
  const skin = cfg.skin
  const color = cfg.top === 'overalls' ? cfg.topColor : cfg.bottomColor
  const kind = cfg.top === 'dress' && cfg.bottom !== 'pants' && cfg.bottom !== 'ripped' ? 'skirt' : cfg.bottom
  const leg = (pts: Pt[], cls: string, right: boolean) => {
    const [a, b, c, d] = pts
    const kneeA: Pt = [(a[0] + d[0]) / 2, 130]
    const kneeB: Pt = [(b[0] + c[0]) / 2, 130]
    const upper: Pt[] = [a, b, kneeB, kneeA]
    const lower: Pt[] = [kneeA, kneeB, c, d]
    return (
      <g className={cls}>
        {kind === 'pants' || kind === 'ripped' ? (
          <Two pts={pts} color={color} flip={right} />
        ) : kind === 'shorts' ? (
          <>
            <Two pts={lower} color={skin} flip={right} />
            <Two pts={upper} color={color} flip={right} />
          </>
        ) : (
          <Two pts={pts} color={skin} flip={right} />
        )}
        {kind === 'ripped' && (
          <polygon points={P([[a[0] + 3, 128], [b[0] - 3, 127], [b[0] - 4, 133], [a[0] + 4, 134]])} fill={skin} />
        )}
        <Shoe type={cfg.shoes} x={(c[0] + d[0]) / 2} skin={skin} right={right} />
      </g>
    )
  }
  return (
    <g>
      {leg(LEG_L, 'av-leg-l', false)}
      {leg(LEG_R, 'av-leg-r', true)}
      {kind === 'skirt' && cfg.top !== 'dress' && (
        <Two pts={[[38, 116], [82, 116], [88, 134], [32, 134]]} color={color} />
      )}
    </g>
  )
}

function Shoe({ type, x, skin, right }: { type: AvatarConfig['shoes']; x: number; skin: string; right: boolean }) {
  const s = right ? 1 : -1
  const y = 141
  switch (type) {
    case 'boots':
      return <Two pts={[[x - 7, y - 10], [x + 7, y - 10], [x + 7 + 4 * s, y + 9], [x - 7 + 2 * s, y + 9]]} color="#6b4226" />
    case 'flipflops':
      return (
        <g>
          <polygon points={P([[x - 6, y], [x + 6, y], [x + 7 + 3 * s, y + 7], [x - 7 + 2 * s, y + 7]])} fill={skin} />
          <rect x={x - 9 + 2 * s} y={y + 7} width="18" height="3" fill="#ffd23f" />
          <polyline points={`${x - 5},${y + 6} ${x},${y + 2} ${x + 5},${y + 6}`} stroke="#22c55e" strokeWidth="2" fill="none" />
        </g>
      )
    case 'heels':
      return (
        <g>
          <polygon points={P([[x - 6, y], [x + 6, y], [x + 10 * s + (s < 0 ? 4 : -4), y + 7], [x - 6 * s, y + 7]])} fill="#e11d48" stroke="#9f1239" strokeWidth="1" />
          <polygon points={P([[x - 6 * s, y + 4], [x - 4 * s, y + 4], [x - 5 * s, y + 10]])} fill="#9f1239" />
        </g>
      )
    default:
      return (
        <g>
          <polygon points={P([[x - 7, y - 1], [x + 6, y - 1], [x + 9 + 2 * s, y + 6], [x - 9 + 2 * s, y + 6]])} fill="#f8f8f8" stroke="#c9c3d6" strokeWidth="1" />
          <rect x={x - 9 + 2 * s} y={y + 6} width="18" height="3" fill="#ff3b5c" />
        </g>
      )
  }
}

function Arm({ cfg, side }: { cfg: AvatarConfig; side: 'l' | 'r' }) {
  const pts = side === 'l' ? ARM_L : ARM_R
  const hx = side === 'l' ? 37.5 : 82.5
  const long = cfg.top === 'hoodie' || cfg.top === 'jacket' || cfg.top === 'shirt'
  const sleeveColor = cfg.top === 'overalls' ? '#f5f0e6' : cfg.topColor
  const [a, b, c, d] = pts
  const elbowA: Pt = [a[0] + (d[0] - a[0]) * 0.4, 97]
  const elbowB: Pt = [b[0] + (c[0] - b[0]) * 0.4, 97]
  return (
    <g className={`av-arm-${side}`}>
      <Two pts={pts} color={long ? sleeveColor : cfg.skin} flip={side === 'r'} />
      {!long && <Two pts={[a, b, elbowB, elbowA]} color={sleeveColor} flip={side === 'r'} />}
      <polygon points={P([[hx - 5, 111], [hx + 5, 111], [hx + 6, 116], [hx + 2, 120], [hx - 3, 120], [hx - 6, 116]])} fill={cfg.skin} stroke={shade(cfg.skin, -0.3)} strokeWidth="1" />
    </g>
  )
}

function Top({ cfg }: { cfg: AvatarConfig }) {
  const c = cfg.topColor
  const dark = shade(c, -0.3)
  switch (cfg.top) {
    case 'hoodie':
      return (
        <g>
          <polygon points={P([[42, 78], [78, 78], [82, 90], [38, 90]])} fill={dark} />
          <Faceted id="torso" pts={TORSO} c={[60, 100]} color={c} />
          <polygon points={P([[48, 106], [72, 106], [75, 117], [45, 117]])} fill={dark} />
          <line x1="55" y1="86" x2="54" y2="98" stroke="#fff" strokeWidth="1.5" />
          <line x1="65" y1="86" x2="66" y2="98" stroke="#fff" strokeWidth="1.5" />
        </g>
      )
    case 'jacket':
      return (
        <g>
          <Faceted id="torso" pts={TORSO} c={[60, 100]} color={c} />
          <polygon points={P([[53, 84], [67, 84], [65, 121], [55, 121]])} fill="#f5f0e6" />
          <polygon points={P([[53, 84], [47, 84], [52, 100], [56, 96]])} fill={dark} />
          <polygon points={P([[67, 84], [73, 84], [68, 100], [64, 96]])} fill={dark} />
        </g>
      )
    case 'shirt':
      return (
        <g>
          <Faceted id="torso" pts={TORSO} c={[60, 100]} color={c} />
          <polygon points={P([[50, 83], [60, 88], [56, 92]])} fill="#fff" />
          <polygon points={P([[70, 83], [60, 88], [64, 92]])} fill="#fff" />
          <polygon points={P([[58, 88], [62, 88], [64, 108], [60, 113], [56, 108]])} fill="#b91c3c" stroke="#7f1d2d" strokeWidth="0.8" />
        </g>
      )
    case 'dress':
      return (
        <g>
          <Faceted id="dress" pts={[[37, 116], [83, 116], [93, 140], [27, 140]]} c={[60, 126]} color={c} />
          <Faceted id="torso" pts={TORSO} c={[60, 100]} color={c} />
          <polygon points={P([[37, 113], [83, 113], [83, 118], [37, 118]])} fill={dark} />
        </g>
      )
    case 'overalls':
      return (
        <g>
          <Faceted id="torso" pts={TORSO} c={[60, 100]} color="#f5f0e6" />
          <Faceted id="bib" pts={[[45, 96], [75, 96], [79, 121], [41, 121]]} c={[60, 106]} color={c} />
          <line x1="46" y1="97" x2="44" y2="85" stroke={c} strokeWidth="3.5" />
          <line x1="74" y1="97" x2="76" y2="85" stroke={c} strokeWidth="3.5" />
          <rect x="45" y="97" width="3" height="3" fill="#ffd23f" />
          <rect x="72" y="97" width="3" height="3" fill="#ffd23f" />
        </g>
      )
    default:
      return (
        <g>
          <Faceted id="torso" pts={TORSO} c={[60, 100]} color={c} />
          <polygon points={P([[52, 84], [68, 84], [60, 90]])} fill={shade(cfg.skin, -0.1)} />
        </g>
      )
  }
}

// ---------- accessories ----------
function AccessoryBack({ cfg }: { cfg: AvatarConfig }) {
  if (cfg.accessory !== 'backpack') return null
  return <Two pts={[[28, 88], [92, 88], [95, 120], [25, 120]]} color="#8b5a2b" />
}

function AccessoryFront({ cfg }: { cfg: AvatarConfig }) {
  const y = EYE_Y
  switch (cfg.accessory) {
    case 'glasses':
      return (
        <g fill="#ffffff22" stroke={INK} strokeWidth="2.2">
          <rect x={EL - 8} y={y - 6} width="16" height="12" />
          <rect x={ER - 8} y={y - 6} width="16" height="12" />
          <line x1={EL + 8} y1={y - 2} x2={ER - 8} y2={y - 2} />
        </g>
      )
    case 'sunglasses':
      return (
        <g>
          <polygon points={P([[EL - 10, y - 6], [EL + 9, y - 6], [EL + 7, y + 6], [EL - 7, y + 7]])} fill={INK} />
          <polygon points={P([[ER - 9, y - 6], [ER + 10, y - 6], [ER + 7, y + 7], [ER - 7, y + 6]])} fill={INK} />
          <line x1={EL + 9} y1={y - 4} x2={ER - 9} y2={y - 4} stroke={INK} strokeWidth="2.5" />
          <polygon points={P([[EL - 6, y - 4], [EL - 1, y - 4], [EL - 6, y + 1]])} fill="#fff" opacity="0.5" />
          <polygon points={P([[ER - 5, y - 4], [ER, y - 4], [ER - 5, y + 1]])} fill="#fff" opacity="0.5" />
        </g>
      )
    case 'cap': {
      const c = cfg.bottomColor === cfg.topColor ? '#ff3b5c' : cfg.bottomColor
      return (
        <g>
          <Poly2 pts={[[29, 34], [33, 20], [46, 11], [74, 11], [87, 20], [91, 34]]} color={c} />
          <Two pts={[[62, 30], [104, 30], [108, 37], [62, 36]]} color={shade(c, -0.15)} />
          <rect x="57" y="7" width="6" height="5" fill={shade(c, -0.3)} />
        </g>
      )
    }
    case 'crown':
      return (
        <g>
          <polygon points={P([[40, 22], [38, 2], [49, 12], [60, -4], [71, 12], [82, 2], [80, 22]])} fill="#ffd23f" stroke="#b7791f" strokeWidth="1.5" strokeLinejoin="round" />
          <polygon points={P([[49, 12], [60, -4], [60, 22], [40, 22]])} fill="#ffe680" />
          <polygon points={P([[60, 10], [63, 14], [60, 18], [57, 14]])} fill="#ff3b5c" />
        </g>
      )
    case 'headphones':
      return (
        <g>
          <polyline points="27,50 26,30 36,14 60,8 84,14 94,30 93,50" stroke={INK} strokeWidth="4" fill="none" strokeLinejoin="round" />
          <Two pts={[[21, 42], [31, 42], [31, 60], [21, 60]]} color={cfg.topColor} />
          <Two pts={[[89, 42], [99, 42], [99, 60], [89, 60]]} color={cfg.topColor} flip />
        </g>
      )
    case 'earrings':
      return (
        <g fill="#ffd23f" stroke="#b7791f" strokeWidth="0.8">
          <polygon points="29,60 32,65 29,71 26,65" />
          <polygon points="91,60 94,65 91,71 88,65" />
        </g>
      )
    case 'flower':
      return (
        <g transform="translate(36 24)">
          {[0, 72, 144, 216, 288].map((a) => (
            <polygon key={a} points="0,0 -4,-9 0,-12 4,-9" fill="#ff5fa2" transform={`rotate(${a})`} />
          ))}
          <polygon points="-3,-2 3,-2 3,3 -3,3" fill="#ffd23f" />
        </g>
      )
    case 'scarf': {
      const c = cfg.bottomColor === cfg.topColor ? '#ff3b5c' : cfg.bottomColor
      return (
        <g>
          <Two pts={[[40, 80], [80, 80], [82, 91], [38, 91]]} color={c} />
          <Two pts={[[66, 89], [74, 89], [77, 110], [67, 108]]} color={c} flip />
        </g>
      )
    }
    case 'backpack':
      return (
        <g fill="#6b4226">
          <polygon points={P([[41, 84], [46, 84], [44, 112], [39, 112]])} />
          <polygon points={P([[74, 84], [79, 84], [81, 112], [76, 112]])} />
        </g>
      )
    default:
      return null
  }
}

// ---------- sabotage effect overlays ----------
function EffectOverlay({ effect }: { effect?: PowerId }) {
  switch (effect) {
    case 'exback':
      return (
        <g>
          <polygon points={P(HEAD)} fill="#bde9ff" opacity="0.45" />
          <polygon points={P(TORSO)} fill="#bde9ff" opacity="0.45" />
          <polygon points="30,40 42,32 38,58" fill="#fff" opacity="0.75" />
          <polygon points="78,96 90,90 86,114" fill="#fff" opacity="0.6" />
          <polygon points="56,124 64,120 60,138" fill="#fff" opacity="0.6" />
        </g>
      )
    case 'lovebombing':
      return (
        <g className="fx-hearts">
          <polygon points="8,40 0,30 2,24 8,26 14,24 16,30" fill="#ff2d6f" />
          <polygon points="112,70 104,60 106,54 112,56 118,54 120,60" fill="#ff5fa2" />
          <polygon points="104,10 98,3 99,-2 104,0 109,-2 110,3" fill="#ff9dbd" />
        </g>
      )
    case 'gaslighting':
      return (
        <g className="fx-spiral" stroke="#d8b4fe" strokeWidth="3" fill="none">
          <polyline points="48,-10 72,-10 72,2 52,2 52,-6 66,-6" />
        </g>
      )
    case 'therapy':
      return (
        <polygon
          className="fx-shield"
          points="60,-14 116,14 116,110 60,156 4,110 4,14"
          fill="#22d3ee22"
          stroke="#67e8f9"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )
    default:
      return null
  }
}

export interface AvatarProps {
  config: AvatarConfig | null | undefined
  pose?: Pose
  effect?: PowerId
  /** -1 = facing left, 1 = facing right */
  facing?: -1 | 1
  animate?: boolean
  size?: number
  crop?: 'full' | 'head'
  className?: string
  dim?: boolean
}

function AvatarImpl({ config, pose = 'idle', effect, facing = 1, animate = true, size = 120, crop = 'full', className = '', dim = false }: AvatarProps) {
  if (!config) return null
  const vb = crop === 'head' ? [14, -10, 92, 96] : [-6, -16, 132, 174]
  const mood: FaceMood = pose === 'cheer' || pose === 'dance' ? 'cheer' : pose === 'scared' ? 'scared' : pose === 'cry' ? 'cry' : undefined
  return (
    <svg
      viewBox={vb.join(' ')}
      width={size}
      height={(size * vb[3]) / vb[2]}
      className={`avatar ${animate ? `pose-${pose}` : ''} ${effect ? `fx-${effect}` : ''} ${dim ? 'avatar-dim' : ''} ${className}`}
      aria-hidden="true"
    >
      <g transform={facing < 0 ? 'translate(120 0) scale(-1 1)' : undefined}>
        <g className="av-root">
          <HairBack style={config.hair} color={config.hairColor} />
          <AccessoryBack cfg={config} />
          <Legs cfg={config} />
          <Top cfg={config} />
          <rect x="54" y="75" width="12" height="10" fill={shade(config.skin, -0.15)} />
          <g className="av-head">
            <Faceted id="head" pts={HEAD} c={[58, 44]} color={config.skin} />
            <polygon points="38,60 45,58 44,63" fill="#ff6b8a" opacity="0.35" />
            <polygon points="82,60 75,58 76,63" fill="#ff6b8a" opacity="0.35" />
            <Eyes type={config.eyes} mood={mood} />
            <Mouth type={config.mouth} mood={mood} />
            <HairFront style={config.hair} color={config.hairColor} />
            {config.accessory !== 'backpack' && config.accessory !== 'scarf' && <AccessoryFront cfg={config} />}
          </g>
          {(config.accessory === 'backpack' || config.accessory === 'scarf') && <AccessoryFront cfg={config} />}
          <Arm cfg={config} side="l" />
          <Arm cfg={config} side="r" />
          <EffectOverlay effect={effect} />
        </g>
      </g>
    </svg>
  )
}

const Avatar = memo(
  AvatarImpl,
  (a, b) =>
    a.pose === b.pose &&
    a.effect === b.effect &&
    a.facing === b.facing &&
    a.size === b.size &&
    a.crop === b.crop &&
    a.animate === b.animate &&
    a.dim === b.dim &&
    a.className === b.className &&
    JSON.stringify(a.config) === JSON.stringify(b.config)
)

export default Avatar
