import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import PolyBackground from '../components/PolyBackground'
import Tutorial from '../components/Tutorial'
import { POWERS } from '../data/cards'
import { randomProfileLine, sanitizeProfileLine } from '../data/profiles'
import { randomAvatar, sanitizeAvatar } from '../lib/avatar'
import { roundConfig, TOTAL_ROUNDS } from '../lib/game'
import { mainTopic, normalizeCode, openChannel, playerTopic, type Room } from '../lib/room'
import { isSfxOn, playSfx, setSfxOn, unlockAudio } from '../lib/sfx'
import { getPlayerId, load, save } from '../lib/storage'
import type {
  AvatarConfig,
  CatchMsg,
  GameState,
  GrantEvent,
  MissMsg,
  PlayerInfo,
  PowerId,
  PresenceMeta,
  SabotageEvent,
  Tick,
} from '../lib/types'
import Editor from '../player/Editor'
import PlayerGame, { type GameFeedback } from '../player/PlayerGame'

interface Profile {
  name: string
  avatar: AvatarConfig | null
  bio?: string
  room: string
  ready: boolean
}

type Step = 'join' | 'editor' | 'room'

const NAME_MAX = 12
const DEMO_NAMES = ['Mia', 'Leo', 'Zoe', 'Max', 'Ivy', 'Sam', 'Noa', 'Kai', 'Lu', 'Rio', 'Ana', 'Teo']
const pickDemoName = () => DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)]

/**
 * Two players can't have the same name: if somebody who joined earlier
 * (smaller id) already uses mine, I take the next free number ("Ana2").
 */
