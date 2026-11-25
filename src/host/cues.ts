import { ACTIVITY_LIMIT_MIN, PLAN, roundConfig } from '../lib/game'
import type { HostInfo, Phase } from '../lib/types'

// =====================================================================
//  HOST CUES — signals on the host phone (vibration + flash + banner)
//  telling you "your turn to talk" / "tap a button" / "warning".
//  Edit the list below: each cue says WHEN it fires and WHAT the banner says.
//
//  Vibration patterns (recognizable without looking):
//    SPEAK = one long buzz      ACT = two short      WARN = three short
// =====================================================================

export type CueKind = 'speak' | 'act' | 'warn'

export const CUE_STYLE: Record<CueKind, { icon: string; label: string; vibrate: number[]; color: string }> = {
  speak: { icon: '🎤', label: 'YOUR TURN', vibrate: [400], color: '#22c55e' },
  act: { icon: '👆', label: 'TAP A BUTTON', vibrate: [120, 80, 120], color: '#ffd23f' },
  warn: { icon: '⚠️', label: 'WARNING', vibrate: [80, 60, 80, 60, 80], color: '#ff3b5c' },
}

/** A snapshot of what the host phone knows right now (times already interpolated). */
export interface CueCtx {
  phase: Phase
  round: number
  defenseKey?: string
  defenseName?: string
  defenseStage?: string
  /** ms left of the defender's talking time */
  defenseTalkLeft?: number
  objections?: number
  hotKey?: string
  hotStage?: string
  hotSpeaker?: string
  /** ms left in the round (only while playing) */
  roundLeft?: number
  running: boolean
  online: number
  ready: number
  /** ms behind the plan (negative = ahead) */
  behindMs: number
  planKey: string
  activityMs: number
  connected: boolean
  /** ms that everyone in the lobby (2+ people) has been ready without changes */
  readyStableMs?: number
}

export interface CueDef {
  id: string
  kind: CueKind
  /** banner text */
  text: (c: CueCtx) => string
  /**
   * Returns a key when the cue must fire (it fires once per key), or null.
   * `prev` is the previous snapshot (null right after connecting, so nothing
   * fires just because you reloaded the page).
   */
  when: (prev: CueCtx | null, cur: CueCtx) => string | null
}

const entered = (prev: CueCtx | null, cur: CueCtx, phase: Phase) => prev !== null && prev.phase !== phase && cur.phase === phase

