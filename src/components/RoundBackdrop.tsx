import { memo } from 'react'
import type { RoundConfig } from '../lib/game'

// Low poly scenes behind each round, drawn in a 160 x 90 box and cropped
// to fill the screen (projector) or the play field (phone).

type P = [number, number]
const pts = (a: P[]) => a.map((p) => p.join(',')).join(' ')

/** a wall made of jittered triangles in a few tones of the same color */
function facetWall(colors: string[], seed: number, rows = 5, cols = 9) {
  let s = seed
  const r = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const w = 160 / cols
  const h = 90 / rows
  const grid: P[][] = []
  for (let y = 0; y <= rows; y++) {
    const row: P[] = []
    for (let x = 0; x <= cols; x++) {
      const jx = x === 0 || x === cols ? 0 : (r() - 0.5) * w * 0.6
      const jy = y === 0 || y === rows ? 0 : (r() - 0.5) * h * 0.6
      row.push([x * w + jx, y * h + jy])
    }
    grid.push(row)
  }
  const out: { p: string; c: string }[] = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = grid[y][x]
      const b = grid[y][x + 1]
      const c = grid[y + 1][x]
      const d = grid[y + 1][x + 1]
      out.push({ p: pts([a, b, d]), c: colors[Math.floor(r() * colors.length)] })
      out.push({ p: pts([a, d, c]), c: colors[Math.floor(r() * colors.length)] })
    }
  }
  return out
}

const WALLS = {
  restaurant: facetWall(['#1d1838', '#221c42', '#19142f', '#28204a'], 11),
  apartment: facetWall(['#3a2350', '#432a5c', '#341f48', '#4a2f63'], 23),
  dining: facetWall(['#5a2a2a', '#663131', '#4e2424', '#6e3838'], 37),
}

function Restaurant() {
  return (
    <g>
      {/* big window with moon and city */}
      <polygon points="56,8 104,8 104,44 56,44" fill="#0b1030" />
      <polygon points="56,8 80,8 56,30" fill="#131a46" />
      <polygon points="92,14 97,12 99,17 95,21 90,19" fill="#fff6c7" />
      {[[60, 38], [66, 34], [72, 40], [80, 32], [88, 37], [96, 35]].map(([x, y], i) => (
        <polygon key={i} points={pts([[x, 44], [x, y], [x + 5, y], [x + 5, 44]])} fill={i % 2 ? '#1c2459' : '#252f6e'} />
      ))}
      {[[62, 14], [70, 11], [84, 18], [100, 26]].map(([x, y], i) => (
        <polygon key={i} points={pts([[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]])} fill="#fff" />
      ))}
      <polygon points="54,6 106,6 106,8 54,8" fill="#6b4a2a" />
      <polygon points="54,44 106,44 108,47 52,47" fill="#6b4a2a" />
      {/* hanging lamps */}
      {[30, 130].map((x) => (
        <g key={x}>
          <line x1={x} y1="0" x2={x} y2="14" stroke="#000" strokeWidth="0.6" />
          <polygon points={pts([[x - 6, 20], [x, 13], [x + 6, 20]])} fill="#ffb347" />
          <polygon points={pts([[x - 14, 46], [x - 6, 20], [x + 6, 20], [x + 14, 46]])} fill="#ffd27a" opacity="0.08" />
        </g>
      ))}
      {/* floor + tables with candles */}
      <polygon points="0,70 160,70 160,90 0,90" fill="#2a1a14" />
      <polygon points="0,70 160,70 120,78 30,76" fill="#33211a" />
      {[34, 126].map((x) => (
        <g key={x}>
          <polygon points={pts([[x - 16, 60], [x + 16, 60], [x + 18, 64], [x - 18, 64]])} fill="#f4efe6" />
          <polygon points={pts([[x - 18, 64], [x + 18, 64], [x + 16, 72], [x - 16, 72]])} fill="#d9d0c2" />
          <polygon points={pts([[x - 1, 54], [x + 1, 54], [x + 1, 60], [x - 1, 60]])} fill="#fff" />
          <polygon className="bd-flame" points={pts([[x, 49], [x + 1.6, 53], [x, 55], [x - 1.6, 53]])} fill="#ffcc4d" />
        </g>
      ))}
    </g>
  )
}

