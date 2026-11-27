import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { HostInfo } from '../lib/types'
import { buildScript, orderQuestions, type ScriptQuestion } from './script'

/** Questions shown as ASK steps after the SAY steps of a phase. */
const MAX_ASK = 2

interface Step {
  kind: 'say' | 'ask'
  text: string
  player?: string
}

/** "Ana, you caught ..." with the person's name highlighted. */
function withName(text: string, name?: string): ReactNode {
  if (!name) return text
  const parts = text.split(name)
  return parts.map((p, i) => (
    <span key={i}>
      {p}
      {i < parts.length - 1 && <mark className="hs-name">{name}</mark>}
    </span>
  ))
}

/**
 * The host's script, one step at a time: first what to SAY, then the
 * questions to ASK (with real names and cards from the game).
 * "Next line" only moves the script; it never moves the game.
 * A new phase starts again at step 1.
 */
export default function HostScript({ info, onQuestion }: { info: HostInfo; onQuestion?: (q?: string) => void }) {
  const view = useMemo(() => buildScript(info), [info])
  const lastShown = useRef<{ text?: string; player?: string }>({})
  const [order, setOrder] = useState<ScriptQuestion[]>(() => orderQuestions(view.questions))
  const [step, setStep] = useState(0)
  const sig = view.key + '|' + view.questions.map((q) => q.text).join('|')
  const prevKey = useRef(view.key)

  // new phase: back to step 1 with fresh questions; same phase with new data: keep the step
  useEffect(() => {
    const phaseChanged = prevKey.current !== view.key
    prevKey.current = view.key
    setOrder(orderQuestions(view.questions, lastShown.current.text, lastShown.current.player))
    if (phaseChanged) setStep(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  const steps: Step[] = [
    ...view.lines.map((text) => ({ kind: 'say' as const, text })),
    ...view.facts.map((text) => ({ kind: 'say' as const, text: `⭐ ${text}` })),
    ...order.slice(0, MAX_ASK).map((q) => ({ kind: 'ask' as const, text: q.text, player: q.player })),
  ]
  const i = Math.min(step, Math.max(0, steps.length - 1))
  const cur = steps[i]

  // the cue banner shows the question of the phase
  const firstAsk = steps.find((s) => s.kind === 'ask')?.text
  useEffect(() => {
    onQuestion?.(firstAsk)
  }, [firstAsk, onQuestion])
  useEffect(() => {
    if (cur?.kind === 'ask') lastShown.current = { text: cur.text, player: cur.player }
  }, [cur?.kind, cur?.text, cur?.player])

  /** swap this question for another one (prefer a different person) */
  const other = () => {
    const shown = new Set(steps.filter((s) => s.kind === 'ask').map((s) => s.text))
    const pool = order.filter((q) => !shown.has(q.text))
    if (!pool.length || !cur) return
    const pick = pool.find((q) => q.player !== cur.player) ?? pool[0]
    const at = order.findIndex((q) => q.text === cur.text)
    if (at < 0) return
    const next = [...order]
    const from = next.findIndex((q) => q.text === pick.text)
    ;[next[at], next[from]] = [next[from], next[at]]
    setOrder(next)
  }

  if (!cur) return <section className="host-script hs-steps" />
  return (
    <section className="host-script hs-steps" aria-live="polite">
      <div className="hs-title">{view.title}</div>
      <div className={`hs-step hs-${cur.kind}`} key={`${view.key}-${i}`}>
        <span className={`hs-tag ${cur.kind}`}>{cur.kind === 'say' ? 'SAY' : 'ASK'}</span>
        <p className="hs-text">{cur.kind === 'ask' ? withName(cur.text, cur.player) : cur.text}</p>
      </div>
      <div className="hs-foot">
        <button className="btn btn-ghost hs-back" onClick={() => setStep(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous line">
          ◀
        </button>
        <span className="hs-count">
          Step {i + 1} of {steps.length}
        </span>
        {cur.kind === 'ask' && order.length > MAX_ASK && (
          <button className="btn btn-ghost hs-other" onClick={other}>
            🔀 Other
          </button>
        )}
      </div>
      <button className="btn hs-nextline" onClick={() => setStep(i + 1)} disabled={i >= steps.length - 1}>
        {i >= steps.length - 1 ? 'End of script' : 'Next line ↓'}
      </button>
    </section>
  )
}
