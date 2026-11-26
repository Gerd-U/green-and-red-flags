/**
 * Vibrate the phone, quietly. Browsers only allow it after the person has
 * tapped the page (bots and the projector's demo frames never do), so skip it
 * then instead of filling the console with "Blocked call" errors.
 */
export function buzz(pattern: number | number[]): void {
  try {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
    if (ua && !ua.hasBeenActive) return
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported (iPhone, desktop) */
  }
}
