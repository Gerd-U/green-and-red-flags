import { GREEN_FLAGS, ICKS, POWER_IDS, RED_FLAGS, SOULMATES } from '../data/cards'
import { mulberry32, shuffled } from './rng'
import type { CardKind, PowerId, ScheduledCard } from './types'

// =====================================================================
//  ALL TIMING AND SCORING KNOBS LIVE HERE
//  Total game time with the defaults: ~11-12 min of play + lobby,
//  so the whole activity fits in ~18 min (see README).
// =====================================================================

export interface RoundConfig {
  name: string
  durationMs: number
  /** fall time (ms) at the start and at the end of the round */
  fallMs: [number, number]
  /** share of green/red cards that fall grey (0..1) */
  greyRatio: number
  /** no power cards before this moment */
  sabotageFromMs: number
  /** every point is multiplied by this */
  pointsMult: number
  theme: 'restaurant' | 'apartment' | 'dining'
  tagline: string
}

export const ROUNDS: RoundConfig[] = [
  {
    name: 'First Date',
    durationMs: 75_000,
    fallMs: [5800, 5000],
    greyRatio: 0,
    sabotageFromMs: 15_000,
    pointsMult: 1,
    theme: 'restaurant',
    tagline: 'Every card shows its true color. Take it easy!',
  },
  {
    name: 'Getting Serious',
    durationMs: 75_000,
    fallMs: [5200, 4400],
    greyRatio: 0.5,
    sabotageFromMs: 5_000,
    pointsMult: 1,
    theme: 'apartment',
    tagline: 'Half the cards are grey. Read before you catch!',
  },
  {
    name: 'Meet the Parents',
    durationMs: 75_000,
    fallMs: [4500, 3700],
    greyRatio: 1,
    sabotageFromMs: 5_000,
    pointsMult: 2,
    theme: 'dining',
    tagline: 'All cards are grey, faster, and points count double!',
  },
]
export const TOTAL_ROUNDS = ROUNDS.length
export const roundConfig = (round: number) => ROUNDS[Math.max(0, Math.min(TOTAL_ROUNDS - 1, round - 1))]

// ---- flow ----
export const TUTORIAL_MS = 20_000
export const COUNTDOWN_MS = 3_000
/** the round's defense can only start after this moment */
export const DEFENSE_AFTER_MS = 10_000
export const DEFENSE_TALK_MS = 20_000
export const DEFENSE_VOTE_MS = 10_000
/** auto countdown after a defense result before the round continues */
export const DEFENSE_RESUME_MS = 10_000
/** time to discuss the "red flag of the round" */
export const DISCUSSION_MS = 60_000
/** auto countdown before the next round (after the discussion) */
export const NEXT_ROUND_MS = 10_000
export const AWARD_SHOW_MS = 4_500
export const SABOTAGE_MS = 5_000
export const HEARTBROKEN_MS = 10_000
/** phone -> admin state updates: ~7 per second */
export const TICK_MS = 140

// ---- scoring ----
export const START_HEARTS = 5
export const GREEN_POINTS = 100
export const RED_PENALTY = 75
export const MISS_PENALTY = 25
export const SOULMATE_POINTS = 300
export const DEFENSE_FAIL_PENALTY = 100
/** multiplier for the next green after 0, 1, 2, 3+ greens in a row */
export const COMBO_MULTS = [1, 1.5, 2, 3]
export const comboMult = (streak: number) => COMBO_MULTS[Math.min(streak, COMBO_MULTS.length - 1)]
export const MAX_STREAK_LEVEL = COMBO_MULTS.length - 1

// ---- cards per round ----
export const GREENS_PER_ROUND = 14
export const REDS_PER_ROUND = 14
export const POWERS_PER_ROUND = 3
export const ICKS_PER_ROUND = 3
export const MAX_SOULMATES_PER_ROUND = 2

// ---- movement ----
export const MOVE_SPEED = 1.15 / 1000 // field widths per ms
export const DASH_DISTANCE = 0.3
export const DASH_MS = 130
export const DASH_COOLDOWN_MS = 1200

// ---- field geometry (normalized: x by width, y by height) ----
export const CARD_W = 0.46
export const CARD_H = 0.14
export const PLAYER_Y = 0.85
export const PLAYER_W = 0.2
export const PLAYER_H = 0.14
export const SPAWN_Y = -0.1
/** horizontal distance (card center to player center) that counts as a catch */
export const HIT_DX = CARD_W * 0.2 + PLAYER_W * 0.25

/**
 * Builds the cards of one round. The deck order comes from `gameSeed`
 * (fixed for the whole game, so the 3 rounds never repeat a card) and the
 * timing/positions from the round `seed`. Same seeds => same cards, same
 * order, same timing on every phone.
 */
