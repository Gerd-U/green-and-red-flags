import Avatar from '../components/Avatar'
import { POWERS } from '../data/cards'
import { DEFENSE_MS } from '../lib/game'
import type { PlayerInfo, PodiumStats, SabotageEvent } from '../lib/types'
import type { AdminGame } from './useAdminGame'

export interface RankRow {
  player: PlayerInfo
  score: number
  lives: number
}

export function Ranking({ rows, compact = false }: { rows: RankRow[]; compact?: boolean }) {
  const ROW_H = compact ? 64 : 84
  return (
    <div className={`ranking ${compact ? 'compact' : ''}`} style={{ height: rows.length * ROW_H }}>
      {rows.map((r, i) => (
        <div
          key={r.player.id}
          className={`rank-row ${i === 0 ? 'first' : ''} ${r.lives <= 0 ? 'out' : ''}`}
          style={{ transform: `translateY(${i * ROW_H}px)`, height: ROW_H - 8, ['--pc' as string]: r.player.avatar.color1 }}
        >
          <span className="rank-pos">{i + 1}</span>
          <Avatar config={r.player.avatar} size={compact ? 38 : 50} animate={false} dim={r.lives <= 0} />
          <span className="rank-name">{r.player.name}</span>
          <span className="rank-lives">{'◆'.repeat(Math.max(0, r.lives))}</span>
          <span className="rank-score">{r.score}</span>
        </div>
      ))}
    </div>
  )
}