export const CUES: CueDef[] = [
  // ---------------- SPEAK: your turn to talk ----------------
  {
    id: 'intro',
    kind: 'speak',
    text: () => 'Introduce the topic: red flags vs green flags',
    // also when you tap "Start hosting" and the room is already in the intro
    when: (p, c) => (c.phase === 'intro' && (p === null || p.phase !== 'intro') ? `intro-${c.activityMs >> 16}` : null),
  },
  { id: 'lobby', kind: 'speak', text: () => 'Welcome everyone: ask about their dating profiles', when: (p, c) => (entered(p, c, 'lobby') ? 'lobby' : null) },
  {
    id: 'defense',
    kind: 'speak',
    text: (c) => `Introduce ${c.defenseName ?? 'the player'}'s defense`,
    when: (p, c) => (c.phase === 'defense' && c.defenseKey && c.defenseKey !== p?.defenseKey && p !== null ? `defense-${c.defenseKey}` : null),
  },
  { id: 'roundEnd', kind: 'speak', text: () => 'Ask the round question', when: (p, c) => (entered(p, c, 'roundEnd') ? `roundEnd-${c.round}` : null) },
  {
    id: 'hotReveal',
    kind: 'speak',
    text: () => 'Hot Take revealed: choose who gets the word',
    when: (p, c) => (p && c.phase === 'hotTake' && c.hotStage === 'reveal' && p.hotStage === 'vote' && p.hotKey === c.hotKey ? `reveal-${c.hotKey}` : null),
  },
  {
    id: 'speakerEnd',
    kind: 'speak',
    text: () => 'Time is up: give your verdict or pass the word',
    when: (p, c) =>
      p && c.phase === 'hotTake' && p.hotStage === 'speaker' && c.hotStage === 'reveal' && p.hotKey === c.hotKey ? `speakerEnd-${c.hotKey}-${p.hotSpeaker}` : null,
  },
  { id: 'awards', kind: 'speak', text: () => 'Announce the awards', when: (p, c) => (entered(p, c, 'awards') ? 'awards' : null) },
  { id: 'podium', kind: 'speak', text: () => 'Congratulate the top three', when: (p, c) => (entered(p, c, 'podium') ? 'podium' : null) },
  { id: 'final', kind: 'speak', text: () => 'Close the activity: share the fun facts', when: (p, c) => (entered(p, c, 'final') ? 'final' : null) },

  // ---------------- ACT: tap a button ----------------
  {
    id: 'defense5',
    kind: 'act',
    text: () => '5 seconds left: Objection! or go to the vote',
    when: (p, c) =>
      p && c.phase === 'defense' && c.defenseStage === 'talk' && (c.defenseTalkLeft ?? 99_999) <= 5000 && (c.defenseTalkLeft ?? 0) > 0
        ? `d5-${c.defenseKey}-${c.objections ?? 0}`
        : null,
  },
  {
    id: 'hotVoteDone',
    kind: 'act',
    text: () => 'Hot Take vote is over',
    when: (p, c) => (p && c.phase === 'hotTake' && p.hotStage === 'vote' && c.hotStage !== 'vote' && p.hotKey === c.hotKey ? `vote-${c.hotKey}` : null),
  },
  {
    id: 'lobbyReady',
    kind: 'act',
    text: (c) => `Everyone is ready (${c.ready}): start the game`,
    // 2+ people and all of them ready for 4 s (fires again if more people join and get ready)
    when: (p, c) => (p !== null && c.phase === 'lobby' && (c.readyStableMs ?? 0) >= 4000 ? `ready-${c.online}` : null),
  },
  {
    id: 'round5',
    kind: 'act',
    text: () => '5 seconds left in the round',
    when: (p, c) => (p && c.phase === 'playing' && c.running && c.roundLeft !== undefined && c.roundLeft <= 5000 && c.roundLeft > 0 ? `r5-${c.round}` : null),
  },

  // ---------------- WARN ----------------
  {
    id: 'behind',
    kind: 'warn',
    text: (c) => `You are ${Math.round(c.behindMs / 60_000) || 1} min behind schedule`,
    when: (p, c) => (p && c.behindMs > 60_000 ? `behind-${c.planKey}` : null),
  },
  {
    id: 'limit',
    kind: 'warn',
    text: () => '3 minutes left of the 30. Wrap up!',
    when: (p, c) => (p && c.activityMs >= (ACTIVITY_LIMIT_MIN - 3) * 60_000 ? 'limit' : null),
  },
  {
    id: 'disconnected',
    kind: 'warn',
    text: () => 'Disconnected from the projector — reconnecting…',
    when: (p, c) => (p && p.connected && !c.connected ? `disc-${c.activityMs}` : null),
  },
]

/** Builds the snapshot from the latest info (`since` = ms since it arrived). */
export function cueContext(info: HostInfo, since: number, connected: boolean, planKey: string): CueCtx {
  const s = info.state
  const activityMs = info.activityMs + since
  const plan = PLAN.find((p) => p.key === planKey)
  const d = s.defense
  const h = s.hotTake
  const roundLeft =
    s.phase === 'playing' && s.round > 0 ? roundConfig(s.round).durationMs - (s.elapsed + (s.running ? since : 0)) : undefined
  return {
    phase: s.phase,
    round: s.round,
    defenseKey: d?.key,
    defenseName: d?.name,
    defenseStage: d?.stage,
    defenseTalkLeft: d && d.stage === 'talk' ? d.remaining - since : undefined,
    objections: d?.objections,
    hotKey: h?.key,
    hotStage: h?.stage,
    hotSpeaker: h?.speaker,
    roundLeft,
    running: s.running,
    online: info.players.filter((p) => p.online).length,
    ready: info.players.filter((p) => p.online && p.ready).length,
    behindMs: plan ? activityMs - plan.endMin * 60_000 : 0,
    planKey,
    activityMs,
    connected,
  }
}
