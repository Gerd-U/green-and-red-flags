import { useCallback, useEffect, useRef, useState } from 'react'
import { sanitizeAvatar } from '../lib/avatar'
import { sanitizeProfileLine } from '../data/profiles'
import { COUNTDOWN_MS, DEFENSE_MS, RED_PENALTY, ROUND_MS, START_LIVES } from '../lib/game'
import { randomSeed } from '../lib/rng'
import { mainTopic, openChannel, playerTopic, type Room } from '../lib/room'
import { load, save } from '../lib/storage'
import type {
  CatchMsg,
  Defense,
  GameState,
  MissMsg,
  Phase,
  PlayerInfo,
  PodiumStats,
  PowerMsg,
  PresenceMeta,
  SabotageEvent,
  Tick,
  VoteMsg,
} from '../lib/types'

export interface TickBuffer {
  prev: Tick | null
  prevAt: number
  cur: Tick | null
  curAt: number
}

interface AdminDefense extends Defense {
  key: string
  talkEndsAt: number
  votes: Record<string, 'convinced' | 'not'>
}

export interface AdminGame {
  phase: Phase
  round: number
  seed: number
  running: boolean
  clockBase: number
  clockAt: number
  totals: Record<string, number>
  roundScores: Record<string, number>
  lives: Record<string, number>
  defense: AdminDefense | null
  firstRedDone: boolean
  storedReds: { id: string; text: string }[]
  players: Record<string, PlayerInfo>
  redStats: Record<string, string[]>
  missStats: Record<string, string[]>
  stats?: PodiumStats
  seq: number
}

interface Snapshot extends Omit<AdminGame, 'defense' | 'clockAt' | 'running' | 'seq'> {
  code: string
  savedAt: number
}

const SNAP_KEY = 'gr.admin'

