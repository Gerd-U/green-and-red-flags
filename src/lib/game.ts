import { fullText, GREEN_FLAGS, ICKS, POWER_IDS, RED_FLAGS, SOULMATES } from '../data/cards'
import { mulberry32, shuffled } from './rng'
import type { CardKind, PowerId, ScheduledCard } from './types'

// =====================================================================
//  ALL TIMING AND SCORING KNOBS LIVE HERE
//
//  Planned activity (~27 min, hard limit 30), see PLAN below:
//    Intro (host talks)              2:00
//    Lobby (join + profiles)         4:00
//    Tutorial                        0:20
//    Round 1 + defense               ~2:05   (3 s countdown + 75 s + ~45 s)
//    Results                         0:15
//    Hot Take 1 (vote + debate)      ~3:00   (host decides when to move on)
//    Round 2 + defense               ~2:05
//    Results                         0:15
//    Hot Take 2                      ~3:00
//    Round 3 + defense               ~2:05
//    Results + awards                ~0:45
//    Podium                          ~1:00
//    Final thoughts (host talks)     ~3:00
//  If the class runs late: skip a Hot Take, or lower durationMs to 60_000.
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
  /** chance that a row brings two cards at once */
  pairChance: number
  theme: 'restaurant' | 'apartment' | 'dining'
  tagline: string
}

export const ROUNDS: RoundConfig[] = [
  {
    name: 'First Date',
    durationMs: 75_000,
    fallMs: [5300, 4500],
    greyRatio: 0,
    sabotageFromMs: 15_000,
    pointsMult: 1,
    pairChance: 0.35,
    theme: 'restaurant',
    tagline: 'Every card shows its true color. Take it easy!',
  },
  {
    name: 'Getting Serious',
    durationMs: 75_000,
    fallMs: [4900, 4100],
    greyRatio: 0.5,
    sabotageFromMs: 5_000,
    pointsMult: 1,
    pairChance: 0.45,
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
    pairChance: 0.55,
    theme: 'dining',
    tagline: 'All cards are grey, faster, and points count double!',
  },
]
export const TOTAL_ROUNDS = ROUNDS.length
export const roundConfig = (round: number) => ROUNDS[Math.max(0, Math.min(TOTAL_ROUNDS - 1, round - 1))]

// ---- flow ----
export const TUTORIAL_MS = 20_000
/** "Starting soon" countdown the host can run in the lobby */
export const LOBBY_COUNTDOWN_MS = 60_000
export const COUNTDOWN_MS = 3_000
/** the round's defense can only start after this moment */
export const DEFENSE_AFTER_MS = 10_000
export const DEFENSE_TALK_MS = 20_000
export const DEFENSE_VOTE_MS = 10_000
/** "Objection!" from the host adds this to the talking time */
export const OBJECTION_MS = 10_000
/** auto countdown after a defense result before the round continues */
export const DEFENSE_RESUME_MS = 10_000
/** round results (ranking) before the Hot Take / awards */
export const ROUND_RESULTS_MS = 15_000
/** Hot Take: secret vote time and time for each person who gets the word */
export const HOTTAKE_VOTE_MS = 15_000
export const HOTTAKE_SPEAKER_MS = 30_000
/** Hot Takes happen after these rounds */
export const HOTTAKE_AFTER_ROUNDS = [1, 2]
export const AWARD_SHOW_MS = 4_500
export const SABOTAGE_MS = 5_000
export const HEARTBROKEN_MS = 10_000
/** how long the full sentence of a caught card stays on screen */
export const CATCH_REVEAL_MS = 1_000
/** phone -> admin state updates: ~7 per second */
export const TICK_MS = 140

/** Planned schedule (minutes from room creation) used for the host's "behind schedule" warning. */
export const ACTIVITY_LIMIT_MIN = 30
export const PLAN: { key: string; label: string; endMin: number }[] = [
  { key: 'intro', label: 'Intro', endMin: 2 },
  { key: 'lobby', label: 'Lobby', endMin: 6 },
  { key: 'tutorial', label: 'Tutorial', endMin: 6.5 },
  { key: 'round1', label: 'Round 1', endMin: 8.75 },
  { key: 'hottake1', label: 'Hot Take 1', endMin: 11.75 },
  { key: 'round2', label: 'Round 2', endMin: 14 },
  { key: 'hottake2', label: 'Hot Take 2', endMin: 17 },
  { key: 'round3', label: 'Round 3', endMin: 19.25 },
  { key: 'awards', label: 'Awards & podium', endMin: 21.5 },
  { key: 'final', label: 'Final thoughts', endMin: 25 },
]

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
export const MOVE_SPEED = 1.2 / 1000 // field widths per ms
export const DASH_DISTANCE = 0.3
export const DASH_MS = 130
export const DASH_COOLDOWN_MS = 1200

