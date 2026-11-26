import { useEffect, useMemo, useState, type MutableRefObject } from 'react'
import Avatar from '../components/Avatar'
import { POWERS } from '../data/cards'
import { buildSchedule, CARD_H, CARD_W, comboMult, PLAYER_W, PLAYER_Y, START_HEARTS } from '../lib/game'
import type { MiniCard, PlayerInfo } from '../lib/types'
import type { CatchFx, TickBuffer } from './useAdminGame'

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

const BURST: Record<string, string> = { green: '♥', red: '💔', soulmate: '★', ick: '🤢', power: '✦' }

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
  // same seeds as the phones -> we know every card's text without sending it
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

  const now = performance.now()
  const n = players.length
  // up to 4 per row; with 7 players: 4 on top, 3 centered below, all the same size
  const perRow = n <= 4 ? Math.max(1, n) : Math.ceil(n / 2) > 4 ? 5 : 4
  const rows = Math.ceil(n / perRow) || 1
  return (
    <div className="live-grid" style={{ ['--per-row' as string]: perRow, ['--rows' as string]: rows }}>
      {players.map((p) => {
        const buf = ticks.current[p.id]
        const view = interpolate(buf, now)
        const tick = buf?.cur
        const fx = tick?.fx?.length ? tick.fx[tick.fx.length - 1] : tick?.shield ? 'therapy' : undefined
        const stale = !buf || now - buf.curAt > 2500
        const hearts = tick ? tick.hearts : START_HEARTS
        const streak = tick?.streak ?? 0
        const recent = catchFx.current.filter((c) => c.pid === p.id && now - c.at < 1000)
        const shaking = recent.some((c) => c.kind === 'red' && now - c.at < 350)
        return (
          <div
            key={p.id}
            className={`mini ${fx ? `mini-fx-${fx}` : ''} ${shaking ? 'shake' : ''} ${tick?.hb ? 'mini-broken' : ''}`}
            style={{ ['--pc' as string]: p.avatar.topColor }}
          >
            <div className="mini-head">
              <span className="mini-face">
                <Avatar config={p.avatar} crop="head" size={30} animate={false} />
              </span>
              <span className="mini-name">
                {p.name}
                {p.bot && <span className="bot-tag">BOT</span>}
              </span>
              <span className="mini-score">{Math.round(scores[p.id] ?? 0)}</span>
              <span className="mini-lives">
                {Array.from({ length: START_HEARTS }, (_, i) => (
                  <span key={i} className={i < hearts ? 'heart on' : 'heart'}>
                    ♥
                  </span>
                ))}
              </span>
              <span className={`mini-combo lvl-${Math.min(streak, 3)}`}>{streak >= 1 ? `x${comboMult(streak)}` : ''}</span>
            </div>
            <div className="mini-field">
              {view?.cards.map((c) => {
                const look = c.h ? 'grey' : { g: 'green', r: 'red', p: 'power', i: 'ick', s: 'soulmate' }[c.k]
                const sc = schedule[c.id]
                return (
                  <div
                    key={c.id}
                    className={`mcard m-${look} ${fx === 'ghosting' ? 'ghost' : ''}`}
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
              {(() => {
                // the lowest card's short text, big enough to read on the projector
                const low = view?.cards.filter((c) => c.k !== 'p').sort((a, b) => b.y - a.y)[0]
                const sc = low ? schedule[low.id] : undefined
                if (!low || !sc?.text) return null
                const look = low.h ? 'grey' : { g: 'green', r: 'red', p: 'power', i: 'ick', s: 'soulmate' }[low.k]
                return (
                  <div className={`mcap m-${look}`} style={{ top: `${low.y * 100}%` }}>
                    {sc.text}
                  </div>
                )
              })()}
              <div
                className="mini-char"
                style={{ left: `${(view?.x ?? 0.5) * 100}%`, top: `${PLAYER_Y * 100}%`, width: `${PLAYER_W * 120}%` }}
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
              {(() => {
                const r = [...recent].reverse().find((c) => c.text && now - c.at < 1000)
                return r ? (
                  <div className={`mini-reveal cr-${r.kind}`} key={`${r.at}`}>
                    {r.text}
                  </div>
                ) : null
              })()}
              {fx && (
                <div className="mini-fx-label" style={{ background: POWERS[fx].color }}>
                  {POWERS[fx].emoji} {POWERS[fx].name}
                </div>
              )}
              {tick?.hb && <div className="mini-stale broken">💔 Heartbroken</div>}
              {stale && !tick?.hb && <div className="mini-stale">connecting…</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
