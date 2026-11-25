import { useEffect, useMemo, useRef, useState } from 'react'
import Avatar from '../components/Avatar'
import { POWERS } from '../data/cards'
import {
  buildSchedule,
  clamp,
  CARD_H,
  CARD_W,
  GREEN_POINTS,
  PLAYER_H,
  PLAYER_W,
  PLAYER_Y,
  RED_PENALTY,
  ROUND_MS,
  SABOTAGE_MS,
  SPAWN_Y,
} from '../lib/game'
import type {
  AvatarConfig,
  CatchMsg,
  GameState,
  MissMsg,
  Mood,
  PowerId,
  SabotageEvent,
  ScheduledCard,
  Tick,
} from '../lib/types'

const MOVE_SPEED = 1.2 / 1000 // field widths per ms
const TICK_MS = 100

interface ActiveCard {
  card: ScheduledCard
  y: number
}

interface Popup {
  id: number
  x: number
  text: string
  cls: string
  at: number
}

interface Props {
  me: string
  avatar: AvatarConfig
  state: GameState
  sabotage: SabotageEvent | null
  tilt: boolean
  out: boolean
  onTick: (t: Tick) => void
  onCatch: (m: CatchMsg) => void
  onMiss: (m: MissMsg) => void
  onPower: (power: PowerId) => void
}

