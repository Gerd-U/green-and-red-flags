/**
 * Vibrate the phone and remember what happened (the host's ⚙️ menu shows it).
 *
 * Chrome on Android only vibrates after the person has tapped the page at
 * least once (the "Start hosting" tap does that). Even then the phone itself
 * can refuse: silent mode, Do Not Disturb or battery saver. In that case
 * navigator.vibrate() returns false.
 */
export type BuzzResult = 'ok' | 'refused' | 'no-api' | 'no-tap' | 'error'

let last: { result: BuzzResult; at: number } | null = null
const listeners = new Set<() => void>()

export const hasVibrationApi = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
export const lastBuzz = () => last
export function onBuzz(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function record(result: BuzzResult) {
  last = { result, at: Date.now() }
  listeners.forEach((cb) => cb())
}

/** for a direct navigator.vibrate() call made inside a tap: remember its result */
export function noteBuzz(ok: boolean) {
  record(ok ? 'ok' : 'refused')
}

export function buzz(pattern: number | number[]): boolean {
  try {
    if (!hasVibrationApi()) {
      record('no-api')
      return false
    }
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
    // nobody tapped this page yet (bots, demo frames): the browser would block it
    if (ua && !ua.hasBeenActive) {
      record('no-tap')
      return false
    }
    const ok = navigator.vibrate(pattern)
    record(ok ? 'ok' : 'refused')
    return ok
  } catch {
    record('error')
    return false
  }
}
