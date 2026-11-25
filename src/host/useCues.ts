import { useCallback, useEffect, useRef, useState } from 'react'
import { cueDing, unlockAudio } from '../lib/sfx'
import { load, save } from '../lib/storage'
import type { HostInfo } from '../lib/types'
import { CUE_STYLE, CUES, cueContext, type CueCtx, type CueKind } from './cues'

export interface FiredCue {
  key: string
  id: string
  kind: CueKind
  text: string
  at: number
  /** phase when it fired: the banner goes away when the phase changes */
  phase: string
}

export interface CuePrefs {
  vibration: boolean
  flash: boolean
  sound: boolean
}

const PREFS_KEY = 'gr.cuePrefs'
const PRIORITY: Record<CueKind, number> = { warn: 3, speak: 2, act: 1 }

function vibrate(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported (iPhone, desktop): the flash and banner still work */
  }
}

/**
 * Watches the host info and fires each cue of CUES once, at the right moment.
 * Side effects: vibration pattern, screen-border flash, optional quiet ding.
 */
export function useCues(info: HostInfo | null, receivedAt: number, connected: boolean, planKey: string) {
  const [prefs, setPrefs] = useState<CuePrefs>(() => ({ vibration: true, flash: true, sound: false, ...load<Partial<CuePrefs>>(PREFS_KEY, {}) }))
  const [banner, setBanner] = useState<FiredCue | null>(null)
  const [flash, setFlash] = useState<{ kind: CueKind; n: number } | null>(null)
  const [history, setHistory] = useState<FiredCue[]>([])
  const prev = useRef<CueCtx | null>(null)
  const fired = useRef(new Set<string>())
  const prefsRef = useRef(prefs)
  const readySince = useRef(0)
  prefsRef.current = prefs

  const updatePrefs = (p: Partial<CuePrefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...p }
      save(PREFS_KEY, next)
      return next
    })
  }

  /** Vibrate + flash + sound for one cue (several cues are spaced out). */
  const signal = useCallback((kind: CueKind, delay = 0) => {
    window.setTimeout(() => {
      const pf = prefsRef.current
      if (pf.vibration) vibrate(CUE_STYLE[kind].vibrate)
      if (pf.flash) setFlash({ kind, n: Date.now() })
      if (pf.sound) cueDing(kind)
    }, delay)
  }, [])

  const fire = useCallback(
    (list: FiredCue[]) => {
      if (!list.length) return
      list.forEach((c, i) => {
        signal(c.kind, i * 1300)
        if (import.meta.env.DEV) {
          console.info('[cue]', c.kind.toUpperCase(), c.id, '-', c.text)
          const w = window as unknown as { __cues?: FiredCue[] }
          ;(w.__cues ??= []).push(c)
        }
      })
      const top = [...list].sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind])[0]
      setBanner(top)
      setHistory((h) => [...list.slice().reverse(), ...h].slice(0, 3))
    },
    [signal]
  )

  // check every 300 ms (time-based cues need interpolated timers)
  useEffect(() => {
    const check = () => {
      if (!info) return
      const since = performance.now() - receivedAt
      const cur = cueContext(info, since, connected, planKey)
      const allReady = cur.phase === 'lobby' && cur.online >= 2 && cur.ready === cur.online
      if (!allReady) readySince.current = 0
      else readySince.current ||= performance.now()
      cur.readyStableMs = allReady ? performance.now() - readySince.current : 0
      const p = prev.current
      const out: FiredCue[] = []
      for (const def of CUES) {
        const key = def.when(p, cur)
        if (!key || fired.current.has(key)) continue
        fired.current.add(key)
        out.push({ key, id: def.id, kind: def.kind, text: def.text(cur), at: Date.now(), phase: cur.phase })
      }
      prev.current = cur
      fire(out)
      // the banner goes away when the phase changes (unless a new cue replaced it)
      setBanner((b) => (b && b.phase !== cur.phase && !out.length && b.id !== 'disconnected' ? null : b))
    }
    check()
    const id = window.setInterval(check, 300)
    return () => window.clearInterval(id)
  }, [info, receivedAt, connected, planKey, fire])

  /** Fires SPEAK, ACT and WARN one after the other, to try them before class. */
  const testCues = () => {
    unlockAudio()
    const kinds: CueKind[] = ['speak', 'act', 'warn']
    kinds.forEach((kind, i) =>
      window.setTimeout(() => {
        const c: FiredCue = { key: `test-${kind}-${Date.now()}`, id: 'test', kind, text: `Test: ${CUE_STYLE[kind].label.toLowerCase()}`, at: Date.now(), phase: info?.state.phase ?? '' }
        fire([c])
      }, i * 1800)
    )
  }

  return { prefs, updatePrefs, banner, dismiss: () => setBanner(null), flash, history, testCues }
}
