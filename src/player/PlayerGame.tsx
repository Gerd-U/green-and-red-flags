import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import Avatar from '../components/Avatar'
import RoundBackdrop from '../components/RoundBackdrop'
import { POWERS } from '../data/cards'
import {
  buildSchedule,
  CARD_H,
  CARD_W,
  CATCH_REVEAL_MS,
  clamp,
  comboMult,
  DASH_COOLDOWN_MS,
  DASH_DISTANCE,
  DASH_MS,
  GREEN_POINTS,
  HEARTBROKEN_MS,
  HIT_DX,
  MAX_STREAK_LEVEL,
  MISS_PENALTY,
  MOVE_SPEED,
  PLAYER_W,
  PLAYER_Y,
  RED_PENALTY,
  roundConfig,
  SABOTAGE_MS,
  SOULMATE_POINTS,
  SPAWN_Y,
  START_HEARTS,
  TICK_MS,
} from '../lib/game'
import type {
  AvatarConfig,
  CatchMsg,
  GameState,
  GrantEvent,
  MissMsg,
  Pose,
  PowerId,
  SabotageEvent,
  ScheduledCard,
  Tick,
} from '../lib/types'

/** Things the game reports to the page (sounds, toasts). */
export type GameFeedback =
  | { type: 'green'; streak: number }
  | { type: 'red'; broke: boolean }
  | { type: 'miss' }
  | { type: 'soulmate' }
  | { type: 'ick' }
  | { type: 'power'; power: PowerId }
  | { type: 'shield-used'; from: string }
  | { type: 'sabotaged'; from: string; power: PowerId }
  | { type: 'heartbroken-over' }
  | { type: 'dash' }
  | { type: 'countdown'; n: number }
  | { type: 'last10' }
  | { type: 'end' }

interface ActiveCard {
  card: ScheduledCard
  y: number
  revealed: boolean
}

interface Burst {
  id: number
  x: number
  at: number
  kind: 'green' | 'red' | 'gold' | 'ick' | 'power'
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
  grant: GrantEvent | null
  tilt: boolean
  /** autopilot (dev bots and the projector's demo bots) */
  bot?: boolean
  onTick: (t: Tick) => void
  onCatch: (m: CatchMsg) => void
  onMiss: (m: MissMsg) => void
  onPower: (power: PowerId) => void
  onFeedback: (f: GameFeedback) => void
}

