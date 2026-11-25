import { GREEN_FLAGS, RED_FLAGS, POWER_IDS } from '../data/cards'
import { mulberry32, shuffled } from './rng'
import type { CardKind, ScheduledCard } from './types'

export const ROUND_MS = 60000
export const COUNTDOWN_MS = 3000
export const DEFENSE_MS = 30000
export const SABOTAGE_MS = 5000
export const START_LIVES = 3
export const GREEN_POINTS = 100
export const RED_PENALTY = 75

// Field geometry (normalized: x by width, y by height)
export const CARD_W = 0.46
export const CARD_H = 0.12
export const PLAYER_Y = 0.86
export const PLAYER_W = 0.2
export const PLAYER_H = 0.12
export const SPAWN_Y = -0.1

// Builds the full list of cards for a round. Same seed => same cards,
// same order and same timing on every phone.
export function buildSchedule(seed: number): ScheduledCard[] {
  const rand = mulberry32(seed)
  const greens = shuffled(GREEN_FLAGS, rand)
  const reds = shuffled(RED_FLAGS, rand)
  const cards: ScheduledCard[] = []
  let t = 700
  let gi = 0
  let ri = 0
  let lastPower = -99999
  let id = 0
  while (t < ROUND_MS - 2500) {
    const p = t / ROUND_MS
    const r = rand()
    let kind: CardKind
    if (r < 0.1 && t > 5000 && t - lastPower > 8000) kind = 'power'
    else if (r < 0.56) kind = 'green'
    else kind = 'red'
    const x = 0.25 + rand() * 0.5
    const fallMs = 4800 - 1500 * p
    const card: ScheduledCard = { id: id++, t, x, kind, speed: (1 + CARD_H + 0.2) / fallMs }
    if (kind === 'green') card.text = greens[gi++ % greens.length]
    else if (kind === 'red') card.text = reds[ri++ % reds.length]
    else {
      card.power = POWER_IDS[Math.floor(rand() * POWER_IDS.length)]
      lastPower = t
    }
    cards.push(card)
    t += 1250 - 400 * p + rand() * 350
  }
  return cards
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}
