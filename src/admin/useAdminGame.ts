import { useCallback, useEffect, useRef, useState } from 'react'
import { DISCUSSION_QUESTIONS } from '../data/cards'
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
  MAX_STREAK_LEVEL,
  ROUND_RESULTS_MS,
  RED_PENALTY,
  roundConfig,
  START_HEARTS,
  TOTAL_ROUNDS,
  TUTORIAL_MS,
} from '../lib/game'
import { randomSeed } from '../lib/rng'
import type { Sfx } from '../lib/sfx'
import { mainTopic, openChannel, playerTopic, type Room } from '../lib/room'
import { load, save } from '../lib/storage'
import type {
  Award,
  CatchMsg,
  Defense,
  GameState,
  GrantEvent,
  MissMsg,
  Phase,
  PlayerInfo,
  PodiumStats,
  PowerMsg,
  PresenceMeta,
  RoundSummary,
  SabotageEvent,
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

type AutoAction = 'resume' | 'nextRound' | 'awards' | 'podium'
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
  auto: AdminAuto | null
  tutorialEndsAt: number
  last10Round: number
  summary?: RoundSummary
  awards?: Award[]
  stats?: PodiumStats
  players: Record<string, PlayerInfo>
  counters: { reds: Counter; sent: Counter; received: Counter; icks: Counter; lawyer: Counter }
  redStats: Record<string, string[]>
  missStats: Record<string, string[]>
  roundRed: Record<string, string[]>
  createdAt: number
  seq: number
}

type Snapshot = Omit<AdminGame, 'defense' | 'clockAt' | 'running' | 'seq' | 'auto' | 'tutorialEndsAt'> & {
  code: string
  savedAt: number
}

const SNAP_KEY = 'gr.admin'

function emptyCounters(): AdminGame['counters'] {
  return { reds: {}, sent: {}, received: {}, icks: {}, lawyer: {} }
}

