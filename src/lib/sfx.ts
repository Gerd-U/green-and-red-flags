// All game sounds are synthesized with Web Audio (the music lives in music.ts).
import { load, save } from './storage'

export type Sfx =
  | 'green'
  | 'red'
  | 'miss'
  | 'combo'
  | 'soulmate'
  | 'ick'
  | 'sabotage'
  | 'shield'
  | 'dash'
  | 'countdown'
  | 'go'
  | 'roundEnd'
  | 'announce'
  | 'defense'
  | 'vote'
  | 'award'
  | 'last10'
  | 'objection'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function ac(): AudioContext | null {
  if (ctx) return ctx
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  } catch {
    ctx = null
  }
  return ctx
}

/** The shared audio context and master volume (for music.ts). */
export function getAudio(): { ctx: AudioContext; master: GainNode } | null {
  const c = ac()
  return c && master ? { ctx: c, master } : null
}

/** Browsers only allow audio after a user gesture: call this on the first tap/click. */
export function unlockAudio() {
  const c = ac()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

// ---- mute settings (remembered per device) ----
const SFX_KEY = 'gr.sound'
const MUSIC_KEY = 'gr.music'
let sfxOn = load<boolean>(SFX_KEY, true)
let musicOn = load<boolean>(MUSIC_KEY, true)
export const isSfxOn = () => sfxOn
export const isMusicOn = () => musicOn
export function setSfxOn(v: boolean) {
  sfxOn = v
  save(SFX_KEY, v)
}
export function setMusicOn(v: boolean) {
  musicOn = v
  save(MUSIC_KEY, v)
}

// ---- tiny synth helpers ----
function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.2, slideTo?: number, out?: AudioNode) {
  const c = ac()
  if (!c || !master) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, start)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g)
  g.connect(out ?? master)
  o.start(start)
  o.stop(start + dur + 0.02)
}

function noise(start: number, dur: number, vol = 0.15, filterFreq = 1800) {
  const c = ac()
  if (!c || !master) return
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = filterFreq
  const g = c.createGain()
  g.gain.value = vol
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start(start)
}

const N = (semi: number) => 440 * Math.pow(2, (semi - 9) / 12) // semitones from C4... roughly

export function playSfx(name: Sfx, opts: { level?: number } = {}) {
  if (!sfxOn) return
  const c = ac()
  if (!c || c.state !== 'running') return
  const t = c.currentTime + 0.01
  switch (name) {
    case 'green': {
      const up = (opts.level ?? 0) * 2
      tone(N(12 + up), t, 0.09, 'square', 0.12)
      tone(N(19 + up), t + 0.07, 0.14, 'square', 0.12)
      break
    }
    case 'red':
      tone(220, t, 0.35, 'sawtooth', 0.16, 70)
      tone(233, t, 0.35, 'square', 0.08, 75)
      break
    case 'miss':
      tone(180, t, 0.12, 'triangle', 0.12, 120)
      break
    case 'combo':
      ;[0, 4, 7, 12, 16].forEach((s, i) => tone(N(12 + s), t + i * 0.06, 0.12, 'square', 0.1))
      break
    case 'soulmate':
      ;[0, 4, 7, 11, 14, 19].forEach((s, i) => tone(N(12 + s), t + i * 0.05, 0.4, 'triangle', 0.12))
      break
    case 'ick':
      tone(300, t, 0.15, 'sawtooth', 0.1, 160)
      tone(160, t + 0.15, 0.25, 'sawtooth', 0.1, 260)
      break
    case 'sabotage':
      tone(1200, t, 0.35, 'sawtooth', 0.12, 90)
      noise(t, 0.3, 0.12, 900)
      break
    case 'shield':
      tone(N(7), t, 0.12, 'triangle', 0.15)
      tone(N(19), t + 0.08, 0.3, 'triangle', 0.12)
      break
    case 'dash':
      noise(t, 0.16, 0.18, 3000)
      break
    case 'countdown':
      tone(N(12), t, 0.15, 'square', 0.12)
      break
    case 'go':
      tone(N(24), t, 0.35, 'square', 0.14)
      break
    case 'last10':
      tone(N(24), t, 0.08, 'square', 0.1)
      tone(N(24), t + 0.16, 0.08, 'square', 0.1)
      break
    case 'announce':
      tone(N(7), t, 0.1, 'square', 0.12)
      tone(N(12), t + 0.08, 0.2, 'square', 0.12)
      noise(t, 0.08, 0.08, 4000)
      break
    case 'defense':
      ;[0, -1, -2, -6].forEach((s, i) => tone(N(s), t + i * 0.18, 0.3, 'sawtooth', 0.12))
      break
    case 'vote':
      tone(N(16), t, 0.1, 'triangle', 0.12)
      break
    case 'roundEnd':
      ;[0, 4, 7, 12].forEach((s, i) => tone(N(12 + s), t + i * 0.12, 0.25, 'square', 0.12))
      tone(N(24), t + 0.5, 0.6, 'triangle', 0.14)
      break
    case 'objection':
      noise(t, 0.12, 0.3, 500)
      tone(110, t, 0.25, 'square', 0.2, 80)
      ;[0, 3, 7].forEach((s, i) => tone(N(s + 5), t + 0.15 + i * 0.07, 0.35, 'sawtooth', 0.12))
      break
    case 'award':
      ;[0, 7, 12, 16, 19, 24].forEach((s, i) => tone(N(s + 7), t + i * 0.08, 0.3, 'square', 0.1))
      noise(t + 0.45, 0.4, 0.06, 6000)
      break
  }
}

/**
 * Quiet "ding" for the host's cues. Separate from the game sounds (it ignores
 * the sfx mute) and soft on purpose so the class doesn't hear it.
 */
export function cueDing(kind: 'speak' | 'act' | 'warn') {
  const c = ac()
  if (!c || c.state !== 'running') return
  const t = c.currentTime + 0.01
  if (kind === 'speak') tone(N(19), t, 0.35, 'sine', 0.06)
  else if (kind === 'act') {
    tone(N(24), t, 0.12, 'sine', 0.05)
    tone(N(24), t + 0.18, 0.12, 'sine', 0.05)
  } else {
    ;[0, 0.14, 0.28].forEach((d) => tone(N(7), t + d, 0.1, 'triangle', 0.06))
  }
}
