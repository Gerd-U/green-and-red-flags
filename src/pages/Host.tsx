import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import PolyBackground from '../components/PolyBackground'
import { formatClock, roundConfig, TOTAL_ROUNDS, HOTTAKE_AFTER_ROUNDS } from '../lib/game'
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
import { unlockAudio } from '../lib/sfx'
import { hasVibrationApi, lastBuzz, noteBuzz, onBuzz } from '../lib/buzz'

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
  // refresh the vibration diagnosis in the ⚙️ menu after every call
  const [, setBuzzN] = useState(0)
  useEffect(() => onBuzz(() => setBuzzN((n) => n + 1)), [])
  const [, force] = useState(0)
  const roomRef = useRef<Room | null>(null)
  // a tap on "Start hosting" is needed: Chrome on Android only lets a page
  // vibrate / play sound after the user touched it at least once
  const [started, setStarted] = useState(() => import.meta.env.DEV && new URLSearchParams(location.search).get('autologin') === '1')
  const [status, setStatus] = useState('connecting')
  const [reconnects, setReconnects] = useState(0)
  const [wakeOk, setWakeOk] = useState(true)
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
    },
    [session]
  )

  const since = info ? performance.now() - received : 0
  const s = info?.state
  const connected = status === 'SUBSCRIBED' && !!info && since < 6000

  if (!started) {
    return (
      <div className="screen center host-screen">
        <PolyBackground variant="dark" />
        <div className="panel narrow start-hosting">
          <h1 className="title-sm">Ready to host room {session.code}?</h1>
          <p className="muted">
            Read the script at your own pace. Nothing starts until you tap Start. Keep the screen on during the activity.
          </p>
          <button
            className="btn btn-green btn-big"
            onClick={() => {
              unlockAudio()
              // inside the tap: from now on the phone may vibrate
              try {
                noteBuzz(navigator.vibrate(200))
              } catch {
                noteBuzz(false)
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
  const left = (ms?: number) => Math.max(0, Math.ceil(((ms ?? 0) - since) / 1000))
  const playersOnline = info.players.filter((p) => p.online)
  const ready = playersOnline.filter((p) => p.ready).length
  const d = s.defense
  const h = s.hotTake
  const held = Boolean(s.held)
  const lastRound = s.round >= TOTAL_ROUNDS

  // plain render helper (not a component), so the buttons keep the same DOM
  // node between the 2 refreshes per second and a tap is never lost
  const btn = (cmd: HostCmdName, children: ReactNode, kind: 'green' | 'red' | 'ghost' | 'gold' = 'ghost', arg?: string) => (
    <button key={cmd + String(children)} className={`btn btn-${kind} host-btn2`} onClick={() => send(cmd, arg)}>
      {children}
    </button>
  )

  // ---- the main game button: Start (the phase on screen begins) or Next (go on) ----
  // calm mode: every phase opens paused; nothing moves until this button is tapped
  type Main = { cmd: HostCmdName | null; label: string; kind: 'start' | 'next' | 'off' }
  let main: Main = { cmd: null, label: '', kind: 'off' }
  // a small line under the button when something needs me (the button turns amber)
  let attn = ''
  switch (s.phase) {
    case 'intro':
      main = { cmd: 'openLobby', label: 'Next: Open the lobby', kind: 'next' }
      break
    case 'lobby':
      main = ready > 0 ? { cmd: 'start', label: 'Next: Start the game', kind: 'next' } : { cmd: null, label: 'Waiting for players…', kind: 'off' }
      if (playersOnline.length >= 2 && ready === playersOnline.length) attn = `Everyone is ready (${ready})`
      break
    case 'tutorial':
      main = held ? { cmd: 'go', label: 'Start ▶', kind: 'start' } : { cmd: 'skip', label: 'Next: Round 1', kind: 'next' }
      break
    case 'playing':
      if (held) main = { cmd: 'go', label: 'Start round ▶', kind: 'start' }
      else if (!s.running && s.elapsed >= 0) main = { cmd: 'pause', label: 'Resume ▶', kind: 'start' }
      else main = { cmd: null, label: 'Round in progress…', kind: 'off' }
      break
    case 'defense':
      if (held) {
        main = { cmd: 'go', label: 'Start ▶', kind: 'start' }
        attn = d ? `Red flag! ${d.name} caught one` : 'Red flag!'
      } else if (d?.stage === 'talk') {
        main = { cmd: 'vote', label: 'Start vote ▶', kind: 'start' }
        if (left(d.remaining) === 0) attn = 'Time is up'
      } else if (d?.stage === 'vote') {
        main = { cmd: 'skip', label: 'Show results ▶', kind: 'start' }
        if (d.votesIn >= d.votesNeeded) attn = 'All votes are in'
      } else main = { cmd: 'skip', label: 'Next: Back to the game', kind: 'next' }
      break
    case 'roundEnd':
      main = { cmd: 'skip', label: `Next: ${s.auto?.label ?? 'Continue'}`, kind: 'next' }
      attn = 'The round is over'
      break
    case 'hotTake':
      if (held) {
        main = { cmd: 'go', label: 'Start vote ▶', kind: 'start' }
        attn = 'Hot Take!'
      } else if (h?.stage === 'vote') {
        main = { cmd: 'htReveal', label: 'Show results ▶', kind: 'start' }
        if (h.votesIn >= h.votesNeeded) attn = 'All votes are in'
      } else if (h?.stage === 'verdict') main = { cmd: 'htNext', label: lastRound ? 'Next: Awards' : `Next: Round ${s.round + 1}`, kind: 'next' }
      else main = { cmd: 'htVerdict', label: 'Next: Your opinion', kind: 'next' }
      break
    case 'awards':
      main = held ? { cmd: 'go', label: 'Show the awards ▶', kind: 'start' } : { cmd: 'podium', label: 'Next: Podium', kind: 'next' }
      break
    case 'podium':
      main = { cmd: 'final', label: 'Next: Final thoughts', kind: 'next' }
      break
    case 'final':
      main = { cmd: null, label: 'The end 🎉', kind: 'off' }
      break
  }

  // ---- small status line at the top ----
  let statusLine = `${playersOnline.length} players`
  if (s.phase === 'lobby' || s.phase === 'intro') statusLine = `${ready} of ${playersOnline.length} ready`
  if (s.phase === 'playing' && !held) statusLine = `${left(roundConfig(s.round).durationMs - s.elapsed + (s.running ? 0 : since))}s left`
  if (s.phase === 'defense' && d && !held && d.stage !== 'result') statusLine = d.stage === 'talk' ? `Talking: ${left(d.remaining)}s` : `Votes ${d.votesIn}/${d.votesNeeded}`
  if (s.phase === 'defense' && d?.stage === 'result') statusLine = `${d.result === 'convinced' ? 'Convinced' : 'Not convinced'} ${d.convinced}–${d.notConvinced}`
  if (s.phase === 'hotTake' && h && !held) statusLine = h.stage === 'vote' ? `Votes ${h.votesIn}/${h.votesNeeded}` : `🚩 ${h.pctRed}% · 💚 ${100 - (h.pctRed ?? 0)}%`

  const tapMain = () => {
    // the simplest possible vibration: right inside the tap, nothing before it
    try {
      noteBuzz(navigator.vibrate(200))
    } catch {
      noteBuzz(false)
    }
    if (main.cmd) send(main.cmd)
  }

  return (
    <div className="host-app">
      <PolyBackground variant="dark" />
      {!connected && <div className="host-offline">⚠️ No connection with the projector. Trying again…</div>}

      <header className="host-top">
        <span className="host-phase">{phaseLabel(s)}</span>
        <span className="host-stat">{statusLine}</span>
        <span className="host-clock">{formatClock(activity)}</span>
        <button className="host-gear" onClick={() => setMenu(true)} aria-label="Settings">
          ⚙️
        </button>
      </header>

      {/* the script: one step at a time, nothing covers it */}
      <div className="host-script-area" hidden={!showScript}>
        <HostScript info={info} />
      </div>
      {!showScript && <div className="host-script-hidden">Script hidden · ⚙️ to show it</div>}

      <button className={`host-main ${main.kind} ${attn ? 'attn' : ''}`} disabled={!main.cmd} onClick={tapMain}>
        {main.label}
      </button>
      <div className="host-attn" aria-live="polite">
        {attn}
      </div>

      {/* ---------- settings and the other controls ---------- */}
      {menu && (
        <div className="host-menu" role="dialog" aria-label="Settings">
          <div className="host-menu-card">
            <div className="host-menu-head">
              <strong>Settings</strong>
              <button className="btn btn-ghost small" onClick={() => setMenu(false)}>
                Close ✕
              </button>
            </div>

            <div className="host-menu-row">
              {(s.phase === 'intro' || s.phase === 'lobby') && btn('lobbyTimer', s.lobbyLeft ? '⏱ Stop countdown' : '⏱ Starting soon')}
              {s.phase === 'playing' && !held && (
                <>
                  {btn('pause', s.running ? '⏸ Pause' : '▶ Resume')}
                  {btn('endRound', 'End round')}
                </>
              )}
              {s.phase === 'defense' && d?.stage === 'talk' && !held && btn('objection', '⚖️ Objection! +10s', 'gold')}
              {s.phase === 'hotTake' && h?.stage !== 'verdict' && btn('htNext', 'Skip Hot Take ⏭')}
              {(s.phase === 'roundEnd' || s.phase === 'hotTake') && lastRound && btn('awards', 'Go to awards')}
              {(s.phase === 'podium' || s.phase === 'final') && btn('playAgain', 'Play again')}
            </div>

            {s.phase === 'hotTake' && h && h.stage !== 'vote' && (
              <div className="ht-sides">
                {(['red', 'green'] as const).map((side) => (
                  <div key={side} className={`ht-side ${side}`}>
                    <div className="ht-side-title">{side === 'red' ? '🚩 RED' : '💚 GREEN'} · tap a name to give the word</div>
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

            <label className="cue-switch">
              <input type="checkbox" checked={showScript} onChange={(e) => setShowScript(e.target.checked)} />
              <span>Show script</span>
            </label>

            <button
              className="btn btn-ghost"
              onClick={() => {
                try {
                  noteBuzz(navigator.vibrate(200))
                } catch {
                  noteBuzz(false)
                }
              }}
            >
              Test vibration
            </button>
            {(() => {
              const lb = lastBuzz()
              const res = !lb ? 'not tried yet' : lb.result === 'ok' ? 'true' : 'false'
              return (
                <div className="vib-diag">
                  <div>
                    Vibration API: <b>{hasVibrationApi() ? 'yes' : 'no'}</b>
                  </div>
                  <div>
                    Last call: <b>{res}</b>
                  </div>
                  {lb && lb.result !== 'ok' && (
                    <div className="vib-warn">Your phone blocked vibration. Check silent mode, Do Not Disturb or battery saver.</div>
                  )}
                  <div className="muted">The game works the same without vibration.</div>
                </div>
              )
            })()}
            {!wakeOk && <div className="cue-wake">💡 Keep your screen on during the activity.</div>}
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