export function Lobby({ players, code, joinUrl }: { players: PlayerInfo[]; code: string; joinUrl: string }) {
  return (
    <div className="lobby">
      <div className="lobby-join">
        <div className="label light">Join at</div>
        <div className="join-url">{joinUrl.replace(/^https?:\/\//, '')}</div>
        <div className="label light">Room code</div>
        <div className="room-code">
          {code.split('').map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
        <p className="lobby-hint">
          {players.length === 0
            ? 'Waiting for players...'
            : `${players.filter((p) => p.ready).length} of ${players.length} ready`}
        </p>
      </div>
      <div className="lobby-players">
        {players.map((p) => (
          <div key={p.id} className={`lobby-player ${p.ready ? 'ready' : ''}`}>
            <div className="lp-avatar">
              <Avatar config={p.avatar} size={120} />
            </div>
            <div className="lp-name">{p.name}</div>
            <div className="lp-status">{p.ready ? '✔ Ready' : 'Building…'}</div>
          </div>
        ))}
        {players.length === 0 && (
          <div className="lobby-empty">
            Scan the URL, type the code, build your character and press <b>Ready</b>.
          </div>
        )}
      </div>
    </div>
  )
}

export function DefenseView({
  game,
  player,
  onSkip,
  onCloseVote,
  onContinue,
}: {
  game: AdminGame
  player: PlayerInfo | undefined
  onSkip: () => void
  onCloseVote: () => void
  onContinue: () => void
}) {
  const d = game.defense
  if (!d) return null
  const left = Math.max(0, Math.ceil((d.talkEndsAt - performance.now()) / 1000))
  const pct = Math.max(0, Math.min(1, (d.talkEndsAt - performance.now()) / DEFENSE_MS))
  const ok = d.result === 'convinced'
  return (
    <div className="overlay defense-big">
      <div className="defense-grid">
        <div className="defense-avatar">
          <Avatar
            config={player?.avatar}
            size={300}
            mood={d.stage === 'result' ? (ok ? 'happy' : 'horror') : 'horror'}
          />
        </div>
        <div className="defense-info">
          <div className="chip red big">
            {d.context === 'first' ? 'First red flag of the round!' : 'Random red flag from this round'}
          </div>
          <h1 className="defense-name">{d.name}</h1>
          <div className="defense-card">
            <span className="flag-icon">🟥</span> {d.text}
          </div>
          {d.stage === 'talk' && (
            <>
              <h2 className="defend-shout">Defend yourself!</h2>
              <div className="timer">
                <div className="timer-num">{left}</div>
                <div className="timer-bar">
                  <div style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
              <button className="btn btn-ghost" onClick={onSkip}>
                Skip to vote ⏭
              </button>
            </>
          )}
          {d.stage === 'vote' && (
            <>
              <h2 className="defend-shout">Vote on your phones!</h2>
              <p className="vote-count">
                {Object.keys(d.votes).length} / {d.votesNeeded} votes
              </p>
              <button className="btn btn-ghost" onClick={onCloseVote}>
                Close vote
              </button>
            </>
          )}
          {d.stage === 'result' && (
            <>
              <h2 className={`defend-shout ${ok ? 'ok' : 'bad'}`}>{ok ? 'Convinced! 👍' : 'Not convinced! 👎'}</h2>
              <p className="vote-count">
                👍 {d.convinced} · 👎 {d.notConvinced} — {ok ? `${d.name} keeps the points` : `${d.name} loses a life 💔`}
              </p>
              <button className="btn btn-green btn-big" onClick={onContinue}>
                {d.context === 'first' ? 'Continue the round ▶' : 'Show results ▶'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function SabotageAnim({ ev, players }: { ev: SabotageEvent; players: Record<string, PlayerInfo> }) {
  const from = players[ev.from]
  const to = players[ev.to]
  const p = POWERS[ev.power]
  return (
    <div className="sabotage-anim" key={ev.key} style={{ ['--pw' as string]: p.color }}>
      <div className="sab-row">
        <div className="sab-from">
          <Avatar config={from?.avatar} size={130} mood="happy" />
        </div>
        <div className="sab-bolt">{p.emoji}</div>
        <div className="sab-to">
          <Avatar config={to?.avatar} size={130} mood="horror" effect={ev.power} />
        </div>
      </div>
      <div className="sab-text">
        <b>{from?.name ?? '???'}</b> used <span className="sab-power">{p.name.toUpperCase()}</span> on <b>{to?.name ?? '???'}</b>!
      </div>
    </div>
  )
}

export function Podium({ rows, stats }: { rows: RankRow[]; stats?: PodiumStats }) {
  const top = rows.slice(0, 3)
  const order = [top[1], top[0], top[2]]
  const heights = [62, 82, 46]
  const places = [2, 1, 3]
  return (
    <div className="podium-wrap">
      <h1 className="podium-title">Final podium</h1>
      <div className="podium">
        {order.map((r, i) =>
          r ? (
            <div key={r.player.id} className={`podium-col place-${places[i]}`}>
              <div className={places[i] === 1 ? 'winner-avatar' : 'podium-avatar'}>
                {places[i] === 1 && <div className="confetti" aria-hidden="true" />}
                <Avatar config={r.player.avatar} size={places[i] === 1 ? 200 : 150} mood={places[i] === 1 ? 'happy' : undefined} />
              </div>
              <div className="podium-name">{r.player.name}</div>
              <div className="podium-score">{r.score} pts</div>
              <div className="podium-block" style={{ height: `${heights[i] * 0.42}vh` }}>
                <span>{places[i]}</span>
              </div>
            </div>
          ) : (
            <div key={i} className="podium-col empty" />
          )
        )}
      </div>
      <div className="podium-stats">
        <div className="stat red">
          <div className="stat-label">Most caught red flag</div>
          <div className="stat-text">{stats?.topRed ? `“${stats.topRed.text}”` : '—'}</div>
          {stats?.topRed && <div className="stat-sub">caught by {stats.topRed.count} {stats.topRed.count === 1 ? 'person' : 'people'}</div>}
        </div>
        <div className="stat green">
          <div className="stat-label">Most ignored green flag</div>
          <div className="stat-text">{stats?.topMissedGreen ? `“${stats.topMissedGreen.text}”` : '—'}</div>
          {stats?.topMissedGreen && (
            <div className="stat-sub">
              missed by {stats.topMissedGreen.count} {stats.topMissedGreen.count === 1 ? 'person' : 'people'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