export function buildSchedule(seed: number, round: number, gameSeed: number): ScheduledCard[] {
  const cfg = roundConfig(round)
  const r0 = Math.max(0, round - 1)
  const deck = mulberry32(gameSeed)
  const greens = shuffled(GREEN_FLAGS, deck)
  const reds = shuffled(RED_FLAGS, deck)
  const icks = shuffled(ICKS, deck)
  const souls = shuffled(SOULMATES, deck)
  const rand = mulberry32(seed)

  const kinds: CardKind[] = []
  for (let i = 0; i < GREENS_PER_ROUND; i++) kinds.push('green')
  for (let i = 0; i < REDS_PER_ROUND; i++) kinds.push('red')
  for (let i = 0; i < POWERS_PER_ROUND; i++) kinds.push('power')
  for (let i = 0; i < ICKS_PER_ROUND; i++) kinds.push('ick')
  const soulCount = 1 + (rand() < 0.5 ? 1 : 0)
  for (let i = 0; i < Math.min(soulCount, MAX_SOULMATES_PER_ROUND); i++) kinds.push('soulmate')
  const order = shuffled(kinds, rand)

  // even spacing with a bit of jitter
  const start = 1200
  const end = cfg.durationMs - 3800
  const step = (end - start) / order.length
  const times = order.map((_, i) => start + i * step + (rand() - 0.5) * step * 0.5)

  // power cards can't appear before sabotageFromMs: swap them later
  for (let i = 0; i < order.length; i++) {
    if (order[i] !== 'power' || times[i] >= cfg.sabotageFromMs) continue
    const j = order.findIndex((k, idx) => idx > i && k !== 'power' && times[idx] >= cfg.sabotageFromMs)
    if (j > 0) [order[i], order[j]] = [order[j], order[i]]
  }

  const cards: ScheduledCard[] = []
  let gi = r0 * GREENS_PER_ROUND
  let ri = r0 * REDS_PER_ROUND
  let ii = r0 * ICKS_PER_ROUND
  let si = r0 * MAX_SOULMATES_PER_ROUND
  let lastX = 0.5
  order.forEach((kind, id) => {
    const t = times[id]
    const p = t / cfg.durationMs
    const fallMs = cfg.fallMs[0] + (cfg.fallMs[1] - cfg.fallMs[0]) * p
    // avoid two cards in a row at almost the same x
    let x = CARD_W / 2 + rand() * (1 - CARD_W)
    if (Math.abs(x - lastX) < 0.12) x = x > 0.5 ? x - 0.2 : x + 0.2
    lastX = x
    const card: ScheduledCard = { id, t, x, kind, speed: (1 - SPAWN_Y + CARD_H) / fallMs }
    if (kind === 'green') {
      card.text = greens[gi++ % greens.length]
      card.grey = rand() < cfg.greyRatio
    } else if (kind === 'red') {
      card.text = reds[ri++ % reds.length]
      card.grey = rand() < cfg.greyRatio
    } else if (kind === 'ick') {
      card.text = icks[ii++ % icks.length]
    } else if (kind === 'soulmate') {
      card.text = souls[si++ % souls.length]
    } else {
      // therapy (shield) is a bit rarer than the sabotages
      const pool: PowerId[] = [...POWER_IDS.filter((p) => p !== 'therapy'), 'therapy']
      card.power = pool[Math.floor(rand() * pool.length)]
    }
    cards.push(card)
  })
  return cards
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export interface AwardDef {
  id: 'toxic' | 'manipulator' | 'lawyer' | 'victim' | 'ick'
  title: string
  emoji: string
  desc: (n: number) => string
}

export const AWARD_DEFS: AwardDef[] = [
  { id: 'toxic', title: 'Most Toxic', emoji: '☠️', desc: (n) => `caught ${n} red flag${n === 1 ? '' : 's'}` },
  { id: 'manipulator', title: 'Master Manipulator', emoji: '🧠', desc: (n) => `sent ${n} sabotage${n === 1 ? '' : 's'}` },
  { id: 'lawyer', title: 'Best Lawyer', emoji: '⚖️', desc: (n) => `${n} "Convinced" vote${n === 1 ? '' : 's'}` },
  { id: 'victim', title: 'Victim of the Night', emoji: '🥀', desc: (n) => `got sabotaged ${n} time${n === 1 ? '' : 's'}` },
  { id: 'ick', title: 'The Ick Collector', emoji: '🤢', desc: (n) => `collected ${n} ick${n === 1 ? '' : 's'}` },
]
