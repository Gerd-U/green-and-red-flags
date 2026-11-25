import { useEffect, useRef, useState, type ReactNode } from 'react'
import PhaseTransition from '../components/PhaseTransition'
import PolyBackground from '../components/PolyBackground'
import QRCode from '../components/QRCode'
import RoundBackdrop from '../components/RoundBackdrop'
import Tutorial from '../components/Tutorial'
import { AWARD_SHOW_MS, COUNTDOWN_MS, formatClock, roundConfig, START_HEARTS, TOTAL_ROUNDS } from '../lib/game'
import { makeRoomCode } from '../lib/room'
import { duckMusic, isMusicOn, isSfxOn, playSfx, setMusicOn, setMusicTempo, setSfxOn, startMusic, stopMusic, unlockAudio } from '../lib/sfx'
import LiveGrid from '../admin/LiveGrid'
import { Announcer, AwardsShow, DefenseView, Lobby, Podium, Ranking, RoundResults, SabotageAnim, type RankRow } from '../admin/Panels'
import { clearAdminSnapshot, loadAdminSnapshot, useAdminGame } from '../admin/useAdminGame'
import { FinalThoughts, HotTakeView, IntroScreen, ObjectionOverlay } from '../admin/Stages'

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

/** Controls are hidden while the host phone is connected; mouse move or "H" shows them for 4 s. */
function useControlsVisible(hostOnline: boolean) {
  const [until, setUntil] = useState(0)
  const [, force] = useState(0)
  useEffect(() => {
    const show = () => setUntil(performance.now() + 4000)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') show()
    }
    window.addEventListener('mousemove', show)
    window.addEventListener('keydown', onKey)
    const id = setInterval(() => force((n) => n + 1), 500)
    return () => {
      window.removeEventListener('mousemove', show)
      window.removeEventListener('keydown', onKey)
      clearInterval(id)
    }
  }, [])
  return !hostOnline || performance.now() < until
}

