import { useCallback, useEffect, useRef, useState } from 'react'
import { DISCUSSION_QUESTIONS, HOT_TAKES } from '../data/cards'
import { sanitizeProfileLine } from '../data/profiles'
import { sanitizeAvatar } from '../lib/avatar'
import {
  AWARD_DEFS,
  AWARD_SHOW_MS,
  COUNTDOWN_MS,
  DEFENSE_AFTER_MS,
  DEFENSE_FAIL_PENALTY,
  DEFENSE_RESUME_MS,
  DEFENSE_TALK_MS,
  DEFENSE_VOTE_MS,
  HOTTAKE_AFTER_ROUNDS,
  HOTTAKE_SPEAKER_MS,
  HOTTAKE_VOTE_MS,
  MAX_STREAK_LEVEL,
  OBJECTION_MS,
  RED_PENALTY,
  ROUND_RESULTS_MS,
  roundConfig,
  START_HEARTS,
  TOTAL_ROUNDS,
  TUTORIAL_MS,
} from '../lib/game'
import {
  HOST_PASSWORD,
  hostTopic,
  loginProof,
  randomHex,
  xorToken,
  type HostAuthMsg,
  type HostCmd,
  type HostLoginMsg,
} from '../lib/host'
import { randomSeed } from '../lib/rng'
import { mainTopic, openChannel, playerTopic, type Room } from '../lib/room'
import type { Sfx } from '../lib/sfx'
import { load, save } from '../lib/storage'
import type {
  Award,
  CatchMsg,
  Defense,
  FinalStats,
  GameState,
  GrantEvent,
  HostInfo,
  HotTake,
  HotTakeVoteMsg,
  MissMsg,
  Phase,
  PlayerInfo,
  PodiumStats,
  PowerMsg,
  PresenceMeta,
  RoundSummary,
  SabotageEvent,
  ScriptData,
  Tick,
  VoteMsg,
} from '../lib/types'

export const DEFENSE_STARTERS = [
  "It's not that bad because...",
  'In my culture...',
  'Maybe they just...',
  'To be fair...',
  'I can explain! You see...',
  'Some people think so, but...',
]

export interface TickBuffer {
  prev: Tick | null
  prevAt: number
  cur: Tick | null
  curAt: number
}

/** A catch seen by the admin, used for particles on the mini screens. */
export interface CatchFx {
  pid: string
  kind: CatchMsg['kind']
  at: number
  cardId: number
  /** full sentence of the caught card */
  text?: string
}

export interface Announcement {
  key: number
  text: string
  sub?: string
  color: string
  sfx: Sfx
}

interface AdminDefense extends Defense {
  stageEndsAt: number
  votes: Record<string, 'convinced' | 'not'>
}

interface AdminHotTake extends HotTake {
  stageEndsAt: number
  votes: Record<string, 'red' | 'green'>
}

type AutoAction = 'resume' | 'nextRound' | 'hotTake' | 'awards' | 'podium'
interface AdminAuto {
  label: string
  endsAt: number
  paused: boolean
  pausedLeft: number
  action: AutoAction
}

type Counter = Record<string, number>

export interface AdminGame {
  phase: Phase
  round: number
  seed: number
  gameSeed: number
  running: boolean
  clockBase: number
  clockAt: number
  totals: Record<string, number>
  roundScores: Record<string, number>
  hearts: Record<string, number>
  defense: AdminDefense | null
  defenseDone: boolean
  hotTake: AdminHotTake | null
  hotTakesUsed: string[]
  hotTakesDone: ScriptData['hotTakes']
  auto: AdminAuto | null
  tutorialEndsAt: number
  last10Round: number
  summary?: RoundSummary
  awards?: Award[]
  stats?: PodiumStats
  finalStats?: FinalStats
  players: Record<string, PlayerInfo>
  counters: { reds: Counter; sent: Counter; received: Counter; icks: Counter; lawyer: Counter }
  redStats: Record<string, string[]>
  missStats: Record<string, string[]>
  roundRed: Record<string, string[]>
  roundMiss: Record<string, string[]>
  greyReds: { id: string; text: string }[]
  sabotagePairs: Record<string, Record<string, number>>
  roundIds: string[]
  createdAt: number
  /** tokens of logged-in hosts (kept on reload) */
  hostTokens: string[]
  seq: number
}

type Snapshot = Omit<AdminGame, 'defense' | 'hotTake' | 'clockAt' | 'running' | 'seq' | 'auto' | 'tutorialEndsAt'> & {
  code: string
  savedAt: number
}

const SNAP_KEY = 'gr.admin'

function emptyCounters(): AdminGame['counters'] {
  return { reds: {}, sent: {}, received: {}, icks: {}, lawyer: {} }
}