function freshGame(createdAt = Date.now()): AdminGame {
  return {
    phase: 'lobby',
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
    auto: null,
    tutorialEndsAt: 0,
    last10Round: 0,
    players: {},
    counters: emptyCounters(),
    redStats: {},
    missStats: {},
    roundRed: {},
    createdAt,
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
  if (!s || typeof s.gameSeed !== 'number') return g
  Object.assign(g, s)
  // a reload during a defense/tutorial comes back paused in a safe phase
  if (s.phase === 'defense') g.phase = 'playing'
  if (s.phase === 'tutorial') g.phase = 'lobby'
  g.counters = { ...emptyCounters(), ...(s.counters ?? {}) }
  g.running = false
  g.defense = null
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
  const [version, setVersion] = useState(0)
  const [status, setStatus] = useState('connecting')
  const [sabotages, setSabotages] = useState<SabotageEvent[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const lastBroadcast = useRef(0)
  const lastSave = useRef(0)
  const lastToxic = useRef(0)
  const annKey = useRef(0)

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
      const { defense: _d, clockAt: _c, running: _r, seq: _s, auto: _a, tutorialEndsAt: _t, ...rest } = s
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

  const broadcast = useCallback(() => {
    const s = g.current
    s.seq++
    const d = s.defense
    const now = performance.now()
    const state: GameState = {
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
      summary: s.summary,
      awards: s.awards,
      stats: s.stats,
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
          }
        : null,
    }
    main.current?.send('state', state)
    lastBroadcast.current = now
    persist()
  }, [elapsed, persist])

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
  const startRound = () => {
    const s = g.current
    if (s.round >= TOTAL_ROUNDS) return
    commitRoundScores()
    s.round++
    s.seed = randomSeed()
    s.defenseDone = false
    s.defense = null
    s.auto = null
    s.summary = undefined
    s.roundRed = {}
    s.phase = 'playing'
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
    const keepPlayers = s.players
    const createdAt = s.createdAt
    g.current = freshGame(createdAt)
    g.current.players = keepPlayers
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
    setAuto(last ? 'Awards' : `Round ${s.round + 1}`, ROUND_RESULTS_MS, last ? 'awards' : 'nextRound')
    commit()
    persist(true)
  }

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

  const finishDefense = () => {
    const s = g.current
    if (!s.defense) return
    s.defense = null
    s.auto = null
    s.phase = 'playing'
    if (elapsed() < roundConfig(s.round).durationMs) resume()
    commit()
  }

  const showAwards = () => {
    const s = g.current
    freeze()
    commitRoundScores()
    s.defense = null
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

  const runAuto = (action: AutoAction) => {
    if (action === 'resume') finishDefense()
    else if (action === 'nextRound') startRound()
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
    if (s.phase === 'tutorial') return startRound()
    if (s.phase === 'defense' && s.defense?.stage === 'talk') return startVote()
    if (s.phase === 'defense' && s.defense?.stage === 'vote') return resolveVote()
    if (s.auto) return runAuto(s.auto.action)
  }

  const backToLobby = () => {
    const s = g.current
    const keepPlayers = s.players
    g.current = freshGame(s.createdAt)
    g.current.players = keepPlayers
    ticks.current = {}
    main.current?.send('reset', {})
    commit()
    persist(true)
  }

  // --- incoming messages from phones ---
  const handleTick = (t: Tick) => {
    const s = g.current
    if (t.round !== s.round) return
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
      for (const map of [s.redStats, s.roundRed]) {
        const list = (map[m.text] ??= [])
        if (!list.includes(m.id)) list.push(m.id)
      }
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
    const list = (s.missStats[m.text] ??= [])
    if (!list.includes(m.id)) list.push(m.id)
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

  const handlers = useRef({ handleTick, handleCatch, handleMiss, handlePower, handleVote })
  handlers.current = { handleTick, handleCatch, handleMiss, handlePower, handleVote }

  const listenToPlayer = useCallback(
    (id: string) => {
      if (playerRooms.current[id]) return
      const room = openChannel(playerTopic(code, id))
      room.on<Tick>('tick', (t) => handlers.current.handleTick(t))
      room.on<CatchMsg>('catch', (m) => handlers.current.handleCatch(m))
      room.on<MissMsg>('miss', (m) => handlers.current.handleMiss(m))
      room.on<PowerMsg>('power', (m) => handlers.current.handlePower(m))
      room.on<VoteMsg>('vote', (m) => handlers.current.handleVote(m))
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
      // in the lobby, forget players who left and never played
      if (s.phase === 'lobby') {
        for (const id of Object.keys(s.players)) if (!seen.has(id) && s.totals[id] == null) delete s.players[id]
      }
      bump()
      persist()
    })
    room.subscribe(() => {
      room.channel.track({ role: 'admin' }).catch(() => {})
      broadcast()
    })
    // re-open listeners for remembered players (admin page reload)
    for (const id of Object.keys(g.current.players)) listenToPlayer(id)

    const rooms = playerRooms.current
    return () => {
      room.close()
      for (const r of Object.values(rooms)) r.close()
      playerRooms.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // --- game loop (timers, heartbeat) ---
  const loopFns = useRef({ startRound, startVote, resolveVote, endRound, runAuto })
  loopFns.current = { startRound, startVote, resolveVote, endRound, runAuto }
  useEffect(() => {
    const id = setInterval(() => {
      const s = g.current
      const now = performance.now()
      const fns = loopFns.current
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
      if (s.phase === 'defense' && s.defense?.stage === 'talk' && now >= s.defense.stageEndsAt) return fns.startVote()
      if (s.phase === 'defense' && s.defense?.stage === 'vote' && now >= s.defense.stageEndsAt) return fns.resolveVote()
      if (s.auto && !s.auto.paused && now >= s.auto.endsAt) return fns.runAuto(s.auto.action)
      if (now - lastBroadcast.current > 1500) broadcast()
    }, 100)
    return () => clearInterval(id)
  }, [elapsed, broadcast, announce])

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
    elapsed,
    actions: { startGame, startRound, togglePause, endRound, skip, showAwards, showPodium, backToLobby },
  }
}
