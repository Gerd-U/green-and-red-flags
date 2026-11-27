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
  { cls: 'green', tag: 'GREEN', text: `Catch it! +${GREEN_POINTS}. Catch many in a row for x2, x3.` },
  { cls: 'red', tag: 'RED', text: `Move away! −${RED_PENALTY} and you lose a heart.` },
  { cls: 'grey', tag: '???', text: 'Grey: read it first! You see the color at the end.' },
  { cls: 'soulmate', tag: '★', text: `Soulmate: +${SOULMATE_POINTS} and 1 heart back.` },
  { cls: 'ick', tag: 'ICK', text: 'The Ick: 0 points. Yuck!' },
  { cls: 'power', tag: '⚡', text: 'Power: attack another player. 🛡️ Therapy keeps you safe.' },
]

export default function Tutorial({ secondsLeft, compact = false }: { secondsLeft: number; compact?: boolean }) {
  return (
    <div className={`tutorial ${compact ? 'compact' : ''}`}>
      <div className="tut-head">
        <h1>How to play</h1>
        <div className="tut-timer">{secondsLeft > 0 ? `${secondsLeft}s` : '⏳'}</div>
      </div>
      <div className="tut-controls">
        <span className="key">◀</span>
        <span className="key">▶</span>
        <span>Hold ◀ ▶ to move. Tap <b>⚡ Dash</b> to go fast.</span>
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
          You have {START_HEARTS} ♥. At 0 ♥ you wait {HEARTBROKEN_MS / 1000} seconds, then you play again.
        </li>
        <li>A green card you don&apos;t catch: −{MISS_PENALTY} points.</li>
        <li>
          Catch a red flag? You may need to <b>explain it in English</b> ({DEFENSE_TALK_MS / 1000}s). Then everyone votes.
        </li>
        <li>
          {ROUNDS.length} rounds: {ROUNDS.map((r) => r.name).join(' → ')}. Each round is harder!
        </li>
      </ul>
    </div>
  )
}
