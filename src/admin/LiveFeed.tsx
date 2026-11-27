import { useEffect, useMemo, useState, type MutableRefObject } from 'react'
import { POWERS } from '../data/cards'
import { buildSchedule } from '../lib/game'
import type { PlayerInfo } from '../lib/types'
import type { FeedItem } from './useAdminGame'

const SHOWN = 5

const VERB: Record<'green' | 'red' | 'soulmate' | 'ick', string> = {
  green: 'caught 💚',
  red: 'caught 🚩',
  soulmate: 'found a soulmate ⭐',
  ick: 'got the ick 🤢',
}

/** The last 5 things that happened, big enough for the class to read the situations. */
export default function LiveFeed({
  feed,
  players,
  seed,
  round,
  gameSeed,
}: {
  feed: MutableRefObject<FeedItem[]>
  players: PlayerInfo[]
  seed: number
  round: number
  gameSeed: number
}) {
  const schedule = useMemo(() => buildSchedule(seed, round, gameSeed), [seed, round, gameSeed])
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [])

  const items = feed.current.filter((f) => f.round === round).slice(-SHOWN).reverse()
  const who = (id?: string) => players.find((p) => p.id === id)
  const name = (id?: string) => {
    const p = who(id)
    return (
      <b className="feed-name" style={{ color: p?.avatar.topColor }}>
        {p?.name ?? '?'}
      </b>
    )
  }

  return (
    <div className="feed">
      <div className="proj-label">Live feed</div>
      {items.length === 0 && <div className="feed-empty">Catch some flags…</div>}
      <ol className="feed-list">
        {items.map((f, i) => {
          let body
          if (f.kind === 'sabotage' || f.kind === 'blocked') {
            const pw = f.power ? POWERS[f.power] : undefined
            body =
              f.kind === 'sabotage' ? (
                <>
                  {name(f.pid)} used <span className="feed-power" style={{ background: pw?.color }}>{pw?.emoji} {pw?.name.toUpperCase()}</span> on {name(f.to)}
                </>
              ) : (
                <>
                  {name(f.to)}&apos;s 🛡️ Therapy blocked {name(f.pid)}
                </>
              )
          } else {
            const text = f.cardId != null ? schedule[f.cardId]?.text : undefined
            body = (
              <>
                {name(f.pid)} {VERB[f.kind]} <span className="feed-text">{text}</span>
              </>
            )
          }
          return (
            <li key={f.key} className={`feed-item k-${f.kind}`} style={{ opacity: 1 - i * 0.16 }}>
              {body}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
