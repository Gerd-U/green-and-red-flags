import type { ReactNode } from 'react'
import Avatar from '../components/Avatar'
import { POWERS } from '../data/cards'
import { AWARD_SHOW_MS, DEFENSE_TALK_MS, DEFENSE_VOTE_MS, formatClock, roundConfig, TOTAL_ROUNDS, WAITING_HOST } from '../lib/game'
import type { Award, PlayerInfo, PodiumStats, RoundSummary, SabotageEvent } from '../lib/types'
import type { AdminGame, Announcement } from './useAdminGame'

export interface RankRow {
  player: PlayerInfo
  score: number
  hearts: number
  streak: number
}

export function Ranking({ rows, compact = false, dense = false }: { rows: RankRow[]; compact?: boolean; dense?: boolean }) {
  // row height follows the screen height (same look at 720p and 1080p); dense = during the round, next to the live feed
  const ROW_H = Math.round(dense ? Math.max(32, window.innerHeight * 0.042) : Math.max(compact ? 52 : 64, window.innerHeight * (compact ? 0.072 : 0.09)))
  return (
    <div className={`ranking ${compact ? 'compact' : ''} ${dense ? 'dense' : ''}`} style={{ height: rows.length * ROW_H }}>
      {rows.map((r, i) => (
        <div
          key={r.player.id}
          className={`rank-row ${i === 0 ? 'first' : ''}`}
          style={{ transform: `translateY(${i * ROW_H}px)`, height: ROW_H - 8, ['--pc' as string]: r.player.avatar.topColor }}
        >
          <span className="rank-pos">{i + 1}</span>
          <Avatar config={r.player.avatar} size={dense ? 26 : compact ? 34 : 44} crop="head" animate={false} />
          <span className="rank-name">
            {r.player.name}
            {r.player.bot && <span className="bot-tag">BOT</span>}
            {!dense && <span className="rank-hearts">{'♥'.repeat(Math.max(0, r.hearts))}</span>}
          </span>
          {r.streak >= 2 && <span className="rank-combo">🔥{r.streak}</span>}
          <span className="rank-score">{Math.round(r.score)}</span>
        </div>
      ))}
    </div>
  )
}

export function Lobby({ players, code, joinUrl, qr, countdown }: { players: PlayerInfo[]; code: string; joinUrl: string; qr: ReactNode; countdown: number | null }) {
  const ready = players.filter((p) => p.ready).length
  return (
    <div className="lobby">
      <div className="join-card">
        <div className="proj-label">Scan or go to</div>
        {qr}
        <div className="join-url">{joinUrl}</div>
        <div className="join-code">{code}</div>
        <div className="join-count">{players.length === 0 ? 'Waiting for players…' : `${ready} of ${players.length} ready`}</div>
        {countdown !== null && (
          <div className={`lobby-countdown ${countdown <= 10_000 ? 'soon' : ''}`}>
            <span>{countdown > 0 ? 'Starting soon' : 'Starting now!'}</span>
            {countdown > 0 && <b>{formatClock(countdown + 999)}</b>}
          </div>
        )}
      </div>
      <div className={`lobby-players n-${Math.min(players.length, 8)}`}>
        {players.map((p) => (
          <div key={p.id} className={`lobby-player ${p.ready ? 'ready' : ''}`}>
            <div className="lp-top">{p.bot ? <span className="bot-tag">BOT</span> : '♥ Dating profile'}</div>
            <div className="lp-avatar">
              <Avatar config={p.avatar} size={110} pose={p.ready ? 'dance' : 'idle'} />
            </div>
            <div className="lp-name">{p.name}</div>
            <div className="lp-bio">“{p.bio}”</div>
            <div className="lp-status">{p.ready ? '✔ Ready' : 'Building…'}</div>
          </div>
        ))}
        {players.length === 0 && (
          <div className="lobby-empty">Scan the code, build your character, pick your dating profile line and press Ready.</div>
        )}
      </div>
    </div>
  )
}

