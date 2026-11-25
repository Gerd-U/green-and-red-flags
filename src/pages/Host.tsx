import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import PolyBackground from '../components/PolyBackground'
import { ACTIVITY_LIMIT_MIN, formatClock, PLAN, roundConfig, TOTAL_ROUNDS, HOTTAKE_AFTER_ROUNDS } from '../lib/game'
import {
  clearHostSession,
  ENV_HOST_PASSWORD,
  hostTopic,
  loadHostSession,
  loginProof,
  randomHex,
  saveHostSession,
  xorToken,
  type HostAuthMsg,
  type HostCmdName,
  type HostSession,
} from '../lib/host'
import { mainTopic, normalizeCode, openChannel, type Room } from '../lib/room'
import { load } from '../lib/storage'
import type { GameState, HostInfo } from '../lib/types'
import HostScript from '../host/HostScript'

// /host — the moderator's phone. It never plays: it is a remote control for
// the projector (which stays the game authority) plus a teleprompter.

export default function Host() {
  const [params] = useSearchParams()
  const [session, setSession] = useState<HostSession | null>(() => {
    const saved = loadHostSession()
    const wanted = normalizeCode(params.get('room'))
    // a saved session for another room is ignored
    return saved && (!wanted || saved.code === wanted) ? saved : null
  })
  useEffect(() => {
    document.documentElement.classList.add('host-page')
    return () => document.documentElement.classList.remove('host-page')
  }, [])
  if (!session) return <HostLogin onLogin={setSession} />
  return (
    <HostView
      session={session}
      onLeave={() => {
        clearHostSession()
        setSession(null)
      }}
    />
  )
}

// ---------------------------------------------------------------------------

/** Sends `host-login` and waits for the projector's answer. Used by the form and by the dev harness. */
export function hostLogin(code: string, password: string): Promise<HostSession> {
  return new Promise((resolve, reject) => {
    const nonce = randomHex(16)
    const room = openChannel(mainTopic(code))
    const timer = setTimeout(() => {
      room.close()
      reject(new Error('timeout'))
    }, 6000)
    room.on<HostAuthMsg>('host-auth', (m) => {
      if (m?.nonce !== nonce) return
      clearTimeout(timer)
      room.close()
      if (!m.ok || !m.enc) return reject(new Error('wrong'))
      resolve({ code, token: xorToken(m.enc, password, nonce) })
    })
    room.subscribe(() => room.send('host-login', { nonce, proof: loginProof(password, code, nonce) }))
  })
}

