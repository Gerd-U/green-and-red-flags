import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import Avatar from '../components/Avatar'
import { POWERS } from '../data/cards'
import { buildSchedule, CARD_H, CARD_W, comboMult, PLAYER_W, PLAYER_Y, START_HEARTS } from '../lib/game'
import type { MiniCard, PlayerInfo } from '../lib/types'
import type { CatchFx, TickBuffer } from './useAdminGame'

const DELAY = 150 // ms of interpolation delay (a bit more than one tick)
/** width / height of a phone's game field: the mini screens use the same shape */
export const FIELD_ASPECT = 0.62

function interpolate(buf: TickBuffer | undefined, now: number) {
  if (!buf?.cur) return null
  const cur = buf.cur
  const prev = buf.prev
  if (!prev || buf.curAt - buf.prevAt <= 0 || buf.curAt - buf.prevAt > 600) {
    return { x: cur.x, cards: cur.cards }
  }
  const t = Math.max(0, Math.min(1, (now - DELAY - buf.prevAt) / (buf.curAt - buf.prevAt)))
  const prevCards = new Map(prev.cards.map((c) => [c.id, c]))
  const cards: MiniCard[] = cur.cards.map((c) => {
    const p = prevCards.get(c.id)
    return p ? { ...c, y: p.y + (c.y - p.y) * t } : c
  })
  return { x: prev.x + (cur.x - prev.x) * t, cards }
}

const BURST: Record<string, string> = { green: '♥', red: '💔', soulmate: '★', ick: '🤢', power: '✦' }
const LOOK = { g: 'green', r: 'red', p: 'power', i: 'ick', s: 'soulmate' } as const

/** rows of mini screens: 1 row up to 4, then 2 rows with the longer one on top (7 = 4 + 3, 6 = 3 + 3, 5 = 3 + 2) */
export function gridRows(n: number): number[] {
  if (n <= 4) return [n]
  const top = Math.ceil(n / 2)
  return [top, n - top]
}

interface Props {
  players: PlayerInfo[]
  ticks: MutableRefObject<Record<string, TickBuffer>>
  catchFx: MutableRefObject<CatchFx[]>
  scores: Record<string, number>
  seed: number
  round: number
  gameSeed: number
}

export default function LiveGrid({ players, ticks, catchFx, scores, seed, round, gameSeed }: Props) {
  // same seeds as the phones -> we know which card is which without sending it
  const schedule = useMemo(() => buildSchedule(seed, round, gameSeed), [seed, round, gameSeed])
  const [, setFrame] = useState(0)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      setFrame((f) => (f + 1) % 1e6)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // size every mini screen so all rows fit, same size for everybody
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rows = gridRows(players.length)
  const perRow = Math.max(1, ...rows)
  const gap = Math.max(10, window.innerHeight * 0.016)
  const fs = Math.max(18, window.innerHeight * 0.025) // = --fs-s (header and hearts lines)
  const chrome = fs * 2.9 + 10 // header line + hearts line + borders
  const byHeight = ((size.h - (rows.length - 1) * gap) / rows.length - chrome) * FIELD_ASPECT
  const byWidth = (size.w - (perRow - 1) * gap) / perRow
  const miniW = Math.max(80, Math.floor(Math.min(byHeight, byWidth)))

  const now = performance.now()
  let start = 0
  return (
    <div className="lg" ref={box} style={{ ['--gap' as string]: `${gap}px` }}>
      {size.w > 0 &&
        rows.map((count, r) => {
          const row = players.slice(start, start + count)
          start += count
          return (
            <div className="lg-row" key={r}>
              {row.map((p) => {
                const buf = ticks.current[p.id]
                const view = interpolate(buf, now)
                const tick = buf?.cur
                const fx = tick?.fx?.length ? tick.fx[tick.fx.length - 1] : tick?.shield ? 'therapy' : undefined
                const stale = !buf || now - buf.curAt > 2500
                const hearts = tick ? tick.hearts : START_HEARTS
                const mult = comboMult(tick?.streak ?? 0)
                const recent = catchFx.current.filter((c) => c.pid === p.id && now - c.at < 1000)
                const shaking = recent.some((c) => c.kind === 'red' && now - c.at < 350)
                return (
                  <div
                    key={p.id}
                    className={`pm ${fx ? `pm-fx-${fx}` : ''} ${shaking ? 'shake' : ''} ${tick?.hb ? 'pm-broken' : ''}`}
                    style={{ width: miniW, ['--pc' as string]: p.avatar.topColor }}
                  >
                    <div className="pm-head">
                      <Avatar config={p.avatar} crop="head" size={28} animate={false} />
                      <span className="pm-name">{p.name}</span>
                      <span className="pm-score">{Math.round(scores[p.id] ?? 0)}</span>
                    </div>
                    <div className="pm-field">
                      <div className="pm-floor" style={{ top: `${(PLAYER_Y + 0.06) * 100}%` }} />
                      {view?.cards.map((c) => {
                        const sc = schedule[c.id]
                        return (
                          <div
                            key={c.id}
                            className={`pm-card m-${c.h ? 'grey' : LOOK[c.k]} ${fx === 'ghosting' ? 'ghost' : ''}`}
                            style={{
                              left: `${c.x * 100}%`,
                              top: `${c.y * 100}%`,
                              width: `${CARD_W * 100}%`,
                              height: `${CARD_H * 100}%`,
                            }}
                          >
                            {c.k === 'p' ? POWERS[sc?.power ?? 'ghosting'].emoji : c.k === 's' ? '★' : c.k === 'i' ? '🤢' : ''}
                          </div>
                        )
                      })}
                      <div
                        className="pm-char"
                        style={{ left: `${(view?.x ?? 0.5) * 100}%`, top: `${PLAYER_Y * 100}%`, width: `${PLAYER_W * 110}%` }}
                      >
                        <Avatar config={p.avatar} pose={tick?.pose ?? 'idle'} facing={tick?.f ?? 1} effect={fx} size={60} />
                      </div>
                      {recent.map((c, i) => (
                        <div
                          key={`${c.at}-${i}`}
                          className={`burst burst-${c.kind} small`}
                          style={{ left: `${(view?.x ?? 0.5) * 100}%`, top: `${PLAYER_Y * 100 - 6}%` }}
                        >
                          {Array.from({ length: 6 }, (_, k) => (
                            <i key={k} style={{ ['--a' as string]: `${k * 60 + 15}deg` }}>
                              {BURST[c.kind] ?? '✦'}
                            </i>
                          ))}
                        </div>
                      ))}
                      {mult >= 2 && <div className={`pm-combo x${mult}`}>x{mult}</div>}
                      {fx && (
                        <div className="pm-fx" style={{ background: POWERS[fx].color }}>
                          {POWERS[fx].emoji} {POWERS[fx].name}
                        </div>
                      )}
                      {tick?.hb && <div className="pm-stale broken">💔</div>}
                      {stale && !tick?.hb && <div className="pm-stale">…</div>}
                    </div>
                    <div className="pm-foot">
                      <span className="pm-hearts" aria-label={`${hearts} hearts`}>
                        {Array.from({ length: START_HEARTS }, (_, i) => (
                          <i key={i} className={i < hearts ? 'on' : ''}>
                            ♥
                          </i>
                        ))}
                      </span>
                      {p.bot && <span className="bot-tag">BOT</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
    </div>
  )
}
