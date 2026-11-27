import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import PolyBackground from '../components/PolyBackground'
import { ACTIVITY_LIMIT_MIN, formatClock, PLAN, roundConfig, TOTAL_ROUNDS, HOTTAKE_AFTER_ROUNDS } from '../lib/game'
import {
  clearHostSession,
  HOST_PASSWORD,
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
import { CUE_STYLE } from '../host/cues'
import { useCues } from '../host/useCues'
import { unlockAudio } from '../lib/sfx'

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

  // DEV ONLY (/dev/bots harness): log in by itself with the host password
  // ("Alfa12" unless VITE_HOST_PASSWORD says otherwise).
  useEffect(() => {
    if (!import.meta.env.DEV || params.get('autologin') !== '1') return
    const c = normalizeCode(params.get('room'))
    let stop = false
    const tryLogin = async () => {
      const pw = params.get('pw') ?? HOST_PASSWORD
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
          ? 'Wrong password. Try again.'
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
          Host password
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
  const [menu, setMenu] = useState(false)
  const [, force] = useState(0)
  const roomRef = useRef<Room | null>(null)
  // a tap on "Start hosting" is needed: Chrome on Android only lets a page
  // vibrate / play sound after the user touched it at least once
  const [started, setStarted] = useState(() => import.meta.env.DEV && new URLSearchParams(location.search).get('autologin') === '1')
  const [status, setStatus] = useState('connecting')
  const [reconnects, setReconnects] = useState(0)
  const [wakeOk, setWakeOk] = useState(true)
  const [question, setQuestion] = useState<string | undefined>()
  const lastReconnect = useRef(0)

  useEffect(() => {
    const room = openChannel(hostTopic(session.code, session.token), { onStatus: setStatus })
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
  }, [session, reconnects])

  // watchdog: no news from the projector for 8 s -> reopen the channel
  useEffect(() => {
    const id = setInterval(() => {
      const quiet = performance.now() - received
      if ((quiet > 8000 || status !== 'SUBSCRIBED') && performance.now() - lastReconnect.current > 8000) {
        lastReconnect.current = performance.now()
        setReconnects((n) => n + 1)
      }
    }, 2000)
    return () => clearInterval(id)
  }, [received, status])

  // keep the screen on while hosting (Screen Wake Lock API)
  useEffect(() => {
    if (!started) return
    let lock: { release: () => Promise<void> } | null = null
    const request = async () => {
      try {
        const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
        if (!wl) throw new Error('unsupported')
        lock = await wl.request('screen')
        setWakeOk(true)
      } catch {
        setWakeOk(false)
      }
    }
    request()
    const onVis = () => document.visibilityState === 'visible' && request()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  }, [started])

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
  const connected = status === 'SUBSCRIBED' && !!info && since < 6000
  const cues = useCues(started ? info : null, received, connected, s ? planKey(s) : '')

  if (!started) {
    return (
      <div className="screen center host-screen">
        <PolyBackground variant="dark" />
        <div className="panel narrow start-hosting">
          <h1 className="title-sm">Ready to host room {session.code}?</h1>
          <p className="muted">
            Your phone will vibrate when it's your turn to talk (one long buzz), when you need to tap a button (two short) and
            for warnings (three short). Keep the screen on during the activity.
          </p>
          <button
            className="btn btn-green btn-big"
            onClick={() => {
              unlockAudio()
              try {
                navigator.vibrate?.(60)
              } catch {
                /* ignore */
              }
              setStarted(true)
            }}
          >
            ▶ Start hosting
          </button>
          <button className="btn btn-ghost small" onClick={onLeave}>
            Leave host
          </button>
        </div>
      </div>
    )
  }

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
  const btn = (cmd: HostCmdName, children: ReactNode, kind: 'green' | 'red' | 'ghost' | 'gold' = 'ghost') => (
    <button key={cmd + String(children)} className={`btn btn-${kind} host-btn2`} onClick={() => send(cmd)}>
      {children}
    </button>
  )

  // ---- the big "Next" button: always the next logical step ----
  let next: { cmd: HostCmdName; label: string } | { cmd: null; label: string } = { cmd: null, label: '' }
  switch (s.phase) {
    case 'intro':
      next = { cmd: 'openLobby', label: 'Open the lobby' }
      break
    case 'lobby':
      next = ready > 0 ? { cmd: 'start', label: `Start the game (${ready}/${playersOnline.length} ready)` } : { cmd: null, label: 'Waiting for players…' }
      break
    case 'tutorial':
      next = { cmd: 'skip', label: 'Start round 1' }
      break
    case 'playing':
      next = { cmd: null, label: s.running ? 'Round in progress…' : 'Paused' }
      break
    case 'defense':
      next =
        d?.stage === 'talk'
          ? { cmd: 'vote', label: 'Start vote' }
          : d?.stage === 'vote'
            ? { cmd: 'skip', label: 'Close the vote' }
            : { cmd: 'skip', label: 'Back to the game' }
      break
    case 'roundEnd':
      next = { cmd: 'skip', label: s.auto?.label ? `${s.auto.label} now` : 'Continue' }
      break
    case 'hotTake':
      next =
        h?.stage === 'vote'
          ? { cmd: 'htReveal', label: 'Reveal the votes' }
          : h?.stage === 'verdict'
            ? { cmd: 'htNext', label: 'Next round' }
            : { cmd: 'htVerdict', label: "Host's verdict" }
      break
    case 'awards':
      next = { cmd: 'podium', label: 'Podium' }
      break
    case 'podium':
      next = { cmd: 'final', label: 'Final thoughts' }
      break
    case 'final':
      next = { cmd: null, label: 'The end 🎉' }
      break
  }

  // ---- one line of status under the script ----
  let line = ''
  if (s.phase === 'lobby' || s.phase === 'intro') line = `${ready} of ${playersOnline.length} ready${s.lobbyLeft ? ` · starting soon ${formatClock(s.lobbyLeft - since + 999)}` : ''}`
  if (s.phase === 'playing') line = `${roundConfig(s.round).name} · ${left(roundConfig(s.round).durationMs - s.elapsed + (s.running ? 0 : since))}s`
  if (s.phase === 'defense' && d)
    line = `${d.name}: “${d.text}” · ${d.stage === 'talk' ? `talking ${left(d.remaining)}s` : d.stage === 'vote' ? `votes ${d.votesIn}/${d.votesNeeded} · ${left(d.remaining)}s` : `${d.result === 'convinced' ? 'Convinced' : 'Not convinced'} ${d.convinced}–${d.notConvinced}`}`
  if (s.phase === 'roundEnd' && s.auto) line = `${s.auto.label} in ${left(s.auto.remaining)}s${s.auto.paused ? ' (held)' : ''}`
  if (s.phase === 'hotTake' && h)
    line =
      h.stage === 'vote'
        ? `🔥 “${h.text}” · votes ${h.votesIn}/${h.votesNeeded} · ${left(h.remaining)}s`
        : `🔥 RED ${h.pctRed}% · GREEN ${100 - (h.pctRed ?? 0)}%${h.stage === 'speaker' ? ` · ${nameOf(h.speaker)} talks: ${left(h.remaining)}s` : ''}`

  const b = cues.banner
  return (
    <div className="host-app">
      <PolyBackground variant="dark" />
      {cues.flash && <div key={cues.flash.n} className={`cue-flash cue-${cues.flash.kind}`} aria-hidden="true" />}
      {!connected && <div className="cue-disconnected">⚠️ Disconnected — reconnecting…</div>}
      {b && (
        <div className={`cue-banner cue-${b.kind}`} key={b.key} role="alert">
          <div className="cue-head">
            {CUE_STYLE[b.kind].icon} {CUE_STYLE[b.kind].label} — {b.text}
          </div>
          {b.kind === 'speak' && question && <div className="cue-question">“{question}”</div>}
          <button className="btn cue-ok" onClick={cues.dismiss}>
            Got it
          </button>
        </div>
      )}

      <header className="host-top">
        <div className="host-top-left">
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
        <button className="host-gear" onClick={() => setMenu(true)} aria-label="Settings">
          ⚙️
        </button>
      </header>
      {over && <div className="host-warning">⚠️ {formatClock(ACTIVITY_LIMIT_MIN * 60_000 - activity)} left of the 30 minutes. Wrap up!</div>}

      {/* teleprompter (stays mounted when hidden: the cue banner uses its question) */}
      <div className="host-script-area" hidden={!showScript}>
        <HostScript info={info} onQuestion={setQuestion} />
      </div>
      {!showScript && <div className="host-script-hidden">Script hidden · ⚙️ to show it</div>}

      {line && <div className="host-status1">{line}</div>}

      {s.phase === 'hotTake' && h && h.stage !== 'vote' && (
        <div className="ht-sides">
          {(['red', 'green'] as const).map((side) => (
            <div key={side} className={`ht-side ${side}`}>
              <div className="ht-side-title">
                {side === 'red' ? 'RED' : 'GREEN'} · tap to give the word
              </div>
              <div className="ht-chips">
                {(h[side] ?? []).map((id) => {
                  const p = info.players.find((x) => x.id === id)
                  return (
                    <button key={id} className={`ht-pick ${h.speaker === id ? 'on' : ''}`} onClick={() => send('htSpeaker', id)}>
                      {p && <Avatar config={p.avatar} size={24} crop="head" animate={false} />}
                      <span>{p?.name ?? '?'}</span>
                    </button>
                  )
                })}
                {!(h[side] ?? []).length && <span className="muted small">nobody</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="host-next" disabled={!next.cmd} onClick={() => next.cmd && send(next.cmd)}>
        <span className="host-next-label">{next.cmd ? 'Next' : ''}</span>
        <span className="host-next-what">
          {next.label}
          {next.cmd ? ' ▶' : ''}
        </span>
      </button>

      <div className="host-row2">
        {(s.phase === 'intro' || s.phase === 'lobby') && btn('lobbyTimer', s.lobbyLeft ? '⏱ Stop countdown' : '⏱ Starting soon')}
        {s.phase === 'playing' && (
          <>
            {btn('pause', s.running ? '⏸ Pause' : '▶ Resume', s.running ? 'ghost' : 'green')}
            {btn('endRound', 'End round')}
          </>
        )}
        {s.phase === 'defense' && d?.stage === 'talk' && btn('objection', '⚖️ Objection! +10s', 'gold')}
        {s.phase === 'defense' && d?.stage === 'result' && btn('pause', s.auto?.paused ? '▶ Resume timer' : '⏸ Hold')}
        {s.phase === 'roundEnd' && btn('pause', s.auto?.paused ? '▶ Resume timer' : '⏸ Hold')}
        {s.phase === 'hotTake' && h?.stage !== 'verdict' && btn('htNext', 'Skip Hot Take ⏭')}
        {(s.phase === 'roundEnd' || s.phase === 'hotTake') && s.round >= TOTAL_ROUNDS && btn('awards', 'Go to awards')}
        {(s.phase === 'podium' || s.phase === 'final') && btn('playAgain', 'Play again')}
      </div>

      {/* ---------- settings menu ---------- */}
      {menu && (
        <div className="host-menu" role="dialog" aria-label="Settings">
          <div className="host-menu-card">
            <div className="host-menu-head">
              <strong>Settings</strong>
              <button className="btn btn-ghost small" onClick={() => setMenu(false)}>
                Close ✕
              </button>
            </div>
            <div className="cue-switches">
              {(
                [
                  ['vibration', 'Vibration'],
                  ['flash', 'Flash'],
                  ['sound', 'Cue sound'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="cue-switch">
                  <input type="checkbox" checked={cues.prefs[k]} onChange={(e) => cues.updatePrefs({ [k]: e.target.checked })} />
                  <span>{label}</span>
                </label>
              ))}
              <label className="cue-switch">
                <input type="checkbox" checked={showScript} onChange={(e) => setShowScript(e.target.checked)} />
                <span>Show script</span>
              </label>
            </div>
            <button className="btn btn-ghost" onClick={cues.testCues}>
              Test cue (SPEAK, ACT, WARN)
            </button>
            {!wakeOk && <div className="cue-wake">💡 Keep your screen on during the activity (this browser can't do it automatically).</div>}
            {cues.history.length > 0 && (
              <div className="cue-history">
                <div className="label">Last cues</div>
                {cues.history.map((c) => (
                  <div key={c.key} className={`cue-hist cue-${c.kind}`}>
                    <span>{CUE_STYLE[c.kind].icon}</span> {c.text}
                    <span className="cue-time">{new Date(c.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn btn-red"
              onClick={() => {
                if (window.confirm('Leave host mode on this phone?')) onLeave()
              }}
            >
              Leave host
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