function AdminRoom({ code, onNewRoom }: { code: string; onNewRoom: () => void }) {
  const { g, ticks, catchFx, status, sabotages, announcements, objectionKey, hostOnline, elapsed, actions } = useAdminGame(code)
  const [, setTick] = useState(0)
  const controlsVisible = useControlsVisible(hostOnline)

  // light re-render for timers / ranking
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250)
    return () => clearInterval(id)
  }, [])

  const game = g.current
  const now = performance.now()
  const joinUrl = `${window.location.origin}/play?room=${code}`
  const shortUrl = `${window.location.host}/play`
  const allPlayers = Object.values(game.players)
  const lobbyPlayers = allPlayers.filter((p) => p.online)
  const inRound = game.phase === 'playing' || game.phase === 'defense'
  // during a round only the players who started it are on the grid (late joiners wait for the next one)
  const gamePlayers = inRound
    ? game.roundIds.map((id) => game.players[id]).filter(Boolean)
    : allPlayers.filter((p) => p.online || game.totals[p.id] != null)
  const rows: RankRow[] = allPlayers
    .filter((p) => game.totals[p.id] != null || game.roundIds.includes(p.id))
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
  const auto = game.auto
  const autoLeft = auto ? (auto.paused ? auto.pausedLeft : Math.max(0, auto.endsAt - now)) : 0
  const activity = Date.now() - game.createdAt
  const themed = inRound || game.phase === 'roundEnd'
  const bigJoin = game.phase === 'intro' || game.phase === 'lobby'

  // ---- sound ----
  const [musicOn, setMusic] = useState(isMusicOn())
  const [sfxOn, setSfx] = useState(isSfxOn())
  useEffect(() => {
    const unlock = () => {
      unlockAudio()
      if (isMusicOn()) startMusic()
    }
    document.addEventListener('pointerdown', unlock)
    return () => {
      document.removeEventListener('pointerdown', unlock)
      stopMusic()
    }
  }, [])
  const bpm = game.phase === 'intro' || game.phase === 'lobby' || game.phase === 'tutorial' ? 100 : [108, 120, 134][Math.max(0, game.round - 1)] ?? 112
  useEffect(() => setMusicTempo(bpm), [bpm])
  const talking = game.phase === 'defense' && game.defense?.stage !== 'result'
  const discussing = game.phase === 'roundEnd' || game.phase === 'hotTake' || game.phase === 'final' || game.phase === 'intro'
  useEffect(() => duckMusic(talking || discussing), [talking, discussing])
  // phase / countdown / announcement sounds
  const prev = useRef({ phase: game.phase, countdown: 0, ann: -1, award: -1, stage: '', ht: '', objection: 0 })
  const awardIdx = game.phase === 'awards' && auto ? Math.floor(Math.max(0, Math.max(1, game.awards?.length ?? 0) * AWARD_SHOW_MS + 1500 - autoLeft) / AWARD_SHOW_MS) : -1
  useEffect(() => {
    const p = prev.current
    if (countdown !== p.countdown) {
      if (countdown > 0) playSfx('countdown')
      else if (p.countdown === 1) playSfx('go')
      p.countdown = countdown
    }
    if (game.phase !== p.phase) {
      if (game.phase === 'defense') playSfx('defense')
      if (game.phase === 'roundEnd') playSfx('roundEnd')
      if (game.phase === 'podium') playSfx('award')
      p.phase = game.phase
    }
    const stage = game.defense?.stage ?? ''
    if (stage !== p.stage) {
      if (stage === 'vote') playSfx('vote')
      if (stage === 'result') playSfx(game.defense?.result === 'convinced' ? 'soulmate' : 'red')
      p.stage = stage
    }
    if (awardIdx !== p.award) {
      if (awardIdx >= 0) playSfx('award')
      p.award = awardIdx
    }
    const ht = game.hotTake ? `${game.hotTake.stage}-${game.hotTake.speaker ?? ''}` : ''
    if (ht !== p.ht) {
      if (game.hotTake?.stage === 'vote') playSfx('defense')
      if (game.hotTake?.stage === 'reveal') playSfx('roundEnd')
      if (game.hotTake?.stage === 'speaker') playSfx('announce')
      if (game.hotTake?.stage === 'verdict') playSfx('award')
      p.ht = ht
    }
    if (objectionKey !== p.objection) {
      if (objectionKey) playSfx('objection')
      p.objection = objectionKey
    }
    const a = announcements[0]
    if (a && a.key !== p.ann && game.phase === 'playing') {
      p.ann = a.key
      playSfx(a.sfx)
    }
  })

  const confirmNewRoom = () => {
    if (window.confirm('Start a brand new room? Players will need the new code.')) onNewRoom()
  }

  // ---- overlays: only one at a time, never over a results screen ----
  const paused = game.phase === 'playing' && !game.running && t >= 0 && t < cfg.durationMs && t > -COUNTDOWN_MS
  const overlay: 'countdown' | 'paused' | 'sabotage' | 'announce' | null =
    game.phase !== 'playing'
      ? null
      : countdown > 0
        ? 'countdown'
        : paused
          ? 'paused'
          : sabotages[0]
            ? 'sabotage'
            : announcements[0]
              ? 'announce'
              : null

  const b = (label: ReactNode, onClick: () => void, kind = 'ghost', disabled = false) => (
    <button className={`btn btn-${kind}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )

  const roundLabel =
    game.phase === 'hotTake'
      ? `🔥 Hot Take ${game.round} · after ${cfg.name}`
      : game.round > 0 && !['podium', 'awards', 'final', 'lobby', 'intro', 'tutorial'].includes(game.phase)
        ? `Round ${game.round} of ${TOTAL_ROUNDS} · ${cfg.name}`
        : ''

  return (
    <div className={`proj phase-${game.phase} ${themed ? `themed theme-${cfg.theme}` : ''} ${controlsVisible ? '' : 'no-cursor'}`}>
      {themed ? <RoundBackdrop theme={cfg.theme} className="admin-bd" /> : <PolyBackground />}

      {/* ---------- top bar ---------- */}
      <header className="proj-top">
        <div className="proj-logo">
          <span className="g">Green</span>
          <span className="amp">&amp;</span>
          <span className="r">Red</span> Flags
        </div>
        <div className="proj-center">
          {roundLabel && <span className="proj-round">{roundLabel}</span>}
          {inRound && (
            <span className={`proj-time ${timeLeft <= 10 ? 'urgent' : ''}`}>
              {game.running || game.phase === 'defense' ? '' : '⏸ '}
              {timeLeft}s
            </span>
          )}
        </div>
        <div className="proj-right">
          <span className="proj-clock" title="Activity time">
            ⏱ {formatClock(activity)}
          </span>
          {hostOnline && <span className="proj-host">🎤 Host</span>}
          <span className={`dot ${status === 'SUBSCRIBED' ? 'on' : ''}`} title={status} />
        </div>
      </header>

      {/* ---------- stage ---------- */}
      <main className="proj-stage">
        {game.phase === 'intro' && (
          <IntroScreen code={code} joinUrl={shortUrl} players={lobbyPlayers.length} qr={<QRCode text={joinUrl} className="qr-big" />} />
        )}
        {game.phase === 'lobby' && (
          <Lobby players={lobbyPlayers} code={code} joinUrl={shortUrl} qr={<QRCode text={joinUrl} className="qr-big" />} />
        )}
        {game.phase === 'tutorial' && <Tutorial secondsLeft={Math.ceil(Math.max(0, game.tutorialEndsAt - now) / 1000)} />}
        {inRound && (
          <div className="proj-live">
            <LiveGrid
              players={gamePlayers}
              ticks={ticks}
              catchFx={catchFx}
              scores={scores}
              seed={game.seed}
              round={game.round}
              gameSeed={game.gameSeed}
            />
            <aside className="proj-rank">
              <div className="proj-label">Ranking</div>
              <Ranking rows={rows} compact />
            </aside>
          </div>
        )}
        {game.phase === 'roundEnd' && <RoundResults game={game} rows={rows} autoLeft={autoLeft} paused={Boolean(auto?.paused)} />}
        {game.phase === 'hotTake' && game.hotTake && (
          <HotTakeView h={game.hotTake} players={game.players} left={Math.max(0, game.hotTake.stageEndsAt - now)} />
        )}
        {game.phase === 'awards' && (
          <AwardsShow
            awards={game.awards ?? []}
            players={game.players}
            shownMs={auto ? Math.max(0, Math.max(1, game.awards?.length ?? 0) * AWARD_SHOW_MS + 1500 - autoLeft) : 0}
          />
        )}
        {game.phase === 'podium' && <Podium rows={rows} stats={game.stats} />}
        {game.phase === 'final' && <FinalThoughts stats={game.finalStats} players={game.players} />}
      </main>

      {/* ---------- bottom strip: how to join ---------- */}
      {!bigJoin && (
        <footer className="proj-bottom">
          <span className="proj-label">Join</span>
          <span className="proj-url">{shortUrl}</span>
          <span className="proj-code">{code}</span>
          <QRCode text={joinUrl} className="qr-small" />
        </footer>
      )}

      {/* ---------- overlays ---------- */}
      {overlay === 'countdown' && (
        <div className="overlay countdown-big" key={countdown}>
          <span>{countdown}</span>
          <small>
            Round {game.round} of {TOTAL_ROUNDS}: {cfg.name}
          </small>
          <em>{cfg.tagline}</em>
        </div>
      )}
      {overlay === 'paused' && <div className="overlay paused-big">⏸ Paused</div>}
      {overlay === 'sabotage' && <SabotageAnim ev={sabotages[0]} players={game.players} />}
      {overlay === 'announce' && <Announcer items={announcements} />}
      {game.phase === 'defense' && (
        <DefenseView game={game} player={game.defense ? game.players[game.defense.playerId] : undefined} autoLeft={autoLeft} />
      )}
      {game.phase === 'defense' && <ObjectionOverlay k={objectionKey} />}

      {/* ---------- controls (hidden while the host phone is connected) ---------- */}
      <div className={`proj-controls ${controlsVisible ? 'show' : ''}`} aria-hidden={!controlsVisible}>
        {hostOnline && <div className="proj-controls-note">Host connected · press H to show</div>}
        <div className="proj-controls-row">
          {game.phase === 'intro' && b('Open lobby ▶', actions.openLobby, 'green')}
          {game.phase === 'lobby' && b('Start game ▶', actions.startGame, 'green', readyCount === 0)}
          {game.phase === 'tutorial' && b('Skip tutorial ⏭', actions.skip, 'green')}
          {game.phase === 'playing' && (
            <>
              {b(game.running ? '⏸ Pause' : '▶ Resume', actions.togglePause)}
              {b('End round', actions.endRound)}
            </>
          )}
          {game.phase === 'defense' && (
            <>
              {auto && b(auto.paused ? '▶ Resume' : '⏸ Hold', actions.togglePause)}
              {game.defense?.stage === 'talk' && b('Objection!', actions.objection, 'gold')}
              {b(game.defense?.stage === 'talk' ? 'Start vote ⏭' : game.defense?.stage === 'vote' ? 'Close vote ⏭' : 'Continue ▶', actions.skip, 'green')}
            </>
          )}
          {(game.phase === 'roundEnd' || game.phase === 'awards') && auto && (
            <>
              {b(auto.paused ? '▶ Resume timer' : '⏸ Hold timer', actions.togglePause)}
              {b(`${auto.label} now ▶`, actions.skip, 'green')}
            </>
          )}
          {game.phase === 'hotTake' && game.hotTake && (
            <>
              {game.hotTake.stage === 'vote' ? b('Reveal ▶', actions.htReveal, 'green') : b("Host's verdict", actions.htVerdict, 'gold')}
              {b('Next round ▶', actions.htNext, 'green')}
            </>
          )}
          {game.phase === 'podium' && b('Final thoughts ▶', actions.showFinal, 'green')}
          {(game.phase === 'podium' || game.phase === 'final') && b('Play again', actions.backToLobby)}
        </div>
        <div className="proj-controls-row">
          {b(
            musicOn ? '🎵 Music' : '🔇 Music',
            () => {
              unlockAudio()
              setMusicOn(!musicOn)
              setMusic(!musicOn)
              if (!musicOn) startMusic(bpm)
            },
            musicOn ? 'ghost' : 'ghost off'
          )}
          {b(
            sfxOn ? '🔊 Sounds' : '🔈 Sounds',
            () => {
              unlockAudio()
              setSfxOn(!sfxOn)
              setSfx(!sfxOn)
            },
            sfxOn ? 'ghost' : 'ghost off'
          )}
          {b('New room…', confirmNewRoom)}
        </div>
      </div>

      <PhaseTransition phaseKey={`${game.phase}-${game.round}`} />
    </div>
  )
}
