import { useEffect, useState } from 'react'
import PolyBackground from '../components/PolyBackground'
import { COUNTDOWN_MS, ROUND_MS, START_LIVES } from '../lib/game'
import { makeRoomCode } from '../lib/room'
import LiveGrid from '../admin/LiveGrid'
import { DefenseView, Lobby, Podium, Ranking, SabotageAnim, type RankRow } from '../admin/Panels'
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
  const { g, ticks, status, sabotages, elapsed, actions } = useAdminGame(code)
  const [, setTick] = useState(0)

  // light re-render for timers / ranking
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250)
    return () => clearInterval(id)
  }, [])

  const game = g.current
  const joinUrl = `${window.location.origin}/play?room=${code}`
  const allPlayers = Object.values(game.players)
  const lobbyPlayers = allPlayers.filter((p) => p.online)
  // players in the game: anyone with a score this game, or online
  const gamePlayers = allPlayers.filter((p) => p.online || game.totals[p.id] != null)
  const rows: RankRow[] = gamePlayers
    .map((p) => ({
      player: p,
      score: (game.totals[p.id] ?? 0) + (game.roundScores[p.id] ?? 0),
      lives: game.lives[p.id] ?? START_LIVES,
    }))
    .sort((a, b) => b.score - a.score)
  const scores = Object.fromEntries(rows.map((r) => [r.player.id, r.score]))

  const t = elapsed()
  const timeLeft = Math.max(0, Math.ceil((ROUND_MS - Math.max(0, t)) / 1000))
  const countdown = game.phase === 'playing' && t < 0 ? Math.ceil(-t / 1000) : 0
  const readyCount = lobbyPlayers.filter((p) => p.ready).length
  const inRound = game.phase === 'playing' || game.phase === 'defense'

  const confirmNewRoom = () => {
    if (window.confirm('Start a brand new room? Players will need the new code.')) onNewRoom()
  }

  return (
    <div className="screen admin">
      <PolyBackground />
      <header className="admin-bar">
        <div className="admin-brand">
          <span className="g">Green</span>&amp;<span className="r">Red</span> Flags
        </div>
        <div className="admin-code">
          Room <b>{code}</b>
          <span className={`dot ${status === 'SUBSCRIBED' ? 'on' : ''}`} title={status} />
        </div>
        {game.round > 0 && game.phase !== 'podium' && (
          <div className="admin-round">
            Round <b>{game.round}</b>
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
            <button className="btn btn-green" disabled={readyCount === 0} onClick={actions.startRound}>
              Start round 1 ▶
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
          {game.phase === 'roundEnd' && (
            <>
              <button className="btn btn-green" onClick={actions.startRound}>
                Next round ▶
              </button>
              <button className="btn btn-red" onClick={actions.showPodium}>
                🏆 Final podium
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

        {(game.phase === 'playing' || game.phase === 'defense') && (
          <div className="admin-live">
            <LiveGrid players={gamePlayers} ticks={ticks} lives={game.lives} scores={scores} seed={game.seed} />
            <aside className="side-rank">
              <h3>Ranking</h3>
              <Ranking rows={rows} compact={rows.length > 6} />
              <div className="side-join">
                Join: <b>{code}</b>
              </div>
            </aside>
          </div>
        )}

        {game.phase === 'roundEnd' && (
          <div className="round-end">
            <h1 className="round-end-title">Round {game.round} results</h1>
            <Ranking rows={rows} />
          </div>
        )}

        {game.phase === 'podium' && <Podium rows={rows} stats={game.stats} />}
      </main>

      {countdown > 0 && (
        <div className="overlay countdown-big" key={countdown}>
          <span>{countdown}</span>
          <small>Round {game.round}</small>
        </div>
      )}
      {game.phase === 'playing' && !game.running && t >= 0 && t < ROUND_MS && t > -COUNTDOWN_MS && (
        <div className="overlay paused-big">⏸ Paused</div>
      )}

      {game.phase === 'defense' && (
        <DefenseView
          game={game}
          player={game.defense ? game.players[game.defense.playerId] : undefined}
          onSkip={actions.startVote}
          onCloseVote={actions.resolveVote}
          onContinue={actions.finishDefense}
        />
      )}

      {sabotages[0] && <SabotageAnim ev={sabotages[0]} players={game.players} />}
    </div>
  )
}
