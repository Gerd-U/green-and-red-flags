// All sounds are synthesized with Web Audio: no audio files.
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
  if (!v) stopMusic()
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

// ---- background music (projector only): a simple chiptune loop ----
let musicTimer: number | null = null
let musicGain: GainNode | null = null
let step = 0
let nextTime = 0
let tempo = 112

// I - vi - IV - V in C
const CHORDS = [
  [0, 4, 7],
  [-3, 0, 4],
  [-7, -3, 0],
  [-5, -1, 2],
]

export function startMusic(bpm = 112) {
  tempo = bpm
  if (!musicOn) return
  const c = ac()
  if (!c || !master || musicTimer !== null) return
  musicGain = c.createGain()
  musicGain.gain.value = 0.22
  musicGain.connect(master)
  nextTime = c.currentTime + 0.1
  step = 0
  musicTimer = window.setInterval(() => {
    if (!ctx || !musicGain) return
    if (ctx.state !== 'running') {
      nextTime = ctx.currentTime + 0.1
      return
    }
    const eighth = 60 / tempo / 2
    while (nextTime < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / 8) % CHORDS.length
      const chord = CHORDS[bar]
      const i = step % 8
      // bass on beats
      if (i % 2 === 0) tone(N(chord[0] - 12), nextTime, eighth * 1.6, 'triangle', 0.35, undefined, musicGain)
      // arpeggio
      const note = chord[[0, 1, 2, 1, 0, 1, 2, 1][i]] + (i >= 4 ? 12 : 0)
      tone(N(note + 12), nextTime, eighth * 0.8, 'square', 0.09, undefined, musicGain)
      // hi-hat
      if (i % 2 === 1) noise(nextTime, 0.03, 0.03, 8000)
      nextTime += eighth
      step++
    }
  }, 30)
}

export function setMusicTempo(bpm: number) {
  tempo = bpm
}

/** Lower the music (e.g. while someone is defending). */
export function duckMusic(on: boolean) {
  if (!musicGain || !ctx) return
  musicGain.gain.setTargetAtTime(on ? 0.04 : 0.22, ctx.currentTime, 0.2)
}

export function stopMusic() {
  if (musicTimer !== null) window.clearInterval(musicTimer)
  musicTimer = null
  try {
    musicGain?.disconnect()
  } catch {
    /* ignore */
  }
  musicGain = null
}