// ---- field geometry (normalized: x by width, y by height) ----
export const CARD_W = 0.31
export const CARD_H = 0.09
export const PLAYER_Y = 0.82
/** width of the avatar box; the drawn body is ~50% of it (measured in the DOM) */
export const PLAYER_W = 0.25
export const PLAYER_BODY_W = PLAYER_W * 0.5
/** from the top of the hair to the feet (normalized to the field height) */
export const PLAYER_H = 0.16
/** cards start already visible at the top (the upper half never looks empty) */
export const SPAWN_Y = 0.02
/**
 * Horizontal distance (card center to player center) that counts as a catch:
 * the card and the drawn body must really overlap (minus a 1% grace margin),
 * so a card that visually missed you never counts.
 */
export const HIT_DX = CARD_W / 2 + PLAYER_BODY_W / 2 - 0.01
/** minimum free gap between two cards of the same row (the body fits through) */
export const ROW_GAP = PLAYER_BODY_W + 0.06

/**
 * Builds the cards of one round. The deck order comes from `gameSeed`
 * (fixed for the whole game, so the 3 rounds never repeat a card) and the
 * timing/positions from the round `seed`. Same seeds => same cards, same
 * order, same timing on every phone.
 *
 * Cards come in rows: one card, or two cards at the same moment with a gap
 * between them wide enough to dodge. Rows are far enough apart that never
 * more than 2 cards share the same horizontal band.
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

  // group into rows of 1 or 2 (power / soulmate always alone)
  const rows: CardKind[][] = []
  for (let i = 0; i < order.length; ) {
    const a = order[i]
    const b = order[i + 1]
    const solo = (k: CardKind) => k === 'power' || k === 'soulmate'
    if (b && !solo(a) && !solo(b) && rand() < cfg.pairChance) {
      rows.push([a, b])
      i += 2
    } else {
      rows.push([a])
      i += 1
    }
  }

  // even spacing with a bit of jitter
  const start = 1200
  const end = cfg.durationMs - 3500
  const step = (end - start) / rows.length
  const times = rows.map((_, i) => start + i * step + (rand() - 0.5) * step * 0.35)

  // power cards can't appear before sabotageFromMs: swap their row with a later one
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].includes('power') || times[i] >= cfg.sabotageFromMs) continue
    const j = rows.findIndex((r, idx) => idx > i && !r.includes('power') && times[idx] >= cfg.sabotageFromMs)
    if (j > 0) [rows[i], rows[j]] = [rows[j], rows[i]]
  }

  const minX = CARD_W / 2
  const span = 1 - CARD_W
  const cards: ScheduledCard[] = []
  let gi = r0 * GREENS_PER_ROUND
  let ri = r0 * REDS_PER_ROUND
  let ii = r0 * ICKS_PER_ROUND
  let si = r0 * MAX_SOULMATES_PER_ROUND
  let lastX = 0.5
  let id = 0
  rows.forEach((row, rowIdx) => {
    const t = times[rowIdx]
    const p = t / cfg.durationMs
    const fallMs = cfg.fallMs[0] + (cfg.fallMs[1] - cfg.fallMs[0]) * p
    const speed = (1 - SPAWN_Y + CARD_H) / fallMs
    let xs: number[]
    if (row.length === 2) {
      // two cards: leave at least ROW_GAP free between them
      const need = CARD_W + ROW_GAP
      const x1 = minX + rand() * (span - need)
      const x2 = x1 + need + rand() * (span - need - (x1 - minX))
      xs = rand() < 0.5 ? [x1, x2] : [x2, x1]
    } else {
      let x = minX + rand() * span
      if (Math.abs(x - lastX) < 0.12) x = x > 0.5 ? x - 0.22 : x + 0.22
      xs = [x]
    }
    lastX = xs[0]
    row.forEach((kind, k) => {
      const card: ScheduledCard = { id: id++, t, x: Math.max(minX, Math.min(1 - minX, xs[k])), kind, speed }
      const set = (c: { short: string; full?: string }) => {
        card.text = c.short
        card.full = fullText(c)
      }
      if (kind === 'green') {
        set(greens[gi++ % greens.length])
        card.grey = rand() < cfg.greyRatio
      } else if (kind === 'red') {
        set(reds[ri++ % reds.length])
        card.grey = rand() < cfg.greyRatio
      } else if (kind === 'ick') {
        set(icks[ii++ % icks.length])
      } else if (kind === 'soulmate') {
        set(souls[si++ % souls.length])
      } else {
        // therapy (shield) is a bit rarer than the sabotages
        const pool: PowerId[] = [...POWER_IDS.filter((pw) => pw !== 'therapy'), 'therapy']
        card.power = pool[Math.floor(rand() * pool.length)]
      }
      cards.push(card)
    })
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
