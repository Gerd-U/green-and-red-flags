import { memo } from 'react'

// Decorative low poly triangles in the background (static, generated once).
type P = [number, number]
interface Tri {
  p: P[]
  t: number
  side: 'g' | 'r'
  k: number
}

function makeTriangles(): Tri[] {
  let s = 7
  const r = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const cols = 9
  const rows = 6
  const w = 100 / (cols - 1)
  const h = 100 / (rows - 1)
  const grid: P[][] = []
  for (let y = 0; y < rows; y++) {
    const row: P[] = []
    for (let x = 0; x < cols; x++) {
      const jx = x === 0 || x === cols - 1 ? 0 : (r() - 0.5) * w * 0.7
      const jy = y === 0 || y === rows - 1 ? 0 : (r() - 0.5) * h * 0.7
      row.push([x * w + jx, y * h + jy])
    }
    grid.push(row)
  }
  const tris: Tri[] = []
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const a = grid[y][x]
      const b = grid[y][x + 1]
      const c = grid[y + 1][x]
      const d = grid[y + 1][x + 1]
      const tone = (x + y) % 3
      tris.push({ p: [a, b, d], t: tone, side: x < (cols - 1) / 2 ? 'g' : 'r', k: r() })
      tris.push({ p: [a, d, c], t: (tone + 1) % 3, side: x < (cols - 1) / 2 ? 'g' : 'r', k: r() })
    }
  }
  return tris
}

const TRIS = makeTriangles()

function PolyBackground({ variant = 'split' }: { variant?: 'split' | 'green' | 'red' | 'dark' }) {
  return (
    <svg className={`poly-bg poly-${variant}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {TRIS.map((t, i) => (
        <polygon
          key={i}
          points={t.p.map((p) => p.join(',')).join(' ')}
          className={`pt pt-${t.side}${t.t}`}
          style={{ opacity: 0.35 + t.k * 0.65 }}
        />
      ))}
    </svg>
  )
}

export default memo(PolyBackground)
