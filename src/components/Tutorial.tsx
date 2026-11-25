import {
  DEFENSE_TALK_MS,
  GREEN_POINTS,
  HEARTBROKEN_MS,
  MISS_PENALTY,
  RED_PENALTY,
  ROUNDS,
  SOULMATE_POINTS,
  START_HEARTS,
} from '../lib/game'

const ITEMS = [
  { cls: 'green', tag: 'GREEN', text: `Catch it! +${GREEN_POINTS}. Greens in a row build a combo up to x3.` },
  { cls: 'red', tag: 'RED', text: `Dodge it! −${RED_PENALTY} and you lose a heart.` },
  { cls: 'grey', tag: '???', text: 'Grey card: read it! Its color shows only when you catch it.' },
  { cls: 'soulmate', tag: '★', text: `Soulmate: +${SOULMATE_POINTS} and one heart back.` },
  { cls: 'ick', tag: 'ICK', text: 'The Ick: no points, just gross.' },
  { cls: 'power', tag: '⚡', text: 'Power: sabotage someone. 🛡️ Therapy blocks the next sabotage.' },
]

export default function Tutorial({ secondsLeft, compact = false }: { secondsLeft: number; compact?: boolean }) {
  return (
    <div className={`tutorial ${compact ? 'compact' : ''}`}>
      <div className="tut-head">
        <h1>How to play</h1>
        <div className="tut-timer">{secondsLeft}s</div>
      </div>
      <div className="tut-controls">
        <span className="key">◀</span>
        <span className="key">▶</span>
        <span>Hold to move. <b>Double tap</b> or swipe to <b>dash ⚡</b>. Or tilt your phone.</span>
      </div>
      <div className="tut-cards">
        {ITEMS.map((it) => (
          <div key={it.cls} className="tut-item">
            <span className={`tut-card fcard-mini ${it.cls}`}>{it.tag}</span>
            <span>{it.text}</span>
          </div>
        ))}
      </div>
      <ul className="tut-rules">
        <li>
          You have {START_HEARTS} ♥. At 0 you are heartbroken for {HEARTBROKEN_MS / 1000}s, then you come back.
        </li>
        <li>Letting a green flag fall costs {MISS_PENALTY} points.</li>
        <li>
          First red flag after 10s: <b>defend yourself in English</b> ({DEFENSE_TALK_MS / 1000}s), then everyone votes.
        </li>
        <li>
          {ROUNDS.length} rounds: {ROUNDS.map((r) => r.name).join(' → ')}. It gets harder!
        </li>
      </ul>
    </div>
  )
}
