import { useEffect, useMemo, useRef, useState } from 'react'
import type { HostInfo } from '../lib/types'
import { buildScript, orderQuestions, type ScriptQuestion } from './script'

/**
 * Teleprompter for the host: what to say in the current phase and a
 * question to ask, built from what really happened in the game.
 * It follows the game phase by itself; arrows / Shuffle change the question.
 */
export default function HostScript({ info, onQuestion }: { info: HostInfo; onQuestion?: (q?: string) => void }) {
  const view = useMemo(() => buildScript(info), [info])
  const lastShown = useRef<{ text?: string; player?: string }>({})
  const [order, setOrder] = useState<ScriptQuestion[]>(() => orderQuestions(view.questions))
  const [idx, setIdx] = useState(0)
  const sig = view.key + '|' + view.questions.map((q) => q.text).join('|')
  const prevKey = useRef(view.key)

  // new phase (or new data): rebuild the order, never repeating the last question/player
  useEffect(() => {
    const phaseChanged = prevKey.current !== view.key
    prevKey.current = view.key
    const current = order[idx]?.text
    const next = orderQuestions(view.questions, lastShown.current.text, lastShown.current.player)
    if (!phaseChanged && current) {
      // same phase: keep the question on screen if it still exists
      const keep = next.findIndex((q) => q.text === current)
      if (keep > 0) next.unshift(...next.splice(keep, 1))
    }
    setOrder(next)
    setIdx(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  const q = order[idx]
  useEffect(() => {
    if (q) lastShown.current = { text: q.text, player: q.player }
    onQuestion?.(q?.text)
  }, [q, onQuestion])

  const move = (d: number) => {
    if (order.length < 2) return
    setIdx((i) => (i + d + order.length) % order.length)
  }
  const shuffle = () => {
    if (order.length < 2) return
    // prefer a question about somebody else
    const cands = order.map((_, i) => i).filter((i) => i !== idx && (!q?.player || order[i].player !== q.player))
    const pool = cands.length ? cands : order.map((_, i) => i).filter((i) => i !== idx)
    setIdx(pool[Math.floor(Math.random() * pool.length)])
  }

  return (
    <section className="host-script" aria-live="polite">
      <div className="hs-title">{view.title}</div>
      {view.lines.length > 0 && (
        <div className="hs-say">
          <div className="hs-label">Say</div>
          {view.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      )}
      {view.facts.length > 0 && (
        <div className="hs-facts">
          <div className="hs-label">Fun facts</div>
          {view.facts.map((f, i) => (
            <p key={i}>⭐ {f}</p>
          ))}
        </div>
      )}
      {q && (
        <div className={`hs-ask ${q.real ? 'real' : ''}`}>
          <div className="hs-label">
            Ask {q.real ? '· from the game' : '· general'}
            <span className="hs-count">
              {idx + 1}/{order.length}
            </span>
          </div>
          <p className="hs-question">{q.text}</p>
          <div className="hs-nav">
            <button className="btn btn-ghost" onClick={() => move(-1)} aria-label="Previous question">
              ◀
            </button>
            <button className="btn btn-ghost" onClick={shuffle}>
              🔀 Shuffle
            </button>
            <button className="btn btn-ghost" onClick={() => move(1)} aria-label="Next question">
              ▶
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