function HostLogin({ onLogin }: { onLogin: (s: HostSession) => void }) {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [code, setCode] = useState(() => normalizeCode(params.get('room')) || load<string>('gr.lastRoom', ''))
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // DEV ONLY (/dev/bots harness): log in by itself with the env password or
  // the PIN the admin saved in this browser's localStorage.
  useEffect(() => {
    if (!import.meta.env.DEV || params.get('autologin') !== '1') return
    const c = normalizeCode(params.get('room'))
    let stop = false
    const tryLogin = async () => {
      const pin = load<{ hostPin?: string } | null>('gr.admin', null)?.hostPin ?? ''
      const pw = ENV_HOST_PASSWORD || pin
      if (!pw) return setTimeout(() => !stop && tryLogin(), 1000)
      try {
        const s = await hostLogin(c, pw)
        saveHostSession(s)
        if (!stop) onLogin(s)
      } catch {
        if (!stop) setTimeout(tryLogin, 1500)
      }
    }
    tryLogin()
    return () => {
      stop = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const c = normalizeCode(code)
    if (c.length !== 4 || !password.trim()) return
    setBusy(true)
    setError('')
    try {
      const s = await hostLogin(c, password)
      saveHostSession(s)
      onLogin(s)
    } catch (err) {
      setError(
        (err as Error).message === 'wrong'
          ? 'Wrong password or PIN. Try again.'
          : "The projector didn't answer. Is /admin open with this room code?"
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen center">
      <PolyBackground />
      <form className="panel join-panel" onSubmit={submit}>
        <h1 className="title-sm">I&apos;m the host</h1>
        <p className="muted">Moderate the debate from your phone. You don&apos;t play.</p>
        <label className="label" htmlFor="hcode">
          Room code
        </label>
        <input
          id="hcode"
          className="input code-input"
          value={code}
          onChange={(e) => setCode(normalizeCode(e.target.value))}
          placeholder="ABCD"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={4}
        />
        <label className="label" htmlFor="hpass">
          Host password or PIN
        </label>
        <input
          id="hpass"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••"
        />
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-green btn-big" disabled={busy || normalizeCode(code).length !== 4 || !password.trim()}>
          {busy ? 'Checking…' : 'Enter as host'}
        </button>
        <button type="button" className="btn btn-ghost small" onClick={() => nav('/')}>
          Back
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------

/** Which part of the plan we are in (keys of PLAN in game.ts). */
export function planKey(s: GameState): string {
  switch (s.phase) {
    case 'intro':
      return 'intro'
    case 'lobby':
      return 'lobby'
    case 'tutorial':
      return 'tutorial'
    case 'playing':
    case 'defense':
      return `round${s.round}`
    case 'roundEnd':
      return HOTTAKE_AFTER_ROUNDS.includes(s.round) ? `hottake${s.round}` : s.round >= TOTAL_ROUNDS ? 'awards' : `round${s.round}`
    case 'hotTake':
      return `hottake${s.round}`
    case 'awards':
    case 'podium':
      return 'awards'
    case 'final':
      return 'final'
  }
}

export function phaseLabel(s: GameState): string {
  const r = `Round ${s.round} of ${TOTAL_ROUNDS}`
  switch (s.phase) {
    case 'intro':
      return 'Intro'
    case 'lobby':
      return 'Lobby'
    case 'tutorial':
      return 'Tutorial'
    case 'playing':
      return `${r} · ${roundConfig(s.round).name}`
    case 'defense':
      return `${r} · Defense`
    case 'roundEnd':
      return `${r} · Results`
    case 'hotTake':
      return `Hot Take ${s.round}`
    case 'awards':
      return 'Awards'
    case 'podium':
      return 'Podium'
    case 'final':
      return 'Final thoughts'
  }
}

function HostView({ session, onLeave }: { session: HostSession; onLeave: () => void }) {
  const [info, setInfo] = useState<HostInfo | null>(null)
  const [received, setReceived] = useState(0)
  const [showScript, setShowScript] = useState(true)
  const [, force] = useState(0)
  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    const room = openChannel(hostTopic(session.code, session.token))
    roomRef.current = room
    room.on<HostInfo>('hostinfo', (m) => {
      setInfo(m)
      setReceived(performance.now())
    })
    const hello = () => room.send('hello', { token: session.token })
    room.subscribe(hello)
    // keep saying hello: the projector answers with the latest info
    const id = setInterval(hello, 5000)
    const onVis = () => document.visibilityState === 'visible' && hello()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      room.close()
    }
  }, [session])

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [])

  const send = useCallback(
    (cmd: HostCmdName, arg?: string) => {
      roomRef.current?.send('cmd', { token: session.token, cmd, arg })
      try {
        navigator.vibrate?.(30)
      } catch {
        /* ignore */
      }
    },
    [session]
  )

  const since = info ? performance.now() - received : 0
  const s = info?.state

  if (!info || !s) {
    return (
      <div className="screen center host-screen">
        <PolyBackground variant="dark" />
        <div className="panel narrow">
          <h1 className="title-sm">Host · Room {session.code}</h1>
          <p className="muted">Connecting to the projector… Make sure /admin is open with room {session.code}.</p>
          <button className="btn btn-ghost" onClick={onLeave}>
            Leave host
          </button>
        </div>
      </div>
    )
  }

  // timers (interpolated between messages)
  const activity = info.activityMs + since
  const key = planKey(s)
  const plan = PLAN.find((p) => p.key === key)
  const behindMs = plan ? activity - plan.endMin * 60_000 : 0
  const over = activity > (ACTIVITY_LIMIT_MIN - 3) * 60_000
  const left = (ms?: number) => Math.max(0, Math.ceil(((ms ?? 0) - since) / 1000))
  const nameOf = (id?: string) => info.players.find((p) => p.id === id)?.name ?? '?'
  const playersOnline = info.players.filter((p) => p.online)
  const ready = playersOnline.filter((p) => p.ready).length
  const d = s.defense
  const h = s.hotTake

  // plain render helper (not a component), so the buttons keep the same DOM
  // node between the 2 refreshes per second and a tap is never lost
  const btn = (cmd: HostCmdName, children: ReactNode, kind: 'green' | 'red' | 'ghost' | 'gold' = 'ghost', wide = false) => (
    <button key={cmd} className={`btn btn-${kind} host-btn ${wide ? 'wide' : ''}`} onClick={() => send(cmd)}>
      {children}
    </button>
  )

  return (
    <div className="screen host-screen">
      <PolyBackground variant="dark" />
      <div className="host-wrap">
        <header className="host-top">
          <div>
            <div className="host-phase">{phaseLabel(s)}</div>
            <div className="host-sub">
              Room {session.code} · {playersOnline.length} players
            </div>
          </div>
          <div className="host-clock-box">
            <div className={`host-clock ${over ? 'late' : ''}`}>⏱ {formatClock(activity)}</div>
            <div className={`host-plan ${behindMs > 30_000 ? 'late' : 'ok'}`}>
              {behindMs > 30_000 ? `${formatClock(behindMs)} behind` : 'On time'}
            </div>
          </div>
        </header>
        {over && <div className="host-warning">⚠️ {formatClock(ACTIVITY_LIMIT_MIN * 60_000 - activity)} left of the 30 minutes. Wrap up!</div>}

        <div className="host-script-toggle">
          <button className="btn btn-ghost small" onClick={() => setShowScript((v) => !v)}>
            {showScript ? 'Hide script' : 'Show script'}
          </button>
        </div>
        {showScript && <HostScript info={info} />}

        {/* ---------- controls per phase ---------- */}
        <section className="host-controls">
          {s.phase === 'intro' && (
            <>{btn('openLobby', <>Open the lobby ▶</>, 'green', true)}</>
          )}
          {s.phase === 'lobby' && (
            <>
              <div className="host-status">
                {ready} of {playersOnline.length} ready
              </div>
              <>{btn('start', <>Start game ▶</>, 'green', true)}</>
            </>
          )}
          {s.phase === 'tutorial' && (
            <>{btn('skip', <>Skip tutorial ⏭</>, 'green', true)}</>
          )}
          {s.phase === 'playing' && (
            <>
              <div className="host-status">{s.running ? `${roundConfig(s.round).name}: playing` : 'Paused'}</div>
              <>{btn('pause', <>{s.running ? '⏸ Pause' : '▶ Resume'}</>, s.running ? 'ghost' : 'green')}</>
              <>{btn('endRound', <>End round</>, 'ghost')}</>
            </>
          )}
          {s.phase === 'defense' && d && (
            <>
              <div className="host-status">
                {d.name} defends “{d.text}”
                <br />
                {d.stage === 'talk' && `Talking: ${left(d.remaining)}s`}
                {d.stage === 'vote' && `Voting: ${d.votesIn}/${d.votesNeeded} · ${left(d.remaining)}s`}
                {d.stage === 'result' && `${d.result === 'convinced' ? 'Convinced' : 'Not convinced'} (${d.convinced}–${d.notConvinced})`}
              </div>
              {d.stage === 'talk' && (
                <>
                  <>{btn('objection', <>⚖️ OBJECTION! (+10 s)</>, 'gold', true)}</>
                  <>{btn('vote', <>Go to the vote ⏭</>, 'green', true)}</>
                </>
              )}
              {d.stage === 'vote' && (
                <>{btn('skip', <>Close the vote ⏭</>, 'green', true)}</>
              )}
              {d.stage === 'result' && (
                <>
                  <>{btn('pause', <>{s.auto?.paused ? '▶ Resume timer' : '⏸ Hold'}</>, 'ghost')}</>
                  <>{btn('skip', <>Continue ▶</>, 'green')}</>
                </>
              )}
            </>
          )}
          {s.phase === 'roundEnd' && (
            <>
              <div className="host-status">
                {s.auto ? `${s.auto.label} in ${left(s.auto.remaining)}s${s.auto.paused ? ' (held)' : ''}` : 'Results'}
              </div>
              <>{btn('pause', <>{s.auto?.paused ? '▶ Resume timer' : '⏸ Hold'}</>, 'ghost')}</>
              <>{btn('skip', <>{s.auto?.label ?? 'Next'} now ▶</>, 'green')}</>
            </>
          )}
          {s.phase === 'hotTake' && h && (
            <>
              <div className="host-status">
                🔥 “{h.text}”
                <br />
                {h.stage === 'vote' && `Secret vote: ${h.votesIn}/${h.votesNeeded} · ${left(h.remaining)}s`}
                {h.stage !== 'vote' && `RED ${h.pctRed}% · GREEN ${100 - (h.pctRed ?? 0)}%`}
                {h.stage === 'speaker' && ` · ${nameOf(h.speaker)} talks: ${left(h.remaining)}s`}
              </div>
              {h.stage === 'vote' ? (
                <>
                  <>{btn('htReveal', <>Reveal now</>, 'green', true)}</>
                  <>{btn('htNext', <>Skip Hot Take (we are late) ⏭</>, 'ghost', true)}</>
                </>
              ) : (
                <>
                  <div className="ht-sides">
                    {(['red', 'green'] as const).map((side) => (
                      <div key={side} className={`ht-side ${side}`}>
                        <div className="ht-side-title">{side === 'red' ? 'RED' : 'GREEN'}</div>
                        {(h[side] ?? []).map((id) => {
                          const p = info.players.find((x) => x.id === id)
                          return (
                            <button key={id} className={`ht-pick ${h.speaker === id ? 'on' : ''}`} onClick={() => send('htSpeaker', id)}>
                              {p && <Avatar config={p.avatar} size={30} crop="head" animate={false} />}
                              <span>{p?.name ?? '?'}</span>
                            </button>
                          )
                        })}
                        {!(h[side] ?? []).length && <div className="muted small">nobody</div>}
                      </div>
                    ))}
                  </div>
                  <div className="muted small center-text">Tap a name to give them the word (30 s)</div>
                  <>{btn('htVerdict', <>👑 Host&apos;s verdict</>, 'gold', true)}</>
                  <>{btn('htNext', <>Next round ▶</>, 'green', true)}</>
                </>
              )}
            </>
          )}
          {s.phase === 'awards' && (
            <>{btn('podium', <>Podium now ▶</>, 'green', true)}</>
          )}
          {s.phase === 'podium' && (
            <>{btn('final', <>Final thoughts ▶</>, 'green', true)}</>
          )}
          {(s.phase === 'podium' || s.phase === 'final') && <>{btn('playAgain', <>Play again</>, 'ghost')}</>}
          {(s.phase === 'roundEnd' || s.phase === 'hotTake') && s.round >= TOTAL_ROUNDS && (
            <>{btn('awards', <>Go to awards</>, 'ghost')}</>
          )}
        </section>

        <footer className="host-footer">
          <button
            className="btn btn-ghost small"
            onClick={() => {
              if (window.confirm('Leave host mode on this phone?')) onLeave()
            }}
          >
            Leave host
          </button>
        </footer>
      </div>
    </div>
  )
}