export function uniqueName(name: string, me: string, others: { id: string; name: string }[]): string {
  const base = name.trim().slice(0, NAME_MAX) || 'Player'
  const taken = new Set(others.filter((o) => o.id !== me).map((o) => o.name.toLowerCase()))
  const clash = others.some((o) => o.id < me && o.name.toLowerCase() === base.toLowerCase())
  if (!clash) return base
  for (let n = 2; n < 100; n++) {
    const suffix = String(n)
    const candidate = base.slice(0, NAME_MAX - suffix.length) + suffix
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
  return base
}

function useLockedScreen() {
  useEffect(() => {
    document.documentElement.classList.add('lock')
    const stop = (e: Event) => e.preventDefault()
    document.addEventListener('gesturestart', stop)
    document.addEventListener('dblclick', stop)
    return () => {
      document.documentElement.classList.remove('lock')
      document.removeEventListener('gesturestart', stop)
      document.removeEventListener('dblclick', stop)
    }
  }, [])
}

export default function Play() {
  useLockedScreen()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const slot = params.get('pid') ? `.${params.get('pid')}` : ''
  // bot player: used by /dev/bots and by the projector's demo mode (works in production too)
  const bot = params.get('bot') === '1'
  const demo = params.get('demo') === '1'
  const me = useMemo(() => getPlayerId(slot), [slot])
  const saved = useMemo(() => load<Profile | null>('gr.profile' + slot, null), [slot])

  const urlRoom = normalizeCode(params.get('room'))
  const [room, setRoom] = useState(urlRoom || saved?.room || '')
  const [name, setName] = useState(
    saved?.name ?? (bot ? (demo ? pickDemoName() : `Bot ${slot.replace(/\D/g, '')}`) : '')
  )
  // came from the QR / a link with ?room=: the code is fixed ("Not your room?" unlocks it)
  const [editRoom, setEditRoom] = useState(!urlRoom)
  // sanitizeAvatar turns old (polygon) saves into a new random person
  const [avatar, setAvatar] = useState<AvatarConfig>(() => (saved?.avatar ? sanitizeAvatar(saved.avatar) : randomAvatar()))
  const [bio, setBio] = useState<string>(() => (saved?.bio ? sanitizeProfileLine(saved.bio) : randomProfileLine()))
  const [ready, setReady] = useState(bot || Boolean(saved?.ready && saved.room === room && saved.avatar))
  const [step, setStep] = useState<Step>(() => {
    if (bot && room) return 'room'
    if (!room || !name) return 'join'
    if (saved?.ready && saved.room === room && saved.avatar) return 'room'
    return 'editor'
  })

  useEffect(() => {
    save('gr.profile' + slot, { name, avatar, bio, room, ready } satisfies Profile)
    if (room) save('gr.lastRoom', room)
  }, [name, avatar, bio, room, ready, slot])

  const submitJoin = (e: FormEvent) => {
    e.preventDefault()
    const c = normalizeCode(room)
    const n = name.trim().slice(0, NAME_MAX)
    if (c.length !== 4 || !n) return
    setRoom(c)
    setName(n)
    nav(`/play?room=${c}${slot ? `&pid=${slot.slice(1)}` : ''}`, { replace: true })
    setStep('editor')
  }

  if (step === 'join') {
    return (
      <div className="screen center play-screen">
        <PolyBackground />
        <form className="panel join-panel" onSubmit={submitJoin}>
          <h1 className="title-sm">Join the game</h1>
          {editRoom ? (
            <>
              <label className="label" htmlFor="room">
                Room code
              </label>
              <input
                id="room"
                className="input code-input"
                value={room}
                onChange={(e) => setRoom(normalizeCode(e.target.value))}
                placeholder="ABCD"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={4}
                autoFocus={!room}
              />
            </>
          ) : (
            <div className="room-locked">
              <span>
                Room <b>{room}</b>
              </span>
              <button type="button" className="link-btn" onClick={() => setEditRoom(true)}>
                Not your room?
              </button>
            </div>
          )}
          <label className="label" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
            placeholder="Your name"
            autoComplete="nickname"
            enterKeyHint="go"
            autoFocus={!editRoom || room.length === 4}
            maxLength={NAME_MAX}
          />
          <button className="btn btn-green btn-big" disabled={normalizeCode(room).length !== 4 || !name.trim()}>
            Next: build your character
          </button>
        </form>
      </div>
    )
  }

  if (step === 'editor') {
    return (
      <div className="screen play-screen">
        <PolyBackground variant="dark" />
        <Editor
          name={name}
          initial={avatar}
          initialBio={bio}
          onChange={(a, b) => {
            setAvatar(a)
            setBio(b)
          }}
          onReady={(a, b) => {
            // fullscreen hides the browser bar (needs this tap; failing is fine)
            try {
              document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {})
            } catch {
              /* not supported (iPhone) */
            }
            setAvatar(a)
            setBio(b)
            setReady(true)
            setStep('room')
          }}
        />
      </div>
    )
  }

  return (
    <PlayerRoom
      me={me}
      code={room}
      name={name}
      avatar={avatar}
      bio={bio}
      ready={ready}
      bot={bot}
      onRename={setName}
      onEdit={() => {
        setReady(false)
        setStep('editor')
      }}
      onLeave={() => {
        setReady(false)
        setStep('join')
      }}
    />
  )
}

// ---------------------------------------------------------------------------

interface RoomProps {
  me: string
  code: string
  name: string
  avatar: AvatarConfig
  bio: string
  ready: boolean
  bot: boolean
  onRename: (name: string) => void
  onEdit: () => void
  onLeave: () => void
}