function freshGame(): AdminGame {
  return {
    phase: 'lobby',
    round: 0,
    seed: 1,
    running: false,
    clockBase: 0,
    clockAt: 0,
    totals: {},
    roundScores: {},
    lives: {},
    defense: null,
    firstRedDone: false,
    storedReds: [],
    players: {},
    redStats: {},
    missStats: {},
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
  if (!s) return g
  Object.assign(g, {
    phase: s.phase === 'defense' ? 'playing' : s.phase,
    round: s.round,
    seed: s.seed,
    clockBase: s.clockBase,
    totals: s.totals ?? {},
    roundScores: s.roundScores ?? {},
    lives: s.lives ?? {},
    firstRedDone: s.firstRedDone,
    storedReds: s.storedReds ?? [],
    players: s.players ?? {},
    redStats: s.redStats ?? {},
    missStats: s.missStats ?? {},
    stats: s.stats,
  })
  for (const p of Object.values(g.players)) p.online = false
  return g
}

function topOf(map: Record<string, string[]>) {
  let best: { text: string; count: number } | undefined
  for (const [text, ids] of Object.entries(map)) {
    if (!best || ids.length > best.count) best = { text, count: ids.length }
  }
  return best
}

export function useAdminGame(code: string) {
  const [initial] = useState(() => {
    const snap = loadAdminSnapshot()
    return gameFromSnapshot(snap?.code === code ? snap : null)
  })
  const g = useRef<AdminGame>(initial)
  const ticks = useRef<Record<string, TickBuffer>>({})
  const main = useRef<Room | null>(null)
  const playerRooms = useRef<Record<string, Room>>({})
  const [version, setVersion] = useState(0)
  const [status, setStatus] = useState('connecting')
  const [sabotages, setSabotages] = useState<SabotageEvent[]>([])
  const lastBroadcast = useRef(0)
  const lastSave = useRef(0)

  const bump = useCallback(() => setVersion((v) => v + 1), [])

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
      const snap: Snapshot = {
        code,
        savedAt: now,
        phase: s.phase,
        round: s.round,
        seed: s.seed,
        clockBase: Math.min(elapsed(), ROUND_MS),
        totals: s.totals,
        roundScores: s.roundScores,
        lives: s.lives,
        firstRedDone: s.firstRedDone,
        storedReds: s.storedReds,
        players: s.players,
        redStats: s.redStats,
        missStats: s.missStats,
        stats: s.stats,
      }
      save(SNAP_KEY, snap)
    },
    [code, elapsed]
  )

  const broadcast = useCallback(() => {
    const s = g.current
    s.seq++
    const d = s.defense
    const state: GameState = {
      phase: s.phase,
      round: s.round,
      seed: s.seed,
      running: s.running,
      elapsed: Math.round(elapsed()),
      totals: s.totals,
      roundScores: s.roundScores,
      lives: s.lives,
      seq: s.seq,
      stats: s.stats,
      defense: d
        ? {
            playerId: d.playerId,
            name: d.name,
            text: d.text,
            stage: d.stage,
            context: d.context,
            remaining: Math.max(0, d.talkEndsAt - performance.now()),
            votesIn: Object.keys(d.votes).length,
            votesNeeded: d.votesNeeded,
            convinced: d.convinced,
            notConvinced: d.notConvinced,
            result: d.result,
          }
        : null,
    }
    main.current?.send('state', state)
    lastBroadcast.current = performance.now()
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

  const onlinePlayers = () => Object.values(g.current.players).filter((p) => p.online)

  // --- defense ---
  const startDefense = useCallback(
    (playerId: string, text: string, context: 'first' | 'end') => {
      const s = g.current
      freeze()
      s.phase = 'defense'
      const name = s.players[playerId]?.name ?? 'Someone'
      s.defense = {
        key: `${s.round}-${context}-${playerId}`,
        playerId,
        name,
        text,
        context,
        stage: 'talk',
        remaining: DEFENSE_MS,
        talkEndsAt: performance.now() + DEFENSE_MS,
        votes: {},
        votesIn: 0,
        votesNeeded: 0,
      }
      commit()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commit]
  )

  const resolveVote = useCallback(() => {
    const s = g.current
    const d = s.defense
    if (!d || d.stage !== 'vote') return
    const votes = Object.values(d.votes)
    d.convinced = votes.filter((v) => v === 'convinced').length
    d.notConvinced = votes.length - d.convinced
    d.result = d.convinced >= d.notConvinced ? 'convinced' : 'not'
    if (d.result === 'convinced') {
      // "keeps their points": give back the red flag penalty
      s.totals[d.playerId] = (s.totals[d.playerId] ?? 0) + RED_PENALTY
    } else {
      s.lives[d.playerId] = Math.max(0, (s.lives[d.playerId] ?? START_LIVES) - 1)
    }
    d.stage = 'result'
    commit()
  }, [commit])

  const startVote = useCallback(() => {
    const s = g.current
    const d = s.defense
    if (!d || d.stage !== 'talk') return
    d.stage = 'vote'
    d.talkEndsAt = performance.now()
    d.votesNeeded = onlinePlayers().filter((p) => p.id !== d.playerId).length
    if (d.votesNeeded === 0) {
      d.stage = 'vote'
      resolveVote()
      return
    }
    commit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, resolveVote])

  const finishDefense = useCallback(() => {
    const s = g.current
    const d = s.defense
    if (!d) return
    s.defense = null
    if (d.context === 'first' && elapsed() < ROUND_MS) {
      s.phase = 'playing'
      resume()
    } else {
      s.phase = 'roundEnd'
    }
    commit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, elapsed])

  // --- rounds ---
  const commitRoundScores = () => {
    const s = g.current
    for (const [id, v] of Object.entries(s.roundScores)) s.totals[id] = (s.totals[id] ?? 0) + v
    s.roundScores = {}
  }

  const startRound = useCallback(() => {
    const s = g.current
    commitRoundScores()
    s.round++
    s.seed = randomSeed()
    s.firstRedDone = false
    s.storedReds = []
    s.defense = null
    s.phase = 'playing'
    for (const p of onlinePlayers()) {
      if (s.lives[p.id] == null) s.lives[p.id] = START_LIVES
      if (s.totals[p.id] == null) s.totals[p.id] = 0
      s.roundScores[p.id] = 0
    }
    ticks.current = {}
    s.clockBase = -COUNTDOWN_MS
    resume()
    commit()
    persist(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, persist])

  const endRound = useCallback(() => {
    const s = g.current
    freeze()
    s.clockBase = ROUND_MS
    if (s.storedReds.length) {
      const pick = s.storedReds[Math.floor(Math.random() * s.storedReds.length)]
      s.storedReds = []
      startDefense(pick.id, pick.text, 'end')
    } else {
      s.phase = 'roundEnd'
      commit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, startDefense])

  const togglePause = useCallback(() => {
    const s = g.current
    if (s.phase !== 'playing') return
    if (s.running) freeze()
    else resume()
    commit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit])

  const showPodium = useCallback(() => {
    const s = g.current
    freeze()
    commitRoundScores()
    s.defense = null
    s.phase = 'podium'
    s.stats = { topRed: topOf(s.redStats), topMissedGreen: topOf(s.missStats) }
    commit()
    persist(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, persist])

  const backToLobby = useCallback(() => {
    const keepPlayers = g.current.players
    g.current = freshGame()
    g.current.players = keepPlayers
    ticks.current = {}
    main.current?.send('reset', {})
    commit()
    persist(true)
  }, [commit, persist])

  // --- incoming messages from phones ---
  const handleTick = useCallback((t: Tick) => {
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
      if (s.lives[t.id] == null) s.lives[t.id] = START_LIVES
      if (s.totals[t.id] == null) s.totals[t.id] = 0
    }
  }, [])

  const handleCatch = useCallback(
    (m: CatchMsg) => {
      const s = g.current
      if (m.round !== s.round || m.kind !== 'red' || !m.text) return
      const list = (s.redStats[m.text] ??= [])
      if (!list.includes(m.id)) list.push(m.id)
      if (s.phase !== 'playing' || elapsed() < 0 || elapsed() >= ROUND_MS) {
        s.storedReds.push({ id: m.id, text: m.text })
        return
      }
      if (!s.firstRedDone) {
        s.firstRedDone = true
        startDefense(m.id, m.text, 'first')
      } else {
        s.storedReds.push({ id: m.id, text: m.text })
      }
    },
    [elapsed, startDefense]
  )

  const handleMiss = useCallback((m: MissMsg) => {
    const s = g.current
    if (m.round !== s.round) return
    const list = (s.missStats[m.text] ??= [])
    if (!list.includes(m.id)) list.push(m.id)
  }, [])

  const handlePower = useCallback((m: PowerMsg) => {
    const s = g.current
    if (s.phase !== 'playing' && s.phase !== 'defense') return
    if (!s.players[m.to] || m.from === m.to) return
    const ev: SabotageEvent = { ...m, key: `${m.from}-${Date.now()}`, round: s.round }
    main.current?.send('sabotage', ev)
    setSabotages((list) => [...list, ev].slice(-6))
  }, [])

  const handleVote = useCallback(
    (v: VoteMsg) => {
      const d = g.current.defense
      if (!d || d.stage !== 'vote' || v.defenseKey !== d.key || v.id === d.playerId) return
      d.votes[v.id] = v.vote
      d.votesIn = Object.keys(d.votes).length
      if (d.votesIn >= d.votesNeeded) resolveVote()
      else commit()
    },
    [commit, resolveVote]
  )

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
  useEffect(() => {
    const id = setInterval(() => {
      const s = g.current
      if (s.phase === 'playing' && s.running && elapsed() >= ROUND_MS) {
        endRound()
        return
      }
      if (s.phase === 'defense' && s.defense?.stage === 'talk' && performance.now() >= s.defense.talkEndsAt) {
        startVote()
        return
      }
      if (performance.now() - lastBroadcast.current > 1500) broadcast()
    }, 100)
    return () => clearInterval(id)
  }, [elapsed, endRound, startVote, broadcast])

  // remove finished sabotage animations
  useEffect(() => {
    if (!sabotages.length) return
    const t = setTimeout(() => setSabotages((l) => l.slice(1)), 3000)
    return () => clearTimeout(t)
  }, [sabotages])

  return {
    g,
    ticks,
    version,
    status,
    sabotages,
    elapsed,
    actions: { startRound, togglePause, endRound, startVote, resolveVote, finishDefense, showPodium, backToLobby },
  }
}