const fmtPts = (n: number) => (n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`)

export default function PlayerGame({ me, avatar, state, sabotage, grant, tilt, bot = false, onTick, onCatch, onMiss, onPower, onFeedback }: Props) {
  const round = state.round
  const cfg = roundConfig(round)
  const schedule = useMemo(() => buildSchedule(state.seed, round, state.gameSeed), [state.seed, round, state.gameSeed])

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
    facing: 1 as -1 | 1,
    moving: false,
    next: 0,
    active: [] as ActiveCard[],
    score: state.roundScores[me] ?? 0,
    // a player who reloads while heartbroken comes back with 1 heart
    hearts: Math.max(1, state.hearts[me] ?? START_HEARTS),
    streak: 0,
    hbUntil: 0, // game time
    streakBeforeBreak: 0,
    shield: false,
    effects: [] as { power: PowerId; until: number }[],
    reaction: '' as '' | 'cheer' | 'scared',
    reactionUntil: 0,
    dashUntil: 0,
    dashDir: 0,
    dashReadyAt: 0,
    lastGame: now(),
    lastReal: performance.now(),
    lastTick: 0,
    finalSent: false,
    lastCountdown: 99,
    last10: false,
    uid: 0,
    bursts: [] as Burst[],
    popups: [] as Popup[],
    shakeUntil: 0,
    flash: '' as '' | 'green' | 'red' | 'gold',
    flashUntil: 0,
    reveal: null as null | { text: string; kind: string; until: number; id: number },
  })

  const input = useRef({ left: false, right: false, gamma: 0, lastTap: { dir: 0, at: 0 }, swipe: null as null | { x: number; at: number } })
  const props = useRef({ onTick, onCatch, onMiss, onPower, onFeedback, tilt })
  props.current = { onTick, onCatch, onMiss, onPower, onFeedback, tilt }

  const fb = (f: GameFeedback) => props.current.onFeedback(f)

  // --- sabotage aimed at me ---
  const lastSabotage = useRef<string | null>(null)
  useEffect(() => {
    if (!sabotage || sabotage.to !== me || sabotage.round !== round) return
    if (lastSabotage.current === sabotage.key) return
    lastSabotage.current = sabotage.key
    const s = sim.current
    if (s.shield) {
      s.shield = false
      fb({ type: 'shield-used', from: sabotage.from })
      return
    }
    const t = Math.max(0, now())
    s.effects = s.effects.filter((e) => e.power !== sabotage.power)
    s.effects.push({ power: sabotage.power, until: t + SABOTAGE_MS })
    fb({ type: 'sabotaged', from: sabotage.from, power: sabotage.power })
    try {
      navigator.vibrate?.([80, 60, 80])
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sabotage, me, round])

  // --- heart given back by the admin (won a defense) ---
  const lastGrant = useRef<string | null>(null)
  useEffect(() => {
    if (!grant || grant.to !== me || lastGrant.current === grant.key) return
    lastGrant.current = grant.key
    const s = sim.current
    if (s.hbUntil > 0) {
      s.hbUntil = 0
      s.hearts = grant.hearts
      s.streak = s.streakBeforeBreak
    } else {
      s.hearts = Math.min(START_HEARTS, s.hearts + grant.hearts)
    }
  }, [grant, me])

  // --- dash ---
  const dash = (dir: number) => {
    const s = sim.current
    const real = performance.now()
    if (real < s.dashReadyAt || dir === 0 || s.hbUntil > 0) return
    s.dashUntil = real + DASH_MS
    s.dashDir = dir
    s.dashReadyAt = real + DASH_COOLDOWN_MS
    fb({ type: 'dash' })
  }

  // keyboard (handy for testing on a laptop; shift or space = dash)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') input.current.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') input.current.right = true
      if (e.key === 'Shift' || e.key === ' ') dash(sim.current.facing)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // The avatar is drawn with a fixed width (PLAYER_W of the field width), so
  // its height in field units depends on the phone's aspect ratio. We measure
  // the field to know where the body really is (collision = what you see).
  const fieldRef = useRef<HTMLDivElement>(null)
  const aspect = useRef(0.6)
  useEffect(() => {
    const el = fieldRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.height > 0) aspect.current = r.width / r.height
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const s = sim.current
      const p = props.current
      const realNow = performance.now()
      const realDt = Math.min(64, realNow - s.lastReal)
      s.lastReal = realNow
      const game = Math.min(now(), cfg.durationMs)
      const dt = clamp(game - s.lastGame, 0, 100)
      s.lastGame = game

      // countdown beeps / last 10 s / end
      if (game < 0) {
        const n = Math.ceil(-game / 1000)
        if (n !== s.lastCountdown) {
          s.lastCountdown = n
          fb({ type: 'countdown', n })
        }
      } else if (s.lastCountdown !== 0 && s.lastCountdown !== 99) {
        s.lastCountdown = 0
        fb({ type: 'countdown', n: 0 })
      }
      if (!s.last10 && game >= cfg.durationMs - 10_000 && game < cfg.durationMs && clock.current.running) {
        s.last10 = true
        fb({ type: 'last10' })
      }

      s.effects = s.effects.filter((e) => e.until > game)
      const has = (id: PowerId) => s.effects.some((e) => e.power === id)
      const playing = clock.current.running && game >= 0 && game < cfg.durationMs

      // heartbroken ends -> back with 1 heart and half the combo
      if (s.hbUntil > 0 && game >= s.hbUntil) {
        s.hbUntil = 0
        s.hearts = 1
        s.streak = Math.floor(s.streakBeforeBreak / 2)
        fb({ type: 'heartbroken-over' })
      }
      const broken = s.hbUntil > 0

      const { bodyTop, bodyBottom } = bodyBox(aspect.current)

      // dev bot: pick the x that catches greens and avoids reds in the next
      // rows (and make a mistake on ~1 card out of 5)
      if (bot) {
        const near = s.active.filter((a) => a.y < bodyBottom && a.y > 0.15)
        let best = s.x
        let bestV = -Infinity
        for (let x = PLAYER_W / 2; x <= 1 - PLAYER_W / 2; x += 0.03) {
          let v = -Math.abs(x - s.x) * 0.6
          for (const a of near) {
            if (Math.abs(a.card.x - x) >= HIT_DX + 0.02) continue
            const good = a.card.kind !== 'red' && a.card.kind !== 'ick'
            const dumb = (a.card.id * 7 + round) % 5 === 0
            v += (good !== dumb ? 1 : -1.6) * (0.4 + a.y)
          }
          if (v > bestV) {
            bestV = v
            best = x
          }
        }
        input.current.left = best < s.x - 0.02
        input.current.right = best > s.x + 0.02
      }

      // movement
      s.moving = false
      if (playing && !has('exback')) {
        let dir = (input.current.right ? 1 : 0) - (input.current.left ? 1 : 0)
        let speed = MOVE_SPEED
        if (p.tilt && dir === 0) {
          const g = input.current.gamma
          dir = Math.abs(g) < 3 ? 0 : clamp(g / 22, -1, 1)
          speed = MOVE_SPEED * 1.1
        }
        if (has('gaslighting')) dir = -dir
        if (realNow < s.dashUntil) {
          dir = has('gaslighting') ? -s.dashDir : s.dashDir
          speed = DASH_DISTANCE / DASH_MS
        }
        if (dir !== 0) {
          s.facing = dir > 0 ? 1 : -1
          s.moving = true
        }
        s.x = clamp(s.x + dir * speed * realDt, PLAYER_W / 2, 1 - PLAYER_W / 2)
      }

      // spawn
      while (s.next < schedule.length && schedule[s.next].t <= game) {
        const card = schedule[s.next]
        const y = SPAWN_Y + (game - card.t) * card.speed
        if (y < 0.8) s.active.push({ card, y, revealed: !card.grey })
        s.next++
      }

      // fall + collisions
      const mult = has('mixedsignals') ? 1.8 : 1
      const pm = cfg.pointsMult
      const keep: ActiveCard[] = []
      for (const a of s.active) {
        a.y += dt * a.card.speed * mult
        const bottom = a.y + CARD_H / 2
        const top = a.y - CARD_H / 2
        if (!a.revealed && bottom >= bodyTop) a.revealed = true
        const hit =
          playing && !broken && bottom >= bodyTop && top <= bodyBottom && Math.abs(a.card.x - s.x) < HIT_DX
        if (hit) {
          const c = a.card
          const pop: Popup = { id: s.uid++, x: c.x, text: '', cls: '', at: realNow }
          const burst: Burst = { id: s.uid++, x: s.x, at: realNow, kind: 'green' }
          let broke = false
          if (c.kind === 'green') {
            const pts = GREEN_POINTS * comboMult(s.streak) * pm
            s.score += pts
            s.streak++
            s.reaction = 'cheer'
            s.reactionUntil = realNow + 700
            s.flash = 'green'
            pop.text = fmtPts(pts)
            pop.cls = 'pop-green'
            fb({ type: 'green', streak: s.streak })
          } else if (c.kind === 'red') {
            s.score -= RED_PENALTY * pm
            s.hearts = Math.max(0, s.hearts - 1)
            s.streakBeforeBreak = s.streak
            s.streak = 0
            s.reaction = 'scared'
            s.reactionUntil = realNow + 1100
            s.flash = 'red'
            s.shakeUntil = realNow + 350
            burst.kind = 'red'
            pop.text = fmtPts(-RED_PENALTY * pm)
            pop.cls = 'pop-red'
            if (s.hearts <= 0) {
              broke = true
              s.hbUntil = Math.max(game, 0) + HEARTBROKEN_MS
            }
            fb({ type: 'red', broke })
            try {
              navigator.vibrate?.(150)
            } catch {
              /* ignore */
            }
          } else if (c.kind === 'soulmate') {
            s.score += SOULMATE_POINTS * pm
            s.hearts = Math.min(START_HEARTS, s.hearts + 1)
            s.reaction = 'cheer'
            s.reactionUntil = realNow + 1200
            s.flash = 'gold'
            burst.kind = 'gold'
            pop.text = `${fmtPts(SOULMATE_POINTS * pm)} ♥`
            pop.cls = 'pop-gold'
            fb({ type: 'soulmate' })
          } else if (c.kind === 'ick') {
            s.reaction = 'scared'
            s.reactionUntil = realNow + 700
            burst.kind = 'ick'
            pop.text = '🤢 ICK'
            pop.cls = 'pop-ick'
            fb({ type: 'ick' })
          } else {
            const power = c.power!
            s.reaction = 'cheer'
            s.reactionUntil = realNow + 600
            burst.kind = 'power'
            pop.text = `${POWERS[power].emoji} ${POWERS[power].name}!`
            pop.cls = 'pop-power'
            if (power === 'therapy') s.shield = true
            else p.onPower(power)
            fb({ type: 'power', power })
          }
          s.flashUntil = realNow + 260
          s.popups.push(pop)
          s.bursts.push(burst)
          if (c.full) s.reveal = { text: c.full, kind: c.kind, until: realNow + CATCH_REVEAL_MS, id: c.id }
          p.onCatch({ id: me, round, kind: c.kind, cardId: c.id, text: c.full ?? c.text, power: c.power, streak: s.streak, broke, grey: c.grey })
          continue
        }
        if (top > 1.02) {
          if (a.card.kind === 'green' && a.card.text && clock.current.running && !broken) {
            s.score -= MISS_PENALTY * pm
            s.popups.push({ id: s.uid++, x: a.card.x, text: fmtPts(-MISS_PENALTY * pm), cls: 'pop-miss', at: realNow })
            p.onMiss({ id: me, round, text: a.card.full ?? a.card.text })
            fb({ type: 'miss' })
          }
          continue
        }
        keep.push(a)
      }
      s.active = keep
      if (s.reactionUntil < realNow) s.reaction = ''
      s.popups = s.popups.filter((pp) => realNow - pp.at < 900)
      s.bursts = s.bursts.filter((b) => realNow - b.at < 900)

      // send state to admin (~7/s while playing, 1/s otherwise)
      const finished = game >= cfg.durationMs
      if (finished && !s.finalSent) fb({ type: 'end' })
      const interval = playing ? TICK_MS : 1000
      if (realNow - s.lastTick >= interval || (finished && !s.finalSent)) {
        if (finished) s.finalSent = true
        s.lastTick = realNow
        p.onTick({
          id: me,
          round,
          x: Math.round(s.x * 1000) / 1000,
          f: s.facing,
          pose: poseOf(s, broken),
          cards: s.active.map((a) => ({
            id: a.card.id,
            x: Math.round(a.card.x * 1000) / 1000,
            y: Math.round(a.y * 1000) / 1000,
            k: KIND_CODE[a.card.kind],
            ...(a.revealed ? {} : { h: 1 as const }),
          })),
          score: Math.round(s.score),
          hearts: broken ? 0 : s.hearts,
          streak: s.streak,
          ...(broken ? { hb: 1 as const } : {}),
          ...(s.shield ? { shield: 1 as const } : {}),
          fx: s.effects.map((e) => e.power),
        })
      }
      setFrame((f) => (f + 1) % 1e6)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, me, round])

  // ---------- render ----------
  const s = sim.current
  const game = now()
  const realNow = performance.now()
  const has = (id: PowerId) => s.effects.some((e) => e.power === id)
  const broken = s.hbUntil > 0
  const fx: PowerId | undefined = s.effects.length ? s.effects[s.effects.length - 1].power : s.shield ? 'therapy' : undefined
  const countdown = game < 0 ? Math.ceil(-game / 1000) : 0
  const timeLeft = Math.max(0, Math.ceil((cfg.durationMs - Math.max(0, game)) / 1000))
  const mult = comboMult(s.streak)
  const dashReady = realNow >= s.dashReadyAt

  const press = (key: 'left' | 'right', v: boolean) => (e: RPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    input.current[key] = v
    if (v) {
      const dir = key === 'left' ? -1 : 1
      const t = input.current.lastTap
      const at = performance.now()
      if (t.dir === dir && at - t.at < 280) dash(dir)
      input.current.lastTap = { dir, at }
    }
  }
  const swipeStart = (e: RPointerEvent) => {
    input.current.swipe = { x: e.clientX, at: performance.now() }
  }
  const swipeEnd = (e: RPointerEvent) => {
    const sw = input.current.swipe
    input.current.swipe = null
    if (!sw) return
    const dx = e.clientX - sw.x
    if (Math.abs(dx) > 40 && performance.now() - sw.at < 300) dash(dx > 0 ? 1 : -1)
  }

  return (
    <div className={`pgame ${s.effects.map((e) => `scr-${e.power}`).join(' ')} ${s.shakeUntil > realNow ? 'shake' : ''}`}>
      <div className="hud">
        <div className="hud-score">
          <span className="hud-label">Score</span>
          <strong>{Math.round((state.totals[me] ?? 0) + s.score)}</strong>
        </div>
        <div className="hud-mid">
          <div className={`hud-time ${timeLeft <= 10 && game > 0 ? 'urgent' : ''}`}>{timeLeft}s</div>
          <div className="hud-round">
            R{round} · {cfg.name}
            {cfg.pointsMult > 1 ? ' · x2' : ''}
          </div>
        </div>
        <div className="hud-right">
          <div className="hud-lives" aria-label={`${s.hearts} hearts`}>
            {Array.from({ length: START_HEARTS }, (_, i) => (
              <span key={i} className={i < (broken ? 0 : s.hearts) ? 'heart on' : 'heart'}>
                ♥
              </span>
            ))}
          </div>
          <div className={`combo-badge lvl-${Math.min(s.streak, MAX_STREAK_LEVEL)}`} key={mult}>
            x{mult} combo
          </div>
        </div>
      </div>

      <div
        ref={fieldRef}
        className={`field ${s.flashUntil > realNow ? `flash-${s.flash}` : ''}`}
        onPointerDown={swipeStart}
        onPointerUp={swipeEnd}
        onPointerCancel={() => (input.current.swipe = null)}
      >
        <RoundBackdrop theme={cfg.theme} className="field-bd" />
        {s.active.map((a) => {
          const c = a.card
          let look: string = c.kind
          if (!a.revealed) look = 'grey'
          if (has('lovebombing') && (c.kind === 'red' || c.kind === 'green')) look = 'green'
          return (
            <div
              key={c.id}
              className={`fcard ${look} ${has('ghosting') ? 'ghost' : ''}`}
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
                  {ICON[look] && <span className="fcard-icon">{ICON[look]}</span>}
                  <span className="fcard-text">{c.text}</span>
                </>
              )}
            </div>
          )
        })}

        <div className="player-line" style={{ top: `${bodyBox(aspect.current).bodyTop * 100}%` }} />

        {s.bursts.map((b) => (
          <div key={b.id} className={`burst burst-${b.kind}`} style={{ left: `${b.x * 100}%`, top: `${PLAYER_Y * 100 - 4}%` }}>
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} style={{ ['--a' as string]: `${i * 45 + 10}deg` }}>
                {BURST_CHAR[b.kind]}
              </i>
            ))}
          </div>
        ))}

        {s.popups.map((pp) => (
          <div key={pp.id} className={`popup ${pp.cls}`} style={{ left: `${pp.x * 100}%`, top: `${(PLAYER_Y - 0.17) * 100}%` }}>
            {pp.text}
          </div>
        ))}

        <div className="pchar" style={{ left: `${s.x * 100}%`, top: `${PLAYER_Y * 100}%`, width: `${PLAYER_W * 100}%` }}>
          <Avatar config={avatar} pose={poseOf(s, broken)} facing={s.facing} effect={fx} size={100} />
        </div>

        {s.effects.length > 0 && (
          <div className="fx-banner" style={{ background: POWERS[s.effects[s.effects.length - 1].power].color }}>
            {POWERS[s.effects[s.effects.length - 1].power].emoji} {POWERS[s.effects[s.effects.length - 1].power].hint}
          </div>
        )}
        {s.shield && !s.effects.length && <div className="shield-badge">🛡️ Therapy shield ON</div>}

        {s.reveal && s.reveal.until > realNow && (
          <div className={`catch-reveal cr-${s.reveal.kind}`} key={s.reveal.id}>
            {s.reveal.text}
          </div>
        )}

        {countdown > 0 && (
          <div className="countdown" key={countdown}>
            {countdown}
            <small>{cfg.tagline}</small>
          </div>
        )}
        {!state.running && game >= 0 && game < cfg.durationMs && state.phase === 'playing' && (
          <div className="paused-badge">Paused</div>
        )}
        {broken && (
          <div className="broken-badge">
            💔 Heartbroken! Back in {Math.max(1, Math.ceil((s.hbUntil - game) / 1000))}s
          </div>
        )}
      </div>

      <div className="controls">
        <button
          className="ctrl-btn"
          onPointerDown={press('left', true)}
          onPointerUp={press('left', false)}
          onPointerLeave={press('left', false)}
          onPointerCancel={press('left', false)}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Move left"
        >
          ◀
        </button>
        <button
          className={`dash-btn ${dashReady ? 'ready' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault()
            dash(sim.current.facing)
          }}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Dash (quick jump to the side you are facing)"
        >
          <span className="dash-icon">⚡</span>
          <span className="dash-label">Dash</span>
        </button>
        <button
          className="ctrl-btn"
          onPointerDown={press('right', true)}
          onPointerUp={press('right', false)}
          onPointerLeave={press('right', false)}
          onPointerCancel={press('right', false)}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Move right"
        >
          ▶
        </button>
      </div>
    </div>
  )
}

/**
 * Where the drawn body is, in field units. The avatar box is PLAYER_W wide,
 * 174/132 as tall as wide (Avatar viewBox), and is placed with
 * translate(-50%, -62%) at PLAYER_Y. The hair starts ~7% below the box top
 * and the shoe soles end ~5% above its bottom.
 */
function bodyBox(aspect: number) {
  const h = PLAYER_W * (174 / 132) * aspect
  return { bodyTop: PLAYER_Y - 0.62 * h + 0.07 * h, bodyBottom: PLAYER_Y + 0.38 * h - 0.05 * h }
}

const KIND_CODE = { green: 'g', red: 'r', power: 'p', ick: 'i', soulmate: 's' } as const

const ICON: Record<string, string> = {
  ick: '🤢',
  soulmate: '★',
}

const BURST_CHAR: Record<Burst['kind'], string> = {
  green: '♥',
  red: '💔',
  gold: '★',
  ick: '🤢',
  power: '✦',
}

function poseOf(s: { reaction: string; moving: boolean }, broken: boolean): Pose {
  if (broken) return 'cry'
  if (s.reaction === 'cheer') return 'cheer'
  if (s.reaction === 'scared') return 'scared'
  return s.moving ? 'walk' : 'idle'
}