function freshGame(keep?: Pick<AdminGame, 'createdAt' | 'players' | 'hostTokens'>): AdminGame {
  return {
    phase: 'intro',
    round: 0,
    seed: 1,
    gameSeed: 1,
    running: false,
    clockBase: 0,
    clockAt: 0,
    totals: {},
    roundScores: {},
    hearts: {},
    defense: null,
    defenseDone: false,
    hotTake: null,
    hotTakesUsed: [],
    hotTakesDone: [],
    auto: null,
    tutorialEndsAt: 0,
    last10Round: 0,
    players: keep?.players ?? {},
    counters: emptyCounters(),
    redStats: {},
    missStats: {},
    roundRed: {},
    roundMiss: {},
    greyReds: [],
    sabotagePairs: {},
    roundIds: [],
    createdAt: keep?.createdAt ?? Date.now(),
    hostTokens: keep?.hostTokens ?? [],
    seq: 0,
  }
}

export function loadAdminSnapshot(): Snapshot | null {
  const s = load<Snapshot | null>(SNAP_KEY, null)
  if (!s || !s.code || Date.now() - s.savedAt > 12 * 3600 * 1000) return null
  return s
}

export function clearAdminSnapshot() {
  save(SNAP_KEY, null)
}

function gameFromSnapshot(s: Snapshot | null): AdminGame {
  const g = freshGame()
  if (!s || typeof s.gameSeed !== 'number' || !Array.isArray(s.hostTokens)) return g
  Object.assign(g, s)
  // a reload during a defense/tutorial/hot take comes back paused in a safe phase
  if (s.phase === 'defense') g.phase = 'playing'
  if (s.phase === 'tutorial') g.phase = 'lobby'
  if (s.phase === 'hotTake') g.phase = 'roundEnd'
  g.counters = { ...emptyCounters(), ...(s.counters ?? {}) }
  g.running = false
  g.defense = null
  g.hotTake = null
  g.auto = null
  for (const p of Object.values(g.players)) {
    p.online = false
    p.avatar = sanitizeAvatar(p.avatar)
    p.bio = sanitizeProfileLine(p.bio)
  }
  return g
}