export default function PlayerGame({ me, avatar, state, sabotage, tilt, out, onTick, onCatch, onMiss, onPower }: Props) {
  const schedule = useMemo(() => buildSchedule(state.seed), [state.seed])
  const round = state.round

  // --- clock (game time, follows the admin) ---
  const clock = useRef({ base: state.elapsed, at: performance.now(), running: state.running, seq: -1 })
  const now = () => {
    const c = clock.current
    return c.base + (c.running ? performance.now() - c.at : 0)
  }
  useEffect(() => {
    const c = clock.current
    if (state.seq === c.seq) return
    const predicted = now()
    if (c.seq === -1 || state.running !== c.running || !state.running || Math.abs(predicted - state.elapsed) > 250) {
      c.base = state.elapsed
      c.at = performance.now()
      c.running = state.running
    }
    c.seq = state.seq
  }, [state.seq, state.elapsed, state.running])

  // --- simulation state ---
  const sim = useRef({
    x: 0.5,
    next: 0,
    active: [] as ActiveCard[],
    score: state.roundScores[me] ?? 0,
    effects: [] as { power: PowerId; until: number }[],
    mood: undefined as Mood,
    moodUntil: 0,
    lastGame: now(),
    lastReal: performance.now(),
    lastTick: 0,
    popId: 0,
    popups: [] as Popup[],
    flash: '' as '' | 'green' | 'red',
    flashUntil: 0,
    finalSent: false,
  })
  const input = useRef({ left: false, right: false, gamma: 0 })
  const props = useRef({ onTick, onCatch, onMiss, onPower, out, tilt })
  props.current = { onTick, onCatch, onMiss, onPower, out, tilt }

  // apply sabotage aimed at me
  const lastSabotage = useRef<string | null>(null)
  useEffect(() => {
    if (!sabotage || sabotage.to !== me || sabotage.round !== round) return
    if (lastSabotage.current === sabotage.key) return
    lastSabotage.current = sabotage.key
    const s = sim.current
    const t = Math.max(0, now())
    s.effects = s.effects.filter((e) => e.power !== sabotage.power)
    s.effects.push({ power: sabotage.power, until: t + SABOTAGE_MS })
    try {
      navigator.vibrate?.([80, 60, 80])
    } catch {
      /* ignore */
    }
  }, [sabotage, me, round])

  // keyboard (handy for testing on a laptop)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') input.current.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') input.current.right = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') input.current.left = false
      if (e.key === 'ArrowRight' || e.key === 'd') input.current.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // tilt
  useEffect(() => {
    if (!tilt) return
    const onOrient = (e: DeviceOrientationEvent) => {
      let g = e.gamma ?? 0
      const angle = (screen.orientation?.angle ?? 0) as number
      if (angle === 90) g = e.beta ?? 0
      else if (angle === 270 || angle === -90) g = -(e.beta ?? 0)
      input.current.gamma = g
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => {
      window.removeEventListener('deviceorientation', onOrient)
      input.current.gamma = 0
    }
  }, [tilt])

  const [, setFrame] = useState(0)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const s = sim.current
      const p = props.current
      const realNow = performance.now()
      const realDt = Math.min(64, realNow - s.lastReal)
      s.lastReal = realNow
      const game = Math.min(now(), ROUND_MS)
      const dt = clamp(game - s.lastGame, 0, 100)
      s.lastGame = game

      s.effects = s.effects.filter((e) => e.until > game)
      const has = (id: PowerId) => s.effects.some((e) => e.power === id)
      const playing = clock.current.running && game >= 0 && game < ROUND_MS

      // movement
      if (playing && !p.out && !has('exback')) {
        let dir = (input.current.right ? 1 : 0) - (input.current.left ? 1 : 0)
        let speed = MOVE_SPEED
        if (p.tilt && dir === 0) {
          const g = input.current.gamma
          dir = Math.abs(g) < 3 ? 0 : clamp(g / 22, -1, 1)
          speed = MOVE_SPEED * 1.1
        }
        if (has('gaslighting')) dir = -dir
        s.x = clamp(s.x + dir * speed * realDt, PLAYER_W / 2, 1 - PLAYER_W / 2)
      }

      // spawn
      while (s.next < schedule.length && schedule[s.next].t <= game) {
        const card = schedule[s.next]
        const y = SPAWN_Y + (game - card.t) * card.speed
        if (y < 0.9) s.active.push({ card, y })
        s.next++
      }

      // fall + collisions
      const mult = has('mixedsignals') ? 1.9 : 1
      const keep: ActiveCard[] = []
      for (const a of s.active) {
        a.y += dt * a.card.speed * mult
        const bottom = a.y + CARD_H / 2
        const top = a.y - CARD_H / 2
        const hit =
          playing &&
          !p.out &&
          bottom >= PLAYER_Y - PLAYER_H / 2 &&
          top <= PLAYER_Y &&
          Math.abs(a.card.x - s.x) < (CARD_W / 2 + PLAYER_W / 2) * 0.78
        if (hit) {
          const c = a.card
          const pop: Popup = { id: s.popId++, x: c.x, text: '', cls: '', at: realNow }
          if (c.kind === 'green') {
            s.score += GREEN_POINTS
            s.mood = 'happy'
            s.moodUntil = realNow + 800
            s.flash = 'green'
            pop.text = `+${GREEN_POINTS}`
            pop.cls = 'pop-green'
          } else if (c.kind === 'red') {
            s.score -= RED_PENALTY
            s.mood = 'horror'
            s.moodUntil = realNow + 1100
            s.flash = 'red'
            pop.text = `-${RED_PENALTY}`
            pop.cls = 'pop-red'
            try {
              navigator.vibrate?.(150)
            } catch {
              /* ignore */
            }
          } else {
            s.mood = 'happy'
            s.moodUntil = realNow + 600
            pop.text = `${POWERS[c.power!].emoji} POWER!`
            pop.cls = 'pop-power'
            p.onPower(c.power!)
          }
          s.flashUntil = realNow + 260
          s.popups.push(pop)
          p.onCatch({ id: me, round, kind: c.kind, cardId: c.id, text: c.text })
          continue
        }
        if (top > 1.02) {
          if (a.card.kind === 'green' && a.card.text && !p.out) p.onMiss({ id: me, round, text: a.card.text })
          continue
        }
        keep.push(a)
      }
      s.active = keep
      if (s.moodUntil < realNow) s.mood = undefined
      s.popups = s.popups.filter((pp) => realNow - pp.at < 900)

      // send state to admin
      const interval = playing ? TICK_MS : 1000
      const finished = game >= ROUND_MS
      if (realNow - s.lastTick >= interval || (finished && !s.finalSent)) {
        if (finished) s.finalSent = true
        s.lastTick = realNow
        p.onTick({
          id: me,
          round,
          x: Math.round(s.x * 1000) / 1000,
          cards: s.active.map((a) => ({
            id: a.card.id,
            x: Math.round(a.card.x * 1000) / 1000,
            y: Math.round(a.y * 1000) / 1000,
            k: a.card.kind === 'green' ? 'g' : a.card.kind === 'red' ? 'r' : 'p',
          })),
          score: s.score,
          fx: s.effects.map((e) => e.power),
          mood: s.mood,
          out: p.out || undefined,
        })
      }
      setFrame((f) => (f + 1) % 1e6)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, me, round])

  const s = sim.current
  const game = now()
  const has = (id: PowerId) => s.effects.some((e) => e.power === id)
  const fx = s.effects.length ? s.effects[s.effects.length - 1].power : undefined
  const countdown = game < 0 ? Math.ceil(-game / 1000) : 0
  const timeLeft = Math.max(0, Math.ceil((ROUND_MS - Math.max(0, game)) / 1000))
  const realNow = performance.now()

  const hold = (key: 'left' | 'right', v: boolean) => (e: React.PointerEvent) => {
    e.preventDefault()
    input.current[key] = v
  }

  return (
    <div className={`pgame ${s.effects.map((e) => `scr-${e.power}`).join(' ')}`}>
      <div className="hud">
        <div className="hud-score">
          <span className="hud-label">Score</span>
          <strong>{(state.totals[me] ?? 0) + s.score}</strong>
        </div>
        <div className={`hud-time ${timeLeft <= 10 && game > 0 ? 'urgent' : ''}`}>{timeLeft}s</div>
        <div className="hud-lives" aria-label={`${state.lives[me] ?? 3} lives`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < (state.lives[me] ?? 3) ? 'heart on' : 'heart'}>
              ◆
            </span>
          ))}
        </div>
      </div>

      <div className={`field ${s.flashUntil > realNow ? `flash-${s.flash}` : ''}`}>
        {s.active.map((a) => {
          const c = a.card
          const looksGreen = c.kind === 'green' || (c.kind === 'red' && has('lovebombing'))
          const cls = c.kind === 'power' ? 'fcard power' : looksGreen ? 'fcard green' : 'fcard red'
          return (
            <div
              key={c.id}
              className={`${cls} ${has('ghosting') ? 'ghost' : ''}`}
              style={{
                left: `${c.x * 100}%`,
                top: `${a.y * 100}%`,
                width: `${CARD_W * 100}%`,
                height: `${CARD_H * 100}%`,
              }}
            >
              {c.kind === 'power' ? (
                <>
                  <span className="pw-emoji">{POWERS[c.power!].emoji}</span>
                  <span>{POWERS[c.power!].name}</span>
                </>
              ) : (
                <>
                  <span className="flag-icon">{looksGreen ? '🟩' : '🟥'}</span>
                  <span className="fcard-text">{c.text}</span>
                </>
              )}
            </div>
          )
        })}

        {s.popups.map((pp) => (
          <div key={pp.id} className={`popup ${pp.cls}`} style={{ left: `${pp.x * 100}%`, top: `${(PLAYER_Y - 0.14) * 100}%` }}>
            {pp.text}
          </div>
        ))}

        <div
          className="pchar"
          style={{
            left: `${s.x * 100}%`,
            top: `${PLAYER_Y * 100}%`,
            width: `${PLAYER_W * 100}%`,
          }}
        >
          <Avatar config={avatar} mood={s.mood} effect={fx} size={100} dim={out} />
        </div>

        {s.effects.length > 0 && (
          <div className="fx-banner" style={{ background: POWERS[s.effects[s.effects.length - 1].power].color }}>
            {POWERS[s.effects[s.effects.length - 1].power].emoji} {POWERS[s.effects[s.effects.length - 1].power].hint}
          </div>
        )}

        {countdown > 0 && (
          <div className="countdown" key={countdown}>
            {countdown}
          </div>
        )}
        {!state.running && game >= 0 && game < ROUND_MS && state.phase === 'playing' && (
          <div className="paused-badge">Paused</div>
        )}
        {out && <div className="out-badge">Heartbroken 💔 You&apos;re out of lives — keep voting!</div>}
      </div>

      <div className="controls">
        <button
          className="ctrl-btn"
          onPointerDown={hold('left', true)}
          onPointerUp={hold('left', false)}
          onPointerLeave={hold('left', false)}
          onPointerCancel={hold('left', false)}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Move left"
        >
          ◀
        </button>
        <button
          className="ctrl-btn"
          onPointerDown={hold('right', true)}
          onPointerUp={hold('right', false)}
          onPointerLeave={hold('right', false)}
          onPointerCancel={hold('right', false)}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Move right"
        >
          ▶
        </button>
      </div>
    </div>
  )
}