export function DefenseView({ game, player, autoLeft }: { game: AdminGame; player: PlayerInfo | undefined; autoLeft: number }) {
  const d = game.defense
  if (!d) return null
  const left = Math.max(0, d.stageEndsAt - performance.now())
  const total = d.stage === 'talk' ? DEFENSE_TALK_MS : DEFENSE_VOTE_MS
  const ok = d.result === 'convinced'
  return (
    <div className="overlay defense-big">
      <div className="defense-grid">
        <div className="defense-avatar">
          <Avatar config={player?.avatar} size={300} pose={d.stage === 'result' ? (ok ? 'cheer' : 'cry') : 'scared'} />
        </div>
        <div className="defense-info">
          <div className="chip red big">Red flag! Round {game.round}</div>
          <h1 className="defense-name">{d.name}</h1>
          <div className="defense-card">
            <span className="fcard-mini red">RED</span> {d.text}
          </div>
          {d.stage === 'talk' && (
            <>
              <h2 className="defend-shout">Defend yourself!</h2>
              <div className="starter-big">
                Try: <b>“{d.starter}”</b>
              </div>
            </>
          )}
          {d.stage === 'vote' && (
            <>
              <h2 className="defend-shout">Vote on your phones!</h2>
              <p className="vote-count">
                {Object.keys(d.votes).length} / {d.votesNeeded} votes
              </p>
            </>
          )}
          {d.stage !== 'result' && (
            <div className="timer">
              <div className="timer-num">{left > 0 ? Math.ceil(left / 1000) : '⏳'}</div>
              <div className="timer-bar">
                <div style={{ width: `${(left / total) * 100}%` }} />
              </div>
              {left <= 0 && <div className="waiting-host">{WAITING_HOST}</div>}
            </div>
          )}
          {d.stage === 'result' && (
            <>
              <h2 className={`defend-shout ${ok ? 'ok' : 'bad'}`}>{ok ? 'Convinced! 👍' : 'Not convinced! 👎'}</h2>
              <p className="vote-count">
                👍 {d.convinced} · 👎 {d.notConvinced} —{' '}
                {ok ? `${d.name} gets the heart and points back` : `${d.name} loses 100 extra points`}
              </p>
              <p className="auto-big">{autoLeft > 0 ? `Back to the game in ${Math.ceil(autoLeft / 1000)}…` : WAITING_HOST}</p>
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
          <Avatar config={from?.avatar} size={120} pose="cheer" />
        </div>
        <div className="sab-bolt">{p.emoji}</div>
        <div className="sab-to">
          <Avatar config={to?.avatar} size={120} pose="scared" effect={ev.power} />
        </div>
      </div>
      <div className="sab-text">
        <b>{from?.name ?? '???'}</b> used <span className="sab-power">{p.name.toUpperCase()}</span> on <b>{to?.name ?? '???'}</b>!
      </div>
    </div>
  )
}

export function Announcer({ items }: { items: Announcement[] }) {
  const a = items[0]
  if (!a) return null
  return (
    <div className="announcer" key={a.key} style={{ ['--ac' as string]: a.color }}>
      <div className="ann-text">{a.text}</div>
      {a.sub && <div className="ann-sub">{a.sub}</div>}
    </div>
  )
}

export function RoundResults({ game, rows, autoLeft, paused }: { game: AdminGame; rows: RankRow[]; autoLeft: number; paused: boolean }) {
  const sum: RoundSummary | undefined = game.summary
  const cfg = roundConfig(game.round)
  const last = game.round >= TOTAL_ROUNDS
  return (
    <div className="round-end">
      <div className="re-left">
        <h1 className="round-end-title">
          Round {game.round}: {cfg.name}
        </h1>
        <Ranking rows={rows} compact={rows.length > 6} />
      </div>
      <div className="re-right">
        <div className="label light">Red flag of the round</div>
        <div className="re-card">{sum?.topRed ? `“${sum.topRed.text}”` : 'Nobody caught a red flag! 😇'}</div>
        {sum?.topRed && (
          <div className="re-sub">
            caught by {sum.topRed.count} {sum.topRed.count === 1 ? 'person' : 'people'}
          </div>
        )}
        <div className="re-timer next">
          {paused ? '⏸ ' : ''}
          {autoLeft > 0 ? `${last ? 'Awards' : 'Next'} in ${Math.ceil(autoLeft / 1000)}` : WAITING_HOST}
        </div>
      </div>
    </div>
  )
}

export function AwardsShow({ awards, players, shownMs }: { awards: Award[]; players: Record<string, PlayerInfo>; shownMs: number }) {
  if (!awards.length) {
    return (
      <div className="awards-wrap">
        <h1 className="podium-title">No awards this time!</h1>
      </div>
    )
  }
  const idx = Math.min(awards.length - 1, Math.floor(shownMs / AWARD_SHOW_MS))
  const a = awards[idx]
  const p = players[a.playerId]
  return (
    <div className="awards-wrap">
      <div className="awards-dots">
        {awards.map((aw, i) => (
          <span key={aw.id} className={i <= idx ? 'on' : ''}>
            {aw.emoji}
          </span>
        ))}
      </div>
      <div className="award" key={a.id}>
        <div className="award-emoji">{a.emoji}</div>
        <div className="award-title">{a.title}</div>
        <div className="award-avatar">
          <Avatar config={p?.avatar} size={220} pose={a.id === 'victim' || a.id === 'toxic' ? 'cry' : 'dance'} />
        </div>
        <div className="award-name">{p?.name ?? '???'}</div>
        <div className="award-desc">{a.desc}</div>
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
                <Avatar config={r.player.avatar} size={places[i] === 1 ? 200 : 150} pose={places[i] === 1 ? 'dance' : 'cheer'} />
              </div>
              <div className="podium-name">{r.player.name}</div>
              <div className="podium-score">{Math.round(r.score)} pts</div>
              <div className="podium-block" style={{ height: `${heights[i] * 0.26}vh` }}>
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
          {stats?.topRed && (
            <div className="stat-sub">
              caught by {stats.topRed.count} {stats.topRed.count === 1 ? 'person' : 'people'}
            </div>
          )}
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
