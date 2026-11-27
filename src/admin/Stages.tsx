import type { ReactNode } from 'react'
import Avatar from '../components/Avatar'
import { HOTTAKE_SPEAKER_MS, HOTTAKE_VOTE_MS } from '../lib/game'
import type { AvatarConfig, FinalStats, HotTake, PlayerInfo } from '../lib/types'

const EX_A: AvatarConfig = { skin: '#f5c19c', hair: 'long', hairColor: '#6b3e22', eyes: 'hearts', mouth: 'smile', top: 'dress', topColor: '#22c55e', bottom: 'skirt', bottomColor: '#22c55e', shoes: 'heels', accessory: 'flower' }
const EX_B: AvatarConfig = { skin: '#8d5a36', hair: 'mohawk', hairColor: '#ff3b5c', eyes: 'angry', mouth: 'teeth', top: 'jacket', topColor: '#2d2a3a', bottom: 'ripped', bottomColor: '#3f6fb5', shoes: 'boots', accessory: 'sunglasses' }

/** "Red flags vs Green flags" title screen while people arrive (QR big in the middle). */
export function IntroScreen({ code, joinUrl, players, qr }: { code: string; joinUrl: string; players: number; qr: ReactNode }) {
  return (
    <div className="intro">
      <div className="intro-side red">
        <div className="intro-word">RED FLAGS</div>
        <div className="intro-avatar">
          <Avatar config={EX_B} size={200} pose="scared" />
        </div>
        <div className="intro-examples">
          <span>Checks your phone</span>
          <span>Silent treatment</span>
        </div>
      </div>
      <div className="intro-mid">
        <div className="intro-vs">VS</div>
        <div className="join-card">
          {qr}
          <div className="join-code">{code}</div>
          <div className="join-url">{joinUrl}</div>
          {players > 0 && <div className="join-count">{players} connected</div>}
        </div>
      </div>
      <div className="intro-side green">
        <div className="intro-word">GREEN FLAGS</div>
        <div className="intro-avatar">
          <Avatar config={EX_A} size={200} pose="dance" />
        </div>
        <div className="intro-examples">
          <span>Remembers your order</span>
          <span>Respects your "no"</span>
        </div>
      </div>
    </div>
  )
}

export function HotTakeView({ h, players, left }: { h: HotTake; players: Record<string, PlayerInfo>; left: number }) {
  const speaker = h.speaker ? players[h.speaker] : undefined
  const red = (h.red ?? []).map((id) => players[id]).filter(Boolean)
  const green = (h.green ?? []).map((id) => players[id]).filter(Boolean)
  return (
    <div className={`hottake stage-${h.stage}`}>
      <div className="ht-label">🔥 HOT TAKE</div>
      <div className="ht-text">“{h.text}”</div>

      {h.stage === 'vote' && (
        <div className="ht-vote">
          <div className="ht-q">Red flag or green flag? Vote in secret on your phone!</div>
          <div className="timer">
            <div className="timer-num">{left > 0 ? Math.ceil(left / 1000) : '⏳'}</div>
            <div className="timer-bar">
              <div style={{ width: `${(left / HOTTAKE_VOTE_MS) * 100}%` }} />
            </div>
          </div>
          <div className="vote-count">
            {h.votesIn} / {h.votesNeeded} votes
          </div>
        </div>
      )}

      {(h.stage === 'reveal' || h.stage === 'verdict') && (
        <div className="ht-result">
          {(
            [
              ['red', red, h.pctRed ?? 0],
              ['green', green, 100 - (h.pctRed ?? 0)],
            ] as const
          ).map(([side, list, pct]) => (
            <div key={side} className={`ht-col ${side}`}>
              <div className="ht-pct">{pct}%</div>
              <div className="ht-side-name">{side === 'red' ? 'RED FLAG' : 'GREEN FLAG'}</div>
              <div className="ht-people" hidden={h.stage === 'verdict'}>
                {list.map((p) => (
                  <div key={p.id} className="ht-person">
                    <Avatar config={p.avatar} size={70} pose={side === 'red' ? 'scared' : 'cheer'} />
                    <span>{p.name}</span>
                  </div>
                ))}
                {!list.length && <div className="muted">nobody</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {h.stage === 'speaker' && speaker && (
        <div className="ht-speaker">
          <Avatar config={speaker.avatar} size={240} pose="dance" />
          <div>
            <div className="ht-turn">Your turn, {speaker.name}!</div>
            <div className="ht-turn-sub">
              You voted {(h.red ?? []).includes(speaker.id) ? 'RED' : 'GREEN'}. Why?
            </div>
            <div className="timer">
              <div className="timer-num">{left > 0 ? Math.ceil(left / 1000) : '⏳'}</div>
              <div className="timer-bar">
                <div style={{ width: `${(left / HOTTAKE_SPEAKER_MS) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {h.stage === 'verdict' && (
        <div className="ht-verdict">
          <span className="gavel">⚖️</span> HOST&apos;S VERDICT <span className="gavel">👑</span>
        </div>
      )}
    </div>
  )
}

export function ObjectionOverlay({ k }: { k: number }) {
  if (!k) return null
  return (
    <div className="objection" key={k}>
      <div className="objection-text">OBJECTION!</div>
      <div className="objection-sub">+10 seconds</div>
    </div>
  )
}

export function FinalThoughts({ stats, players }: { stats?: FinalStats; players: Record<string, PlayerInfo> }) {
  const toxic = stats?.mostToxic ? players[stats.mostToxic.playerId] : undefined
  return (
    <div className="final">
      <h1 className="final-title">Final thoughts</h1>
      <div className="final-grid">
        <div className="final-card red">
          <div className="stat-label">Most caught red flag</div>
          <div className="final-text">{stats?.topRed ? `“${stats.topRed.text}”` : '—'}</div>
          {stats?.topRed && <div className="stat-sub">caught by {stats.topRed.count}</div>}
        </div>
        <div className="final-card green">
          <div className="stat-label">Most ignored green flag</div>
          <div className="final-text">{stats?.topMissedGreen ? `“${stats.topMissedGreen.text}”` : '—'}</div>
          {stats?.topMissedGreen && <div className="stat-sub">missed by {stats.topMissedGreen.count}</div>}
        </div>
        <div className="final-card hot">
          <div className="stat-label">Most divided Hot Take</div>
          <div className="final-text">{stats?.mostDivided ? `“${stats.mostDivided.text}”` : '—'}</div>
          {stats?.mostDivided && (
            <div className="stat-sub">
              {stats.mostDivided.pctRed}% red · {100 - stats.mostDivided.pctRed}% green
            </div>
          )}
        </div>
        <div className="final-card toxic">
          <div className="stat-label">Most toxic player</div>
          {toxic ? (
            <div className="final-toxic">
              <Avatar config={toxic.avatar} size={90} pose="cry" />
              <div>
                <div className="final-text">{toxic.name}</div>
                <div className="stat-sub">{stats?.mostToxic?.count} red flags caught</div>
              </div>
            </div>
          ) : (
            <div className="final-text">—</div>
          )}
        </div>
      </div>
      <div className="final-q">What is ONE green flag you want in your next relationship?</div>
    </div>
  )
}
