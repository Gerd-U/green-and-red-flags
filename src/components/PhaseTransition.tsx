import { memo, useEffect, useState } from 'react'

// A ~400 ms sweep of low poly triangles that covers the screen when the
// phase changes, so the projector never "jumps" from one screen to another.

const COLS = 10
const ROWS = 6
const COLORS = ['#22c55e', '#16a34a', '#ff3b5c', '#d9183b', '#ffd23f', '#8b5cf6', '#1b1030']

const TRIS = (() => {
  const out: { p: string; c: string; d: number }[] = []
  const w = 100 / COLS
  const h = 100 / ROWS
  let k = 7
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const x0 = x * w
      const y0 = y * h
      k = (k * 9301 + 49297) % 233280
      const c = COLORS[k % COLORS.length]
      const d = (x / COLS) * 160 // delay in ms: sweep from left to right
      out.push({ p: `${x0},${y0} ${x0 + w},${y0} ${x0},${y0 + h}`, c, d })
      out.push({ p: `${x0 + w},${y0} ${x0 + w},${y0 + h} ${x0},${y0 + h}`, c: COLORS[(k + 3) % COLORS.length], d: d + 40 })
    }
  }
  return out
})()

function PhaseTransition({ phaseKey }: { phaseKey: string }) {
  const [shown, setShown] = useState<string | null>(null)
  const [first, setFirst] = useState(true)
  useEffect(() => {
    if (first) {
      setFirst(false)
      return
    }
    setShown(phaseKey)
    const t = setTimeout(() => setShown(null), 650)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey])
  if (!shown) return null
  return (
    <svg key={shown} className="phase-transition" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {TRIS.map((t, i) => (
        <polygon key={i} points={t.p} fill={t.c} stroke={t.c} strokeWidth="0.3" style={{ animationDelay: `${t.d}ms` }} />
      ))}
    </svg>
  )
}

export default memo(PhaseTransition)