/** Milliseconds left of an admin countdown, ticking locally between state messages. */
function useCountdown(ms: number | undefined, seq: number | undefined, paused = false) {
  const [base, setBase] = useState({ ms: ms ?? 0, at: performance.now() })
  const [, force] = useState(0)
  useEffect(() => {
    setBase({ ms: ms ?? 0, at: performance.now() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq])
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [])
  const left = paused ? base.ms : base.ms - (performance.now() - base.at)
  return Math.max(0, left)
}

function PlayerRoom({ me, code, name, avatar, bio, ready, bot, onRename, onEdit, onLeave }: RoomProps) {
  const [status, setStatus] = useState('connecting')
  const [state, setState] = useState<GameState | null>(null)
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [adminOnline, setAdminOnline] = useState(false)
  const [sabotage, setSabotage] = useState<SabotageEvent | null>(null)
  const [grant, setGrant] = useState<GrantEvent | null>(null)
  const [toast, setToast] = useState<{ text: string; color: string; key: number } | null>(null)
  const [pendingPowers, setPendingPowers] = useState<PowerId[]>([])
  const [tilt, setTilt] = useState(false)
  const [votedKey, setVotedKey] = useState<string | null>(null)
  const [htVote, setHtVote] = useState<{ key: string; vote: 'red' | 'green' } | null>(null)
  const [soundOn, setSound] = useState(isSfxOn())
  const mainRef = useRef<Room | null>(null)
  const mineRef = useRef<Room | null>(null)
  const lastSeq = useRef(-1)

  const playersRef = useRef(players)
  playersRef.current = players

  // no repeated names in the room: whoever joined later gets a number
  useEffect(() => {
    if (!players.length) return
    const u = uniqueName(name, me, players)
    if (u !== name) onRename(u)
  }, [players, name, me, onRename])

  const nameOf = useCallback(
    (id: string) => (id === me ? 'you' : playersRef.current.find((p) => p.id === id)?.name ?? 'Someone'),
    [me]
  )

  const showToast = useCallback((text: string, color: string) => {
    setToast({ text, color, key: Date.now() + Math.random() })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // connect
  useEffect(() => {
    const main = openChannel(mainTopic(code), { presenceKey: me, onStatus: setStatus })
    const mine = openChannel(playerTopic(code, me))
    mainRef.current = main
    mineRef.current = mine

    main.on<GameState>('state', (s) => {
      if (s.seq < lastSeq.current && s.seq > 2) return
      lastSeq.current = s.seq
      setState(s)
    })
    main.on<SabotageEvent>('sabotage', (ev) => setSabotage(ev))
    main.on<GrantEvent>('grant', (ev) => {
      if (ev.to === me) setGrant(ev)
    })
    main.on('reset', () => {
      lastSeq.current = -1
      setState(null)
    })
    main.channel.on('presence', { event: 'sync' }, () => {
      const ps = main.channel.presenceState<PresenceMeta>()
      const list: PlayerInfo[] = []
      let admin = false
      for (const metas of Object.values(ps)) {
        const m = metas[metas.length - 1]
        if (!m) continue
        if (m.role === 'admin') admin = true
        else if (m.role === 'player' && m.avatar)
          list.push({ id: m.id, name: m.name, avatar: sanitizeAvatar(m.avatar), bio: sanitizeProfileLine(m.bio), ready: m.ready, online: true, bot: m.bot })
      }
      setAdminOnline(admin)
      setPlayers(list)
    })
    main.subscribe(() => {
      main.channel.track({ role: 'player', id: me, name, avatar, bio, ready, bot }).catch(() => {})
      main.send('hello', { id: me })
    })
    mine.subscribe()

    return () => {
      main.close()
      mine.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, me])

  // keep presence up to date
  useEffect(() => {
    const main = mainRef.current
    if (main?.ready) main.channel.track({ role: 'player', id: me, name, avatar, bio, ready, bot }).catch(() => {})
  }, [name, avatar, bio, ready, me, status, bot])

  // re-sync when the phone wakes up
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') mainRef.current?.send('hello', { id: me })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [me])

  const sendTick = useCallback((t: Tick) => mineRef.current?.send('tick', t), [])
  const sendCatch = useCallback((m: CatchMsg) => mineRef.current?.send('catch', m), [])
  const sendMiss = useCallback((m: MissMsg) => mineRef.current?.send('miss', m), [])
  const gotPower = useCallback((p: PowerId) => setPendingPowers((list) => [...list, p]), [])

  useEffect(() => {
    document.addEventListener('pointerdown', unlockAudio)
    return () => document.removeEventListener('pointerdown', unlockAudio)
  }, [])

  const onFeedback = useCallback(
    (f: GameFeedback) => {
      switch (f.type) {
        case 'green':
          playSfx(f.streak === 3 ? 'combo' : 'green', { level: Math.min(f.streak, 3) })
          break
        case 'countdown':
          playSfx(f.n > 0 ? 'countdown' : 'go')
          break
        case 'power':
          playSfx(f.power === 'therapy' ? 'shield' : 'announce')
          break
        case 'shield-used':
          playSfx('shield')
          break
        case 'sabotaged':
          playSfx('sabotage')
          break
        case 'heartbroken-over':
          playSfx('soulmate')
          break
        case 'end':
          playSfx('roundEnd')
          break
        default:
          playSfx(f.type)
      }
      if (f.type === 'sabotaged') {
        const p = POWERS[f.power]
        showToast(`${nameOf(f.from)} used ${p.name.toUpperCase()} on you! ${p.emoji}`, p.color)
      } else if (f.type === 'shield-used') {
        showToast(`🛡️ Therapy blocked ${nameOf(f.from)}'s sabotage!`, '#0891b2')
      } else if (f.type === 'power' && f.power === 'therapy') {
        showToast('🛡️ Therapy! The next sabotage will bounce off.', '#0891b2')
      } else if (f.type === 'red' && f.broke) {
        showToast('💔 Heartbroken! Wait 10 seconds...', '#ff3b5c')
      } else if (f.type === 'heartbroken-over') {
        showToast('❤️ You are back! 1 heart left.', '#22c55e')
      }
    },
    [nameOf, showToast]
  )

  const sendPower = (to: string) => {
    const power = pendingPowers[0]
    if (!power) return
    mineRef.current?.send('power', { from: me, to, power })
    setPendingPowers((list) => list.slice(1))
    const p = POWERS[power]
    showToast(`You used ${p.name.toUpperCase()} on ${nameOf(to)}! ${p.emoji}`, p.color)
  }

  const enableTilt = async () => {
    if (tilt) {
      setTilt(false)
      return
    }
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
    try {
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission()
        if (res !== 'granted') {
          showToast('Tilt permission denied. Use the buttons!', '#ff3b5c')
          return
        }
      }
      setTilt(true)
    } catch {
      showToast('Tilt is not available on this device.', '#ff3b5c')
    }
  }

  const others = players.filter((p) => p.id !== me)
  const phase = state?.phase
  const roundPhase = phase === 'playing' || phase === 'defense' || phase === 'roundEnd'
  // joined after the round started: wait for the next one
  const waitingNext = Boolean(state && roundPhase && state.round > 0 && !(state.roundIds ?? []).includes(me))
  const inRound = state && roundPhase && state.round > 0 && !waitingNext
  const defense = state?.defense ?? null
  const autoLeft = useCountdown(state?.auto?.remaining, state?.seq, state?.auto?.paused)
  const stageLeft = useCountdown(defense?.remaining, state?.seq)
  const tutorialLeft = useCountdown(state?.tutorialLeft, state?.seq)
  const hot = state?.hotTake ?? null
  const htLeft = useCountdown(hot?.remaining, state?.seq)

  // auto-pick a random target if the player does not choose in time
  useEffect(() => {
    if (!pendingPowers.length) return
    const t = setTimeout(() => {
      const list = playersRef.current.filter((p) => p.id !== me)
      if (list.length) sendPower(list[Math.floor(Math.random() * list.length)].id)
      else setPendingPowers((l) => l.slice(1))
    }, bot ? 600 + Math.random() * 1500 : 7000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPowers])

  // drop pending powers when the round is not being played
  useEffect(() => {
    if (phase && phase !== 'playing' && phase !== 'defense') setPendingPowers([])
  }, [phase])

  // bots vote randomly after a short delay
  useEffect(() => {
    if (!bot || !defense || defense.stage !== 'vote' || defense.playerId === me || votedKey === defense.key) return
    const key = defense.key
    const t = setTimeout(() => {
      mineRef.current?.send('vote', { id: me, vote: Math.random() < 0.55 ? 'convinced' : 'not', defenseKey: key })
      setVotedKey(key)
    }, 500 + Math.random() * 3000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot, defense?.key, defense?.stage, me, votedKey])

  const voteHotTake = (v: 'red' | 'green') => {
    if (!hot) return
    mineRef.current?.send('htvote', { id: me, key: hot.key, vote: v })
    setHtVote({ key: hot.key, vote: v })
    playSfx('vote')
  }

  // bots vote the Hot Take randomly too
  useEffect(() => {
    if (!bot || !hot || hot.stage !== 'vote' || htVote?.key === hot.key) return
    const key = hot.key
    const t = setTimeout(() => {
      const v = Math.random() < 0.5 ? 'red' : 'green'
      mineRef.current?.send('htvote', { id: me, key, vote: v })
      setHtVote({ key, vote: v })
    }, 800 + Math.random() * 4000)
    return () => clearTimeout(t)
    // only restart the timer when a new Hot Take vote starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot, hot?.key, hot?.stage, htVote?.key, me])

  const vote = (v: 'convinced' | 'not') => {
    if (!defense) return
    mineRef.current?.send('vote', { id: me, vote: v, defenseKey: defense.key })
    setVotedKey(defense.key)
  }

  // "Turn your phone" (CSS shows it only on landscape phones while this class is on)
  const gameOn = Boolean(inRound && (phase === 'playing' || phase === 'defense')) || phase === 'tutorial'
  useEffect(() => {
    document.documentElement.classList.toggle('in-game', gameOn)
    return () => document.documentElement.classList.remove('in-game')
  }, [gameOn])

  const myTotal = state ? Math.round((state.totals[me] ?? 0) + (state.roundScores[me] ?? 0)) : 0
  const ranking = state
    ? Object.keys({ ...state.totals, ...state.roundScores })
        .map((id) => ({ id, score: (state.totals[id] ?? 0) + (state.roundScores[id] ?? 0) }))
        .sort((a, b) => b.score - a.score)
    : []
  const myPlace = ranking.findIndex((r) => r.id === me) + 1
  const myAwards = state?.awards?.filter((a) => a.playerId === me) ?? []

  return (
    <div className="screen play-screen">
      <PolyBackground variant="dark" />

      {inRound && state ? (
        <PlayerGame
          key={`${state.round}-${state.seed}`}
          me={me}
          avatar={avatar}
          state={state}
          sabotage={sabotage}
          grant={grant}
          tilt={tilt}
          bot={bot}
          onTick={sendTick}
          onCatch={sendCatch}
          onMiss={sendMiss}
          onPower={gotPower}
          onFeedback={onFeedback}
        />
      ) : phase === 'tutorial' ? (
        <Tutorial secondsLeft={Math.ceil(tutorialLeft / 1000)} compact />
      ) : (
        <div className="wait-view">
          <div className="wait-top">
            <span className="chip">Room {code}</span>
            <span className={`dot ${status === 'SUBSCRIBED' ? 'on' : ''}`} />
          </div>
          {phase === 'podium' || phase === 'awards' || phase === 'final' ? (
            <div className="wait-center">
              <div className="big-place">#{myPlace || '-'}</div>
              <Avatar config={avatar} size={150} pose={myPlace === 1 ? 'dance' : myPlace <= 3 ? 'cheer' : 'idle'} />
              <h2 className="wait-title">{myPlace === 1 ? 'You won!' : 'Game over!'}</h2>
              <p className="muted">Final score: {myTotal}. Look at the big screen!</p>
              {myAwards.map((a) => (
                <div key={a.id} className="my-award">
                  {a.emoji} {a.title}
                </div>
              ))}
            </div>
          ) : (
            <div className="wait-center">
              <Avatar config={avatar} size={170} pose="idle" />
              <h2 className="wait-title">{name}</h2>
              <div className="wait-bio">“{bio}”</div>
              <p className="muted">
                {status !== 'SUBSCRIBED'
                  ? 'Connecting...'
                  : !adminOnline
                    ? 'Waiting for the host to open the room...'
                    : waitingNext
                      ? '⏳ Joining next round… watch the big screen!'
                      : "You're in! Look for your dating profile on the big screen."}
              </p>
              <div className="wait-actions">
                <button className="btn btn-ghost" onClick={onEdit}>
                  Edit character
                </button>
                <button className="btn btn-ghost small" onClick={onLeave}>
                  Change room
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {inRound && phase === 'playing' && (
        <button className={`tilt-btn ${tilt ? 'on' : ''}`} onClick={enableTilt}>
          📱 Tilt {tilt ? 'ON' : 'OFF'}
        </button>
      )}
      <button
        className={`sound-btn ${inRound ? 'in-game' : ''}`}
        onClick={() => {
          unlockAudio()
          setSfxOn(!soundOn)
          setSound(!soundOn)
        }}
        aria-label={soundOn ? 'Mute sounds' : 'Turn sounds on'}
      >
        {soundOn ? '🔊' : '🔇'}
      </button>

      {/* sabotage target picker */}
      {pendingPowers.length > 0 && phase === 'playing' && (
        <div className="sheet power-sheet">
          <div className="sheet-title" style={{ color: POWERS[pendingPowers[0]].color }}>
            {POWERS[pendingPowers[0]].emoji} {POWERS[pendingPowers[0]].name}! Who gets it?
          </div>
          <div className="target-list">
            {others.length === 0 && <p className="muted">Nobody else is here...</p>}
            {others.map((p) => (
              <button key={p.id} className="target" onClick={() => sendPower(p.id)}>
                <Avatar config={p.avatar} size={40} crop="head" animate={false} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* defense overlay */}
      {phase === 'defense' && defense && (
        <div className="overlay defense-phone">
          {defense.playerId === me ? (
            <div className="defense-me">
              <div className="chip red">Red flag!</div>
              <Avatar
                config={avatar}
                size={110}
                pose={defense.stage === 'result' ? (defense.result === 'convinced' ? 'cheer' : 'cry') : 'scared'}
              />
              <p className="quote">“{defense.text}”</p>
              {defense.stage === 'talk' && (
                <>
                  <h2 className="shout">Defend yourself! {Math.ceil(stageLeft / 1000)}s</h2>
                  <p className="starter">Start with: “{defense.starter}”</p>
                </>
              )}
              {defense.stage === 'vote' && <h2 className="shout">The others are voting... {Math.ceil(stageLeft / 1000)}s</h2>}
              {defense.stage === 'result' && <DefenseResult defense={defense} mine />}
            </div>
          ) : (
            <div className="defense-other">
              <div className="chip red">{defense.name} caught a red flag</div>
              <p className="quote">“{defense.text}”</p>
              {defense.stage === 'talk' && (
                <h2 className="shout">
                  Listen to {defense.name}&apos;s defense... {Math.ceil(stageLeft / 1000)}s
                </h2>
              )}
              {defense.stage === 'vote' &&
                (votedKey === defense.key ? (
                  <h2 className="shout">Vote sent! ✔</h2>
                ) : (
                  <div className="vote-buttons">
                    <div className="vote-timer">{Math.ceil(stageLeft / 1000)}s to vote</div>
                    <button className="btn btn-green btn-huge" onClick={() => vote('convinced')}>
                      👍 Convinced
                    </button>
                    <button className="btn btn-red btn-huge" onClick={() => vote('not')}>
                      👎 Not convinced
                    </button>
                  </div>
                ))}
              {defense.stage === 'result' && <DefenseResult defense={defense} />}
            </div>
          )}
          {state?.auto && (
            <div className="auto-line">
              {state.auto.paused ? '⏸ ' : ''}
              {state.auto.label} in {Math.ceil(autoLeft / 1000)}s
            </div>
          )}
        </div>
      )}

      {/* hot take */}
      {phase === 'hotTake' && hot && (
        <div className="overlay hottake-phone">
          <div className="chip">🔥 Hot Take</div>
          <p className="quote ht-phone-text">“{hot.text}”</p>
          {hot.stage === 'vote' &&
            (htVote?.key === hot.key ? (
              <h2 className="shout">
                You voted {htVote.vote === 'red' ? '🟥 RED' : '🟩 GREEN'}. Secret until the reveal!
              </h2>
            ) : (
              <div className="vote-buttons">
                <div className="vote-timer">Red or green? {Math.ceil(htLeft / 1000)}s</div>
                <button className="btn btn-red btn-huge" onClick={() => voteHotTake('red')}>
                  🟥 RED FLAG
                </button>
                <button className="btn btn-green btn-huge" onClick={() => voteHotTake('green')}>
                  🟩 GREEN FLAG
                </button>
              </div>
            ))}
          {hot.stage !== 'vote' && (
            <div className="ht-phone-result">
              <div className="ht-bar">
                <div className="ht-bar-red" style={{ width: `${hot.pctRed ?? 0}%` }}>
                  {hot.pctRed}% red
                </div>
                <div className="ht-bar-green">{100 - (hot.pctRed ?? 0)}% green</div>
              </div>
              {htVote?.key === hot.key && <p className="muted">You voted {htVote.vote.toUpperCase()}.</p>}
              {hot.stage === 'speaker' && (
                <h2 className="shout">
                  {hot.speaker === me ? '🎤 Your turn! Explain your vote.' : `🎤 ${nameOf(hot.speaker ?? '')} has the word`}
                </h2>
              )}
              {hot.stage === 'verdict' && <h2 className="shout">👑 Listen to the host&apos;s verdict</h2>}
              {hot.stage === 'reveal' && <h2 className="shout">Look at the big screen!</h2>}
            </div>
          )}
        </div>
      )}

      {/* round end */}
      {phase === 'roundEnd' && state && (
        <div className="overlay round-end-phone">
          <div className="chip">
            Round {state.round} of {TOTAL_ROUNDS} · {roundConfig(state.round).name}
          </div>
          <Avatar config={avatar} size={110} pose={myPlace === 1 ? 'dance' : 'idle'} />
          <p className="big-score">{myTotal} pts</p>
          <p className="muted">
            You are #{myPlace || '-'} · {state.hearts[me] ?? 5} ♥
          </p>
          {state.summary && (
            <div className="phone-question">
              <div className="label">Red flag of the round</div>
              {state.summary.topRed && <p className="quote">“{state.summary.topRed.text}”</p>}
              <p className="q">{state.summary.question}</p>
            </div>
          )}
          {state.auto && (
            <div className="auto-line">
              {state.auto.paused ? '⏸ ' : ''}
              {state.auto.label} in {Math.ceil(autoLeft / 1000)}s
            </div>
          )}
        </div>
      )}

      <div className="rotate-warning" role="alert">
        <div className="rotate-phone" aria-hidden="true" />
        <div>Turn your phone</div>
        <div className="muted small">The game works best upright</div>
      </div>

      {toast && (
        <div className="toast" key={toast.key} style={{ background: toast.color }}>
          {toast.text}
        </div>
      )}
    </div>
  )
}

function DefenseResult({ defense, mine }: { defense: NonNullable<GameState['defense']>; mine?: boolean }) {
  const ok = defense.result === 'convinced'
  return (
    <div className={`result ${ok ? 'ok' : 'bad'}`}>
      <h2>{ok ? 'Convinced!' : 'Not convinced!'}</h2>
      <p>
        👍 {defense.convinced ?? 0} · 👎 {defense.notConvinced ?? 0}
      </p>
      <p className="muted">
        {ok
          ? mine
            ? 'You get your heart and points back.'
            : 'They get their heart and points back.'
          : mine
            ? 'You lose 100 extra points 💸'
            : 'They lose 100 extra points 💸'}
      </p>
    </div>
  )
}
