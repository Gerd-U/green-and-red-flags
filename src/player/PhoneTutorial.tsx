import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import Avatar from '../components/Avatar'
import { GREEN_FLAGS, RED_FLAGS } from '../data/cards'
import { clamp, TUTORIAL_MS } from '../lib/game'
import type { AvatarConfig, Pose } from '../lib/types'

// The phone tutorial: 3 short hands-on steps instead of a wall of text.
// Practice cards fall and can be caught; nothing counts for the score.
// (The full rules stay on the projector's tutorial, which the host explains.)

const STEPS = [
  { title: 'Catch the GREEN ones', kind: 'green' as const },
  { title: 'Dodge the RED ones', kind: 'red' as const },
  { title: 'GREY ones: read them first!', kind: 'grey' as const },
]

interface PCard {
  id: number
  x: number
  y: number
  good: boolean
  grey: boolean
  text: string
  revealed: boolean
}

const PLAYER_W = 0.25
const PLAYER_Y = 0.8
const CARD_W = 0.36
const SPEED = 1 / 2600 // field heights per ms

export default function PhoneTutorial({ avatar, msLeft }: { avatar: AvatarConfig; msLeft: number }) {
  const stepMs = TUTORIAL_MS / STEPS.length
  const elapsed = clamp(TUTORIAL_MS - msLeft, 0, TUTORIAL_MS - 1)
  const step = Math.min(STEPS.length - 1, Math.floor(elapsed / stepMs))
  const stepLeft = Math.max(0, Math.ceil((stepMs * (step + 1) - elapsed) / 1000))
  const cur = STEPS[step]

  const sim = useRef({ x: 0.5, cards: [] as PCard[], last: performance.now(), lastSpawn: 0, uid: 0, msg: '', msgUntil: 0, pose: 'idle' as Pose, poseUntil: 0, facing: 1 as -1 | 1, step: -1 })
  const input = useRef({ left: false, right: false })
  const [, setFrame] = useState(0)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const s = sim.current
      const now = performance.now()
      const dt = Math.min(64, now - s.last)
      s.last = now
      if (s.step !== step) {
        s.step = step
        s.cards = []
        s.lastSpawn = 0
      }
      // move
      const dir = (input.current.right ? 1 : 0) - (input.current.left ? 1 : 0)
      if (dir) s.facing = dir > 0 ? 1 : -1
      s.x = clamp(s.x + dir * 0.0012 * dt, PLAYER_W / 2, 1 - PLAYER_W / 2)
      // spawn: steps 1 and 2 show the color, step 3 mixes grey cards
      if (now - s.lastSpawn > 1300) {
        s.lastSpawn = now
        const kind = STEPS[step].kind
        const good = kind === 'green' ? Math.random() < 0.75 : kind === 'red' ? Math.random() < 0.3 : Math.random() < 0.5
        const pool = good ? GREEN_FLAGS : RED_FLAGS
        s.cards.push({
          id: s.uid++,
          x: CARD_W / 2 + Math.random() * (1 - CARD_W),
          y: -0.1,
          good,
          grey: kind === 'grey',
          text: pool[Math.floor(Math.random() * pool.length)].short,
          revealed: kind !== 'grey',
        })
      }
      // fall + catch
      s.cards = s.cards.filter((c) => {
        c.y += dt * SPEED
        if (!c.revealed && c.y > PLAYER_Y - 0.12) c.revealed = true
        const hit = c.y > PLAYER_Y - 0.1 && c.y < PLAYER_Y + 0.02 && Math.abs(c.x - s.x) < CARD_W / 2 + PLAYER_W * 0.25
        if (hit) {
          s.msg = c.good ? (c.grey ? 'It was GREEN! 👍' : 'Nice catch! 👍') : c.grey ? 'It was RED! 😱' : 'Ouch! Dodge those 😱'
          s.msgUntil = now + 1100
          s.pose = c.good ? 'cheer' : 'scared'
          s.poseUntil = now + 800
          return false
        }
        return c.y < 1.1
      })
      if (now > s.poseUntil) s.pose = dir ? 'walk' : 'idle'
      setFrame((f) => (f + 1) % 1e6)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [step])

  // keyboard (laptop testing)
  useEffect(() => {
    const k = (v: boolean) => (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') input.current.left = v
      if (e.key === 'ArrowRight') input.current.right = v
    }
    const d = k(true)
    const u = k(false)
    window.addEventListener('keydown', d)
    window.addEventListener('keyup', u)
    return () => {
      window.removeEventListener('keydown', d)
      window.removeEventListener('keyup', u)
    }
  }, [])

  const s = sim.current
  const hold = (key: 'left' | 'right', v: boolean) => (e: RPointerEvent) => {
    e.preventDefault()
    input.current[key] = v
  }

  return (
    <div className="ptut">
      <div className="ptut-head">
        <div className="ptut-dots" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />
          ))}
        </div>
        <div className="ptut-time">{stepLeft}s</div>
      </div>
      <h1 className={`ptut-title k-${cur.kind}`} key={step}>
        {cur.title}
      </h1>
      <div className="ptut-field">
        {s.cards.map((c) => (
          <div
            key={c.id}
            className={`fcard ${c.revealed ? (c.good ? 'green' : 'red') : 'grey'}`}
            style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${CARD_W * 100}%`, height: '12%' }}
          >
            <span className="fcard-text">{c.text}</span>
          </div>
        ))}
        <div className="pchar" style={{ left: `${s.x * 100}%`, top: `${PLAYER_Y * 100}%`, width: `${PLAYER_W * 100}%` }}>
          <Avatar config={avatar} pose={s.pose} facing={s.facing} size={100} />
        </div>
        {s.msgUntil > performance.now() && <div className="ptut-msg">{s.msg}</div>}
        <div className="ptut-note">Practice: no points yet</div>
      </div>
      <div className="controls">
        <button
          className="ctrl-btn"
          onPointerDown={hold('left', true)}
          onPointerUp={hold('left', false)}
          onPointerLeave={hold('left', false)}
          onPointerCancel={hold('left', false)}
          aria-label="Move left"
        >
          ◀
        </button>
        <div />
        <button
          className="ctrl-btn"
          onPointerDown={hold('right', true)}
          onPointerUp={hold('right', false)}
          onPointerLeave={hold('right', false)}
          onPointerCancel={hold('right', false)}
          aria-label="Move right"
        >
          ▶
        </button>
      </div>
    </div>
  )
}
