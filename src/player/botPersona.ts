import { mulberry32 } from '../lib/rng'

/**
 * Each bot (demo mode and /dev/bots) gets its own way of playing, so a
 * rehearsal looks like a real class and not 6 copies of the same player.
 * Everything comes from the bot's id: the same bot always plays the same way.
 */
export interface BotPersona {
  /** ms between decisions (slow thinkers react late) */
  thinkMs: number
  /** cards are only noticed after they fall this far (0..1 of the field) */
  noticeY: number
  /** share of cards it gets wrong (catches a red, dodges a green) */
  mistakes: number
  /** chance of guessing a grey card's color right before it shows */
  greyRead: number
  /** how much it dislikes walking far (lazy bots stay around) */
  laziness: number
  /** stops when this close to where it wants to be (less precise = bigger) */
  slop: number
  /** chance of dashing when the target is far */
  dashy: number
}

export function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function makePersona(id: string): BotPersona {
  const r = mulberry32(hashId(id))
  const lerp = (a: number, b: number) => a + (b - a) * r()
  return {
    thinkMs: lerp(90, 380),
    noticeY: lerp(0.12, 0.42),
    mistakes: lerp(0.02, 0.15),
    greyRead: lerp(0.6, 0.92),
    laziness: lerp(0.3, 1.4),
    slop: lerp(0.015, 0.06),
    dashy: lerp(0, 0.5),
  }
}

/** A fixed "random" number for this bot and this card (0..1), so a decision doesn't flicker. */
export function cardRoll(seed: number, cardId: number, salt: number): number {
  return mulberry32(seed ^ Math.imul(cardId + 1, 2654435761) ^ salt)()
}
