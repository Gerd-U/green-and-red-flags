import { useEffect, useState } from 'react'
import PolyBackground from '../components/PolyBackground'
import Tutorial from '../components/Tutorial'
import { AWARD_SHOW_MS, COUNTDOWN_MS, formatClock, roundConfig, START_HEARTS, TOTAL_ROUNDS } from '../lib/game'
import { makeRoomCode } from '../lib/room'
import LiveGrid from '../admin/LiveGrid'
import { Announcer, AwardsShow, DefenseView, Lobby, Podium, Ranking, RoundResults, SabotageAnim, type RankRow } from '../admin/Panels'
import { clearAdminSnapshot, loadAdminSnapshot, useAdminGame } from '../admin/useAdminGame'

export default function Admin() {
  const [code, setCode] = useState(() => loadAdminSnapshot()?.code ?? makeRoomCode())
  return (
    <AdminRoom
      key={code}
      code={code}
      onNewRoom={() => {
        clearAdminSnapshot()
        setCode(makeRoomCode())
      }}
    />
  )
}

function AdminRoom({ code, onNewRoom }: { code: string; onNewRoom: () => void }) {
  const { g, ticks, catchFx, status, sabotages, announcements, elapsed, actions } = useAdminGame(code)
  const [, setTick] = useState(0)

  // light re-render for timers / ranking
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250)
    return () => clearInterval(id)
  }, [])

  const game = g.current
  const now = performance.now()
  const joinUrl = `${window.location.origin}/play?room=${code}`
  const allPlayers = Object.values(game.players)
  const lobbyPlayers = allPlayers.filter((p) => p.online)
  // players in the game: anyone with a score this game, or online
  const gamePlayers = allPlayers.filter((p) => p.online || game.totals[p.id] != null)
  const rows: RankRow[] = gamePlayers
    .map((p) => ({
      player: p,
      score: (game.totals[p.id] ?? 0) + (game.roundScores[p.id] ?? 0),
      hearts: game.hearts[p.id] ?? START_HEARTS,
      streak: ticks.current[p.id]?.cur?.streak ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
  const scores = Object.fromEntries(rows.map((r) => [r.player.id, r.score]))

  const cfg = roundConfig(game.round)
  const t = elapsed()
  const timeLeft = Math.max(0, Math.ceil((cfg.durationMs - Math.max(0, t)) / 1000))
  const countdown = game.phase === 'playing' && t < 0 ? Math.ceil(-t / 1000) : 0
  const readyCount = lobbyPlayers.filter((p) => p.ready).length
  const inRound = game.phase === 'playing' || game.phase === 'defense'
  const auto = game.auto
  const autoLeft = auto ? (auto.paused ? auto.pausedLeft : Math.max(0, auto.endsAt - now)) : 0
  const activity = Date.now() - game.createdAt

  const confirmNewRoom = () => {
    if (window.confirm('Start a brand new room? Players will need the new code.')) onNewRoom()
  }

  return (
    <div className={`screen admin ${inRound || game.phase === 'roundEnd' ? `theme-${cfg.theme}` : ''}`}>
      <PolyBackground />
      <header className="admin-bar">
        <div className="admin-brand">
          <span className="g">Green</span>&amp;<span className="r">Red</span> Flags
        </div>
        <div className="admin-code">
          Room <b>{code}</b>
          <span className={`dot ${status === 'SUBSCRIBED' ? 'on' : ''}`} title={status} />
        </div>
        <div className="admin-clock" title="Activity time since the room was created">
          ⏱ {formatClock(activity)}
        </div>
        {game.round > 0 && game.phase !== 'podium' && game.phase !== 'awards' && (
          <div className="admin-round">
            Round <b>{game.round}</b> of {TOTAL_ROUNDS} · {cfg.name}
            {inRound && (
              <span className={`admin-timer ${timeLeft <= 10 ? 'urgent' : ''}`}>
                {game.running || game.phase === 'defense' ? '' : '⏸ '}
                {timeLeft}s
              </span>
            )}
          </div>
        )}
        <div className="admin-actions">
          {game.phase === 'lobby' && (
            <button className="btn btn-green" disabled={readyCount === 0} onClick={actions.startGame}>
              Start game ▶
            </button>
          )}
          {game.phase === 'tutorial' && (
            <button className="btn btn-green" onClick={actions.skip}>
              Skip tutorial ⏭
            </button>
          )}
          {game.phase === 'playing' && (
            <>
              <button className="btn btn-ghost" onClick={actions.togglePause}>
                {game.running ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button className="btn btn-ghost small" onClick={actions.endRound}>
                End round
              </button>
            </>
          )}
          {game.phase === 'defense' && (
            <>
              {auto && (
                <button className="btn btn-ghost" onClick={actions.togglePause}>
                  {auto.paused ? '▶ Resume' : '⏸ Hold'}
                </button>
              )}
              <button className="btn btn-green" onClick={actions.skip}>
                {game.defense?.stage === 'talk' ? 'Start vote ⏭' : game.defense?.stage === 'vote' ? 'Close vote ⏭' : 'Continue ▶'}
              </button>
            </>
          )}
          {(game.phase === 'roundEnd' || game.phase === 'awards') && auto && (
            <>
              <button className="btn btn-ghost" onClick={actions.togglePause}>
                {auto.paused ? '▶ Resume timer' : '⏸ Hold timer'}
              </button>
              <button className="btn btn-green" onClick={actions.skip}>
                {auto.label} now ▶
              </button>
            </>
          )}
          {game.phase === 'podium' && (
            <button className="btn btn-green" onClick={actions.backToLobby}>
              Play again
            </button>
          )}
          <button className="btn btn-ghost small" onClick={confirmNewRoom} title="Create a new room code">
            New room
          </button>
        </div>
      </header>

      <main className="admin-main">
        {game.phase === 'lobby' && <Lobby players={lobbyPlayers} code={code} joinUrl={joinUrl} />}

        {game.phase === 'tutorial' && (
          <div className="tutorial-stage">
            <Tutorial secondsLeft={Math.ceil(Math.max(0, game.tutorialEndsAt - now) / 1000)} />
          </div>
        )}

        {inRound && (
          <div className="admin-live">
            <LiveGrid
              players={gamePlayers}
              ticks={ticks}
              catchFx={catchFx}
              scores={scores}
              seed={game.seed}
              round={game.round}
              gameSeed={game.gameSeed}
            />
            <aside className="side-rank">
              <h3>Ranking</h3>
              <Ranking rows={rows} compact={rows.length > 6} />
              <div className="side-join">
                Join: <b>{code}</b>
              </div>
            </aside>
          </div>
        )}

        {game.phase === 'roundEnd' && <RoundResults game={game} rows={rows} autoLeft={autoLeft} paused={Boolean(auto?.paused)} />}

        {game.phase === 'awards' && (
          <AwardsShow
            awards={game.awards ?? []}
            players={game.players}
            shownMs={auto ? Math.max(0, Math.max(1, game.awards?.length ?? 0) * AWARD_SHOW_MS + 1500 - autoLeft) : 0}
          />
        )}

        {game.phase === 'podium' && <Podium rows={rows} stats={game.stats} />}
      </main>

      {countdown > 0 && (
        <div className="overlay countdown-big" key={countdown}>
          <span>{countdown}</span>
          <small>
            Round {game.round} of {TOTAL_ROUNDS}: {cfg.name}
          </small>
          <em>{cfg.tagline}</em>
        </div>
      )}
      {game.phase === 'playing' && !game.running && t >= 0 && t < cfg.durationMs && t > -COUNTDOWN_MS && (
        <div className="overlay paused-big">⏸ Paused</div>
      )}

      {game.phase === 'defense' && (
        <DefenseView game={game} player={game.defense ? game.players[game.defense.playerId] : undefined} autoLeft={autoLeft} />
      )}

      {sabotages[0] && <SabotageAnim ev={sabotages[0]} players={game.players} />}
      {game.phase !== 'defense' && <Announcer items={announcements} />}
    </div>
  )
}
