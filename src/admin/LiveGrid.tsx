import { useEffect, useMemo, useState, type MutableRefObject } from 'react'
import Avatar from '../components/Avatar'
import { POWERS } from '../data/cards'
import { buildSchedule, CARD_H, CARD_W, PLAYER_W, PLAYER_Y } from '../lib/game'
import type { MiniCard, PlayerInfo } from '../lib/types'
import type { TickBuffer } from './useAdminGame'

const DELAY = 150 // ms of interpolation delay (a bit more than one tick)

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

interface Props {
  players: PlayerInfo[]
  ticks: MutableRefObject<Record<string, TickBuffer>>
  lives: Record<string, number>
  scores: Record<string, number>
  seed: number
}

export default function LiveGrid({ players, ticks, lives, scores, seed }: Props) {
  // same seed as the phones -> we know every card's text without sending it
  const schedule = useMemo(() => buildSchedule(seed), [seed])
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

  const now = performance.now()
  const cols = players.length <= 2 ? players.length || 1 : players.length <= 4 ? players.length : players.length <= 6 ? 3 : 4
  return (
    <div className="live-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {players.map((p) => {
        const buf = ticks.current[p.id]
        const view = interpolate(buf, now)
        const tick = buf?.cur
        const fx = tick?.fx?.length ? tick.fx[tick.fx.length - 1] : undefined
        const stale = !buf || now - buf.curAt > 2500
        const out = (lives[p.id] ?? 3) <= 0
        return (
          <div
            key={p.id}
            className={`mini ${fx ? `mini-fx-${fx}` : ''} ${out ? 'mini-out' : ''}`}
            style={{ ['--pc' as string]: p.avatar.topColor }}
          >
            <div className="mini-head">
              <span className="mini-name">{p.name}</span>
              <span className="mini-lives">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < (lives[p.id] ?? 3) ? 'heart on' : 'heart'}>
                    ◆
                  </span>
                ))}
              </span>
              <span className="mini-score">{scores[p.id] ?? 0}</span>
            </div>
            <div className="mini-field">
              {view?.cards.map((c) => (
                <div
                  key={c.id}
                  className={`mcard m-${c.k} ${fx === 'ghosting' ? 'ghost' : ''}`}
                  style={{
                    left: `${c.x * 100}%`,
                    top: `${c.y * 100}%`,
                    width: `${CARD_W * 100}%`,
                    height: `${CARD_H * 100}%`,
                  }}
                >
                  {c.k === 'p' ? POWERS[schedule[c.id]?.power ?? 'ghosting'].emoji : schedule[c.id]?.text}
                </div>
              ))}
              <div
                className="mini-char"
                style={{ left: `${(view?.x ?? 0.5) * 100}%`, top: `${PLAYER_Y * 100}%`, width: `${PLAYER_W * 130}%` }}
              >
                <Avatar config={p.avatar} pose={tick?.mood === 'happy' ? 'cheer' : tick?.mood === 'horror' ? 'scared' : 'idle'} effect={fx} size={60} dim={out} />
              </div>
              {fx && (
                <div className="mini-fx-label" style={{ background: POWERS[fx].color }}>
                  {POWERS[fx].emoji} {POWERS[fx].name}
                </div>
              )}
              {stale && !out && <div className="mini-stale">connecting…</div>}
              {out && <div className="mini-stale">💔 out</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