function Apartment() {
  return (
    <g>
      {/* window with skyline */}
      <polygon points="100,10 148,10 148,46 100,46" fill="#ff9a6b" />
      <polygon points="100,10 148,10 148,26 100,30" fill="#ffb98f" />
      {[[102, 30], [110, 24], [118, 34], [126, 20], [136, 28], [142, 33]].map(([x, y], i) => (
        <polygon key={i} points={pts([[x, 46], [x, y], [x + 7, y], [x + 7, 46]])} fill={i % 2 ? '#5b3a6e' : '#4a2f5c'} />
      ))}
      <polygon points="98,8 150,8 150,10 98,10" fill="#e8dcc8" />
      <polygon points="98,46 150,46 152,49 96,49" fill="#e8dcc8" />
      <line x1="124" y1="10" x2="124" y2="46" stroke="#e8dcc8" strokeWidth="1.2" />
      {/* frame on the wall */}
      <polygon points="20,14 46,14 46,32 20,32" fill="#f5d06f" />
      <polygon points="22,16 44,16 44,30 22,30" fill="#22d3ee" />
      <polygon points="22,30 32,20 40,26 44,22 44,30" fill="#22c55e" />
      {/* floor, rug, sofa, lamp, plant */}
      <polygon points="0,66 160,66 160,90 0,90" fill="#6b4630" />
      <polygon points="0,66 160,66 150,72 10,70" fill="#7a5238" />
      <polygon points="40,78 120,78 132,88 28,88" fill="#ff5fa2" opacity="0.55" />
      <polygon points="28,50 92,50 94,66 26,66" fill="#22a0a6" />
      <polygon points="28,50 92,50 88,56 32,56" fill="#2fc0c6" />
      <polygon points="22,54 30,54 30,68 22,68" fill="#1b8187" />
      <polygon points="90,54 98,54 98,68 90,68" fill="#1b8187" />
      <polygon points="40,57 56,57 56,63 40,63" fill="#ffd23f" />
      <line x1="112" y1="38" x2="112" y2="66" stroke="#2d2a3a" strokeWidth="1" />
      <polygon points="105,38 119,38 116,30 108,30" fill="#ffe680" />
      <polygon points="104,66 120,66 116,62 108,62" fill="#2d2a3a" />
      <polygon points="6,66 16,66 14,58 8,58" fill="#b45f3c" />
      {[[11, 58, 4, 44], [11, 58, 16, 46], [11, 58, 11, 42]].map(([x1, y1, x2, y2], i) => (
        <polygon key={i} points={pts([[x1 - 2, y1], [x2, y2], [x1 + 2, y1]])} fill="#22c55e" />
      ))}
    </g>
  )
}

function Dining() {
  return (
    <g>
      {/* family portraits */}
      {[[18, 12], [44, 9], [116, 9], [142, 12]].map(([x, y], i) => (
        <g key={i}>
          <polygon points={pts([[x - 8, y], [x + 8, y], [x + 8, y + 18], [x - 8, y + 18]])} fill="#c9a24a" />
          <polygon points={pts([[x - 6, y + 2], [x + 6, y + 2], [x + 6, y + 16], [x - 6, y + 16]])} fill="#3b2b4f" />
          <polygon points={pts([[x - 3, y + 7], [x, y + 4], [x + 3, y + 7], [x, y + 10]])} fill="#f5c19c" />
          <polygon points={pts([[x - 5, y + 16], [x - 4, y + 11], [x + 4, y + 11], [x + 5, y + 16]])} fill={['#8b5cf6', '#ff3b5c', '#22c55e', '#3b82f6'][i]} />
        </g>
      ))}
      {/* chandelier */}
      <line x1="80" y1="0" x2="80" y2="8" stroke="#c9a24a" strokeWidth="0.8" />
      <polygon points="64,10 96,10 88,16 72,16" fill="#c9a24a" />
      {[66, 74, 86, 94].map((x) => (
        <polygon key={x} className="bd-flame" points={pts([[x, 5], [x + 1.4, 8], [x, 10], [x - 1.4, 8]])} fill="#ffcc4d" />
      ))}
      <polygon points="60,16 100,16 112,46 48,46" fill="#ffd27a" opacity="0.07" />
      {/* long table */}
      <polygon points="0,68 160,68 160,90 0,90" fill="#3a1f1a" />
      <polygon points="14,52 146,52 156,60 4,60" fill="#f4efe6" />
      <polygon points="4,60 156,60 152,72 8,72" fill="#ddd3c3" />
      {[24, 48, 72, 96, 120, 140].map((x, i) => (
        <g key={x}>
          <polygon points={pts([[x - 5, 55], [x + 5, 55], [x + 3, 58], [x - 3, 58]])} fill="#fff" stroke="#c9c3b6" strokeWidth="0.3" />
          {i % 2 === 0 && <polygon points={pts([[x + 8, 50], [x + 10, 50], [x + 10, 56], [x + 8, 56]])} fill="#b91c3c" opacity="0.8" />}
        </g>
      ))}
      <polygon points="74,44 86,44 84,54 76,54" fill="#e0a800" />
      <polygon points="76,40 84,40 86,44 74,44" fill="#22c55e" />
    </g>
  )
}

function RoundBackdrop({ theme, className = '' }: { theme: RoundConfig['theme']; className?: string }) {
  return (
    <svg className={`backdrop ${className}`} viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {WALLS[theme].map((t, i) => (
        <polygon key={i} points={t.p} fill={t.c} stroke={t.c} strokeWidth="0.2" />
      ))}
      {theme === 'restaurant' ? <Restaurant /> : theme === 'apartment' ? <Apartment /> : <Dining />}
    </svg>
  )
}

export default memo(RoundBackdrop)