function topOf(map: Record<string, string[]>) {
  let best: { text: string; count: number } | undefined
  for (const [text, ids] of Object.entries(map)) {
    if (!best || ids.length > best.count) best = { text, count: ids.length }
  }
  return best
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const inc = (c: Counter, id: string, n = 1) => (c[id] = (c[id] ?? 0) + n)
const addId = (map: Record<string, string[]>, text: string, id: string) => {
  const list = (map[text] ??= [])
  if (!list.includes(id)) list.push(id)
}
const toList = (map: Record<string, string[]>) => Object.entries(map).map(([text, ids]) => ({ text, ids }))

export function useAdminGame(code: string) {
  const [initial] = useState(() => {
    const snap = loadAdminSnapshot()
    return gameFromSnapshot(snap?.code === code ? snap : null)
  })
  const g = useRef<AdminGame>(initial)
  const ticks = useRef<Record<string, TickBuffer>>({})
  const catchFx = useRef<CatchFx[]>([])
  const main = useRef<Room | null>(null)
  const playerRooms = useRef<Record<string, Room>>({})
  const hostRooms = useRef<Record<string, Room>>({})
  const [version, setVersion] = useState(0)
  const [status, setStatus] = useState('connecting')
  const [sabotages, setSabotages] = useState<SabotageEvent[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [objectionKey, setObjectionKey] = useState(0)
  const [hostOnline, setHostOnline] = useState(false)
  const lastBroadcast = useRef(0)
  const lastHostInfo = useRef(0)
  const lastHostSeen = useRef(0)
  const lastSave = useRef(0)
  const lastToxic = useRef(0)
  const annKey = useRef(0)
  const loginAttempts = useRef<number[]>([])

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const announce = useCallback((text: string, color: string, sub?: string, sfx: Sfx = 'announce') => {
    setAnnouncements((list) => [...list, { key: annKey.current++, text, sub, color, sfx }].slice(-3))
  }, [])

  const elapsed = useCallback(() => {
    const s = g.current
    return s.clockBase + (s.running ? performance.now() - s.clockAt : 0)
  }, [])

  const persist = useCallback(
    (force = false) => {
      const now = Date.now()
      if (!force && now - lastSave.current < 1500) return
      lastSave.current = now
      const s = g.current
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { defense: _d, hotTake: _h, clockAt: _c, running: _r, seq: _s, auto: _a, tutorialEndsAt: _t, ...rest } = s
      const snap: Snapshot = {
        ...rest,
        code,
        savedAt: now,
        clockBase: Math.min(elapsed(), roundConfig(s.round).durationMs),
      }
      save(SNAP_KEY, snap)
    },
    [code, elapsed]
  )

  const buildState = useCallback((): GameState => {
    const s = g.current
    const d = s.defense
    const h = s.hotTake
    const now = performance.now()
    return {
      phase: s.phase,
      round: s.round,
      seed: s.seed,
      gameSeed: s.gameSeed,
      running: s.running,
      elapsed: Math.round(elapsed()),
      totals: s.totals,
      roundScores: s.roundScores,
      hearts: s.hearts,
      seq: s.seq,
      roundIds: s.roundIds,
      summary: s.summary,
      awards: s.awards,
      stats: s.stats,
      finalStats: s.finalStats,
      tutorialLeft: s.phase === 'tutorial' ? Math.max(0, s.tutorialEndsAt - now) : undefined,
      auto: s.auto
        ? { label: s.auto.label, paused: s.auto.paused, remaining: s.auto.paused ? s.auto.pausedLeft : Math.max(0, s.auto.endsAt - now) }
        : null,
      defense: d
        ? {
            key: d.key,
            playerId: d.playerId,
            name: d.name,
            text: d.text,
            stage: d.stage,
            starter: d.starter,
            remaining: Math.max(0, d.stageEndsAt - now),
            votesIn: Object.keys(d.votes).length,
            votesNeeded: d.votesNeeded,
            convinced: d.convinced,
            notConvinced: d.notConvinced,
            result: d.result,
            objections: d.objections,
          }
        : null,
      hotTake: h
        ? {
            key: h.key,
            text: h.text,
            stage: h.stage,
            remaining: Math.max(0, h.stageEndsAt - now),
            votesIn: Object.keys(h.votes).length,
            votesNeeded: h.votesNeeded,
            red: h.red,
            green: h.green,
            pctRed: h.pctRed,
            speaker: h.speaker,
          }
        : null,
    }
  }, [elapsed])

  const sendHostInfo = useCallback(
    (state: GameState, force = false) => {
      const rooms = Object.values(hostRooms.current)
      if (!rooms.length) return
      const now = performance.now()
      if (!force && now - lastHostInfo.current < 300) return
      lastHostInfo.current = now
      const s = g.current
      const pairs: ScriptData['sabotages'] = []
      for (const [from, tos] of Object.entries(s.sabotagePairs)) for (const [to, n] of Object.entries(tos)) pairs.push({ from, to, n })
      const info: HostInfo = {
        state,
        activityMs: Date.now() - s.createdAt,
        players: Object.values(s.players).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, bio: p.bio, online: p.online, ready: p.ready })),
        script: {
          roundRed: toList(s.roundRed),
          roundMiss: toList(s.roundMiss),
          greyReds: s.greyReds,
          sabotages: pairs,
          hotTakes: s.hotTakesDone,
          activeIds: s.roundIds,
          reds: s.counters.reds,
        },
      }
      for (const r of rooms) r.send('hostinfo', info)
    },
    []
  )

  const broadcast = useCallback(() => {
    const s = g.current
    s.seq++
    const state = buildState()
    main.current?.send('state', state)
    lastBroadcast.current = performance.now()
    sendHostInfo(state)
    persist()
  }, [buildState, persist, sendHostInfo])

  const commit = useCallback(() => {
    bump()
    broadcast()
  }, [bump, broadcast])

  // --- clock helpers ---
  const freeze = () => {
    const s = g.current
    s.clockBase = elapsed()
    s.running = false
  }
  const resume = () => {
    const s = g.current
    s.clockAt = performance.now()
    s.running = true
  }
  const setAuto = (label: string, ms: number, action: AutoAction) => {
    g.current.auto = { label, endsAt: performance.now() + ms, paused: false, pausedLeft: ms, action }
  }

  const onlinePlayers = () => Object.values(g.current.players).filter((p) => p.online)

  const commitRoundScores = () => {
    const s = g.current
    for (const [id, v] of Object.entries(s.roundScores)) s.totals[id] = (s.totals[id] ?? 0) + v
    s.roundScores = {}
  }

  // --- flow ---
  const openLobby = () => {
    const s = g.current
    if (s.phase !== 'intro') return
    s.phase = 'lobby'
    commit()
  }

  const startRound = () => {
    const s = g.current
    if (s.round >= TOTAL_ROUNDS) return
    commitRoundScores()
    s.round++
    s.seed = randomSeed()
    s.defenseDone = false
    s.defense = null
    s.hotTake = null
    s.auto = null
    s.summary = undefined
    s.roundRed = {}
    s.roundMiss = {}
    s.greyReds = []
    s.phase = 'playing'
    s.roundIds = onlinePlayers().map((p) => p.id)
    for (const p of onlinePlayers()) {
      if (s.hearts[p.id] == null) s.hearts[p.id] = START_HEARTS
      if (s.totals[p.id] == null) s.totals[p.id] = 0
      s.roundScores[p.id] = 0
    }
    ticks.current = {}
    s.clockBase = -COUNTDOWN_MS
    resume()
    commit()
    persist(true)
  }

  const startGame = () => {
    const s = g.current
    if (s.phase !== 'lobby' && s.phase !== 'intro') return
    g.current = freshGame(s)
    g.current.gameSeed = randomSeed()
    g.current.phase = 'tutorial'
    g.current.tutorialEndsAt = performance.now() + TUTORIAL_MS
    ticks.current = {}
    commit()
  }

  const endRound = () => {
    const s = g.current
    if (s.phase !== 'playing' && s.phase !== 'defense') return
    freeze()
    s.clockBase = roundConfig(s.round).durationMs
    s.defense = null
    s.phase = 'roundEnd'
    s.summary = { round: s.round, topRed: topOf(s.roundRed), question: pick(DISCUSSION_QUESTIONS) }
    const last = s.round >= TOTAL_ROUNDS
    if (last) setAuto('Awards', ROUND_RESULTS_MS, 'awards')
    else if (HOTTAKE_AFTER_ROUNDS.includes(s.round)) setAuto('Hot Take', ROUND_RESULTS_MS, 'hotTake')
    else setAuto(`Round ${s.round + 1}`, ROUND_RESULTS_MS, 'nextRound')
    commit()
    persist(true)
  }

  // --- defense ---
  const startDefense = (playerId: string, text: string) => {
    const s = g.current
    freeze()
    s.phase = 'defense'
    s.defense = {
      key: `${s.round}-${playerId}-${Date.now()}`,
      playerId,
      name: s.players[playerId]?.name ?? 'Someone',
      text,
      stage: 'talk',
      starter: pick(DEFENSE_STARTERS),
      remaining: DEFENSE_TALK_MS,
      stageEndsAt: performance.now() + DEFENSE_TALK_MS,
      votes: {},
      votesIn: 0,
      votesNeeded: 0,
      objections: 0,
    }
    commit()
  }

  const resolveVote = () => {
    const s = g.current
    const d = s.defense
    if (!d || d.stage !== 'vote') return
    const votes = Object.values(d.votes)
    d.convinced = votes.filter((v) => v === 'convinced').length
    d.notConvinced = votes.length - d.convinced
    d.result = d.convinced >= d.notConvinced ? 'convinced' : 'not'
    inc(s.counters.lawyer, d.playerId, d.convinced)
    if (d.result === 'convinced') {
      // gets back the points and the heart of that red flag
      s.totals[d.playerId] = (s.totals[d.playerId] ?? 0) + RED_PENALTY * roundConfig(s.round).pointsMult
      const grant: GrantEvent = { to: d.playerId, key: d.key, hearts: 1 }
      main.current?.send('grant', grant)
    } else {
      s.totals[d.playerId] = (s.totals[d.playerId] ?? 0) - DEFENSE_FAIL_PENALTY
    }
    d.stage = 'result'
    d.stageEndsAt = performance.now()
    setAuto('Back to the game', DEFENSE_RESUME_MS, 'resume')
    commit()
  }

  const startVote = () => {
    const s = g.current
    const d = s.defense
    if (!d || d.stage !== 'talk') return
    d.stage = 'vote'
    d.stageEndsAt = performance.now() + DEFENSE_VOTE_MS
    d.votesNeeded = onlinePlayers().filter((p) => p.id !== d.playerId).length
    if (d.votesNeeded === 0) {
      resolveVote()
      return
    }
    commit()
  }

  const objection = () => {
    const d = g.current.defense
    if (!d || d.stage !== 'talk') return
    d.stageEndsAt += OBJECTION_MS
    d.objections = (d.objections ?? 0) + 1
    setObjectionKey((k) => k + 1)
    commit()
  }

  /** The defender left (closed the page / lost connection): skip the defense, the game goes on. */
  const cancelDefense = () => {
    const s = g.current
    if (!s.defense) return
    const name = s.defense.name
    s.defense = null
    s.auto = null
    s.phase = 'playing'
    if (elapsed() < roundConfig(s.round).durationMs) resume()
    announce('DEFENSE CANCELLED', '#94a3b8', `${name} left the game`)
    commit()
  }

  const finishDefense = () => {
    const s = g.current
    if (!s.defense) return
    s.defense = null
    s.auto = null
    s.phase = 'playing'
    if (elapsed() < roundConfig(s.round).durationMs) resume()
    commit()
  }

  // --- hot take ---
  const startHotTake = () => {
    const s = g.current
    const unused = HOT_TAKES.filter((t) => !s.hotTakesUsed.includes(t))
    const text = pick(unused.length ? unused : HOT_TAKES)
    s.hotTakesUsed.push(text)
    s.auto = null
    s.phase = 'hotTake'
    s.hotTake = {
      key: `ht-${s.round}-${Date.now()}`,
      text,
      stage: 'vote',
      remaining: HOTTAKE_VOTE_MS,
      stageEndsAt: performance.now() + HOTTAKE_VOTE_MS,
      votes: {},
      votesIn: 0,
      votesNeeded: onlinePlayers().length,
    }
    commit()
  }

  const htReveal = () => {
    const s = g.current
    const h = s.hotTake
    if (!h || h.stage !== 'vote') return
    h.red = Object.entries(h.votes).filter(([, v]) => v === 'red').map(([id]) => id)
    h.green = Object.entries(h.votes).filter(([, v]) => v === 'green').map(([id]) => id)
    const total = h.red.length + h.green.length
    h.pctRed = total ? Math.round((h.red.length / total) * 100) : 50
    h.stage = 'reveal'
    s.hotTakesDone.push({ text: h.text, pctRed: h.pctRed, red: h.red, green: h.green })
    commit()
  }

  const htSpeaker = (id?: string) => {
    const h = g.current.hotTake
    if (!h || h.stage === 'vote' || !id || !g.current.players[id]) return
    h.stage = 'speaker'
    h.speaker = id
    h.stageEndsAt = performance.now() + HOTTAKE_SPEAKER_MS
    commit()
  }

  const htVerdict = () => {
    const h = g.current.hotTake
    if (!h || h.stage === 'vote') return
    h.stage = 'verdict'
    h.speaker = undefined
    commit()
  }

  const htNext = () => {
    const s = g.current
    if (s.phase !== 'hotTake' && s.phase !== 'roundEnd') return
    s.hotTake = null
    startRound()
  }

  // --- end of the game ---
  const showAwards = () => {
    const s = g.current
    freeze()
    commitRoundScores()
    s.defense = null
    s.hotTake = null
    const awards: Award[] = []
    for (const def of AWARD_DEFS) {
      const counter = s.counters[
        ({ toxic: 'reds', manipulator: 'sent', lawyer: 'lawyer', victim: 'received', ick: 'icks' } as const)[def.id]
      ]
      let best: { id: string; n: number } | null = null
      for (const [id, n] of Object.entries(counter)) if (n > 0 && s.players[id] && (!best || n > best.n)) best = { id, n }
      if (best) awards.push({ id: def.id, title: def.title, emoji: def.emoji, playerId: best.id, value: best.n, desc: def.desc(best.n) })
    }
    s.awards = awards
    s.stats = { topRed: topOf(s.redStats), topMissedGreen: topOf(s.missStats) }
    s.phase = 'awards'
    setAuto('Final podium', Math.max(1, awards.length) * AWARD_SHOW_MS + 1500, 'podium')
    commit()
    persist(true)
  }

  const showPodium = () => {
    const s = g.current
    if (s.phase !== 'awards') showAwards()
    s.phase = 'podium'
    s.auto = null
    commit()
    persist(true)
  }

  const showFinal = () => {
    const s = g.current
    if (s.phase !== 'podium' && s.phase !== 'awards') showPodium()
    let mostDivided: FinalStats['mostDivided']
    for (const h of s.hotTakesDone) {
      if (!mostDivided || Math.abs(h.pctRed - 50) < Math.abs(mostDivided.pctRed - 50)) mostDivided = { text: h.text, pctRed: h.pctRed }
    }
    let mostToxic: FinalStats['mostToxic']
    for (const [id, n] of Object.entries(s.counters.reds)) if (s.players[id] && (!mostToxic || n > mostToxic.count)) mostToxic = { playerId: id, count: n }
    s.finalStats = { topRed: topOf(s.redStats), topMissedGreen: topOf(s.missStats), mostDivided, mostToxic }
    s.phase = 'final'
    s.auto = null
    commit()
    persist(true)
  }

  const runAuto = (action: AutoAction) => {
    if (action === 'resume') finishDefense()
    else if (action === 'nextRound') startRound()
    else if (action === 'hotTake') startHotTake()
    else if (action === 'awards') showAwards()
    else showPodium()
  }

  const togglePause = () => {
    const s = g.current
    if (s.phase === 'playing') {
      if (s.running) freeze()
      else resume()
    } else if (s.auto) {
      const a = s.auto
      if (a.paused) {
        a.endsAt = performance.now() + a.pausedLeft
        a.paused = false
      } else {
        a.pausedLeft = Math.max(0, a.endsAt - performance.now())
        a.paused = true
      }
    }
    commit()
  }

  /** "Next" button: skips whatever we are waiting for. */
  const skip = () => {
    const s = g.current
    if (s.phase === 'intro') return openLobby()
    if (s.phase === 'lobby') return startGame()
    if (s.phase === 'tutorial') return startRound()
    if (s.phase === 'defense' && s.defense?.stage === 'talk') return startVote()
    if (s.phase === 'defense' && s.defense?.stage === 'vote') return resolveVote()
    if (s.phase === 'hotTake' && s.hotTake?.stage === 'vote') return htReveal()
    if (s.phase === 'hotTake') return htNext()
    if (s.phase === 'podium') return showFinal()
    if (s.auto) return runAuto(s.auto.action)
  }

  const backToLobby = () => {
    const s = g.current
    g.current = freshGame(s)
    g.current.phase = 'lobby'
    ticks.current = {}
    main.current?.send('reset', {})
    commit()
    persist(true)
  }

  // --- incoming messages from phones ---
  const handleTick = (t: Tick) => {
    const s = g.current
    if (t.round !== s.round || !s.roundIds.includes(t.id)) return
    const now = performance.now()
    const buf = ticks.current[t.id] ?? { prev: null, prevAt: 0, cur: null, curAt: 0 }
    buf.prev = buf.cur
    buf.prevAt = buf.curAt
    buf.cur = t
    buf.curAt = now
    ticks.current[t.id] = buf
    if (s.phase === 'playing' || s.phase === 'defense' || s.phase === 'roundEnd') {
      s.roundScores[t.id] = t.score
      s.hearts[t.id] = t.hearts
      if (s.totals[t.id] == null) s.totals[t.id] = 0
    }
  }

  const handleCatch = (m: CatchMsg) => {
    const s = g.current
    if (m.round !== s.round) return
    catchFx.current.push({ pid: m.id, kind: m.kind, at: performance.now(), cardId: m.cardId, text: m.text })
    if (catchFx.current.length > 60) catchFx.current.splice(0, 30)
    const name = s.players[m.id]?.name ?? 'Someone'
    const t = elapsed()
    if (m.kind === 'red' && m.text) {
      inc(s.counters.reds, m.id)
      addId(s.redStats, m.text, m.id)
      addId(s.roundRed, m.text, m.id)
      if (m.grey) s.greyReds.push({ id: m.id, text: m.text })
      const canDefend =
        s.phase === 'playing' && s.running && !s.defenseDone && t >= DEFENSE_AFTER_MS && t < roundConfig(s.round).durationMs
      if (canDefend) {
        s.defenseDone = true
        startDefense(m.id, m.text)
        return
      }
      if (performance.now() - lastToxic.current > 2500) {
        lastToxic.current = performance.now()
        announce('TOXIC!', '#ff3b5c', `${name}: “${m.text}”`, 'red')
      }
    } else if (m.kind === 'green' && m.streak === MAX_STREAK_LEVEL) {
      announce('HUSBAND/WIFE MATERIAL!', '#22c55e', `${name} is on a x3 combo`, 'combo')
    } else if (m.kind === 'soulmate') {
      announce('SOULMATE!', '#ffd23f', `${name}: “${m.text}”`, 'soulmate')
    } else if (m.kind === 'ick' && m.text) {
      inc(s.counters.icks, m.id)
      announce('THE ICK!', '#a855f7', `${name}: “${m.text}”`, 'ick')
    }
    if (m.broke) announce('HEARTBROKEN!', '#ff5fa2', `${name} needs 10 seconds...`, 'red')
  }

  const handleMiss = (m: MissMsg) => {
    const s = g.current
    if (m.round !== s.round) return
    addId(s.missStats, m.text, m.id)
    addId(s.roundMiss, m.text, m.id)
  }

  const handlePower = (m: PowerMsg) => {
    const s = g.current
    if (s.phase !== 'playing' && s.phase !== 'defense') return
    if (!s.players[m.to] || m.from === m.to || m.power === 'therapy') return
    const ev: SabotageEvent = { ...m, key: `${m.from}-${Date.now()}`, round: s.round }
    main.current?.send('sabotage', ev)
    inc(s.counters.sent, m.from)
    const shielded = Boolean(ticks.current[m.to]?.cur?.shield)
    if (shielded) {
      announce('BLOCKED BY THERAPY!', '#22d3ee', `${s.players[m.to].name} was protected`, 'shield')
    } else {
      inc(s.counters.received, m.to)
      const row = (s.sabotagePairs[m.from] ??= {})
      row[m.to] = (row[m.to] ?? 0) + 1
      announce('BETRAYAL!', '#a855f7', undefined, 'sabotage')
      setSabotages((list) => [...list, ev].slice(-6))
    }
  }

  const handleVote = (v: VoteMsg) => {
    const d = g.current.defense
    if (!d || d.stage !== 'vote' || v.defenseKey !== d.key || v.id === d.playerId) return
    d.votes[v.id] = v.vote
    d.votesIn = Object.keys(d.votes).length
    if (d.votesIn >= d.votesNeeded) resolveVote()
    else commit()
  }

  const handleHotTakeVote = (v: HotTakeVoteMsg) => {
    const h = g.current.hotTake
    if (!h || h.stage !== 'vote' || v.key !== h.key || (v.vote !== 'red' && v.vote !== 'green')) return
    h.votes[v.id] = v.vote
    h.votesIn = Object.keys(h.votes).length
    if (h.votesIn >= h.votesNeeded) htReveal()
    else commit()
  }

  // --- host (moderator) ---

  const runHostCmd = (c: HostCmd) => {
    switch (c.cmd) {
      case 'openLobby':
        return openLobby()
      case 'start':
        return g.current.phase === 'intro' ? openLobby() : startGame()
      case 'pause':
        return togglePause()
      case 'skip':
        return skip()
      case 'endRound':
        return endRound()
      case 'awards':
        return showAwards()
      case 'podium':
        return showPodium()
      case 'final':
        return showFinal()
      case 'playAgain':
        return backToLobby()
      case 'objection':
        return objection()
      case 'vote':
        return startVote()
      case 'htReveal':
        return htReveal()
      case 'htSpeaker':
        return htSpeaker(c.arg)
      case 'htVerdict':
        return htVerdict()
      case 'htNext':
        return htNext()
    }
  }

  const handlers = useRef({ handleTick, handleCatch, handleMiss, handlePower, handleVote, handleHotTakeVote, runHostCmd })
  handlers.current = { handleTick, handleCatch, handleMiss, handlePower, handleVote, handleHotTakeVote, runHostCmd }

  const listenToHost = useCallback(
    (token: string) => {
      if (hostRooms.current[token]) return
      const room = openChannel(hostTopic(code, token))
      room.on<HostCmd>('cmd', (c) => {
        // only commands that carry this channel's valid token
        if (!c || c.token !== token || !g.current.hostTokens.includes(token)) return
        lastHostSeen.current = performance.now()
        setHostOnline(true)
        handlers.current.runHostCmd(c)
      })
      room.on<{ token: string }>('hello', (m) => {
        if (m?.token !== token) return
        lastHostSeen.current = performance.now()
        setHostOnline(true)
        sendHostInfo(buildState(), true)
      })
      room.subscribe(() => sendHostInfo(buildState(), true))
      hostRooms.current[token] = room
    },
    [code, buildState, sendHostInfo]
  )

  const listenToPlayer = useCallback(
    (id: string) => {
      if (playerRooms.current[id]) return
      const room = openChannel(playerTopic(code, id))
      room.on<Tick>('tick', (t) => handlers.current.handleTick(t))
      room.on<CatchMsg>('catch', (m) => handlers.current.handleCatch(m))
      room.on<MissMsg>('miss', (m) => handlers.current.handleMiss(m))
      room.on<PowerMsg>('power', (m) => handlers.current.handlePower(m))
      room.on<VoteMsg>('vote', (m) => handlers.current.handleVote(m))
      room.on<HotTakeVoteMsg>('htvote', (m) => handlers.current.handleHotTakeVote(m))
      room.subscribe()
      playerRooms.current[id] = room
    },
    [code]
  )

  // --- connect ---
  useEffect(() => {
    const room = openChannel(mainTopic(code), { presenceKey: 'admin', onStatus: setStatus })
    main.current = room
    room.on('hello', () => {
      if (performance.now() - lastBroadcast.current > 300) broadcast()
    })
    room.on<HostLoginMsg>('host-login', (m) => {
      if (!m?.nonce || !m.proof) return
      // at most 5 attempts every 10 s
      const now = Date.now()
      loginAttempts.current = loginAttempts.current.filter((t) => now - t < 10_000)
      if (loginAttempts.current.length >= 5) return
      loginAttempts.current.push(now)
      const pw = HOST_PASSWORD
      const ok = m.proof === loginProof(pw, code, m.nonce)
      const reply: HostAuthMsg = { nonce: m.nonce, ok }
      if (ok) {
        const token = randomHex(32)
        g.current.hostTokens = [...g.current.hostTokens.slice(-4), token]
        listenToHost(token)
        reply.enc = xorToken(token, pw, m.nonce)
        persist(true)
      }
      room.send('host-auth', reply)
    })
    room.channel.on('presence', { event: 'sync' }, () => {
      const ps = room.channel.presenceState<PresenceMeta>()
      const s = g.current
      const seen = new Set<string>()
      for (const metas of Object.values(ps)) {
        const m = metas[metas.length - 1]
        if (!m || m.role !== 'player' || !m.avatar) continue
        seen.add(m.id)
        s.players[m.id] = {
          id: m.id,
          name: String(m.name || 'Player').slice(0, 14),
          avatar: sanitizeAvatar(m.avatar),
          bio: sanitizeProfileLine(m.bio),
          ready: Boolean(m.ready),
          online: true,
        }
        listenToPlayer(m.id)
      }
      for (const p of Object.values(s.players)) if (!seen.has(p.id)) p.online = false
      // before the game, forget players who left and never played
      if (s.phase === 'lobby' || s.phase === 'intro') {
        for (const id of Object.keys(s.players)) if (!seen.has(id) && s.totals[id] == null) delete s.players[id]
      }
      bump()
      sendHostInfo(buildState(), true)
      persist()
    })
    room.subscribe(() => {
      room.channel.track({ role: 'admin' }).catch(() => {})
      broadcast()
    })
    // re-open listeners for remembered players and hosts (admin page reload)
    for (const id of Object.keys(g.current.players)) listenToPlayer(id)
    for (const token of g.current.hostTokens) listenToHost(token)

    const rooms = playerRooms.current
    const hosts = hostRooms.current
    return () => {
      room.close()
      for (const r of Object.values(rooms)) r.close()
      for (const r of Object.values(hosts)) r.close()
      playerRooms.current = {}
      hostRooms.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // --- game loop (timers, heartbeat) ---
  const loopFns = useRef({ startRound, startVote, resolveVote, endRound, runAuto, htReveal, cancelDefense })
  loopFns.current = { startRound, startVote, resolveVote, endRound, runAuto, htReveal, cancelDefense }
  const defenderMissingSince = useRef(0)
  useEffect(() => {
    const id = setInterval(() => {
      const s = g.current
      const now = performance.now()
      const fns = loopFns.current
      if (hostOnline && now - lastHostSeen.current > 20_000) setHostOnline(false)
      if (s.phase === 'tutorial' && now >= s.tutorialEndsAt) return fns.startRound()
      if (s.phase === 'playing' && s.running) {
        const t = elapsed()
        const dur = roundConfig(s.round).durationMs
        if (t >= dur) return fns.endRound()
        if (t >= dur - 10_000 && s.last10Round !== s.round) {
          s.last10Round = s.round
          announce('LAST 10 SECONDS!', '#ffd23f', undefined, 'last10')
        }
      }
      if (s.phase === 'defense' && s.defense && s.defense.stage !== 'result') {
        if (s.players[s.defense.playerId]?.online === false) {
          defenderMissingSince.current ||= now
          if (now - defenderMissingSince.current > 4000) {
            defenderMissingSince.current = 0
            return fns.cancelDefense()
          }
        } else defenderMissingSince.current = 0
      }
      if (s.phase === 'defense' && s.defense?.stage === 'talk' && now >= s.defense.stageEndsAt) return fns.startVote()
      if (s.phase === 'defense' && s.defense?.stage === 'vote' && now >= s.defense.stageEndsAt) return fns.resolveVote()
      if (s.phase === 'hotTake' && s.hotTake?.stage === 'vote' && now >= s.hotTake.stageEndsAt) return fns.htReveal()
      if (s.phase === 'hotTake' && s.hotTake?.stage === 'speaker' && now >= s.hotTake.stageEndsAt) {
        // speaker time is over: back to the two sides (the host decides what's next)
        s.hotTake.stage = 'reveal'
        s.hotTake.speaker = undefined
        bump()
        return broadcast()
      }
      if (s.auto && !s.auto.paused && now >= s.auto.endsAt) return fns.runAuto(s.auto.action)
      if (now - lastBroadcast.current > 1500) broadcast()
    }, 100)
    return () => clearInterval(id)
  }, [elapsed, broadcast, announce, bump, hostOnline])

  // remove finished sabotage animations and announcements
  useEffect(() => {
    if (!sabotages.length) return
    const t = setTimeout(() => setSabotages((l) => l.slice(1)), 3000)
    return () => clearTimeout(t)
  }, [sabotages])
  useEffect(() => {
    if (!announcements.length) return
    const t = setTimeout(() => setAnnouncements((l) => l.slice(1)), 1800)
    return () => clearTimeout(t)
  }, [announcements])

  return {
    g,
    ticks,
    catchFx,
    version,
    status,
    sabotages,
    announcements,
    objectionKey,
    hostOnline,
    elapsed,
    actions: {
      openLobby,
      startGame,
      startRound,
      togglePause,
      endRound,
      skip,
      objection,
      showAwards,
      showPodium,
      showFinal,
      backToLobby,
      htReveal,
      htSpeaker,
      htVerdict,
      htNext,
    },
  }
}
