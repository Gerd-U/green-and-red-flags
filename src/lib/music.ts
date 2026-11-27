// Background music for the projector.
//
// Two sources:
//  1. Real songs, if the files exist in public/music/ (lobby.mp3, round1.mp3,
//     round2.mp3, round3.mp3, podium.mp3). Crossfade when the style changes.
//  2. Otherwise, music generated with Web Audio: drums, bass, a soft pad and a
//     short catchy hook, one style per part of the game.
import { getAudio, isMusicOn } from './sfx'

export type MusicStyle = 'lobby' | 'round1' | 'round2' | 'round3' | 'podium'

const VOLUME = 0.26
const DUCKED = 0.05
const FADE_S = 1.5

let style: MusicStyle = 'lobby'
let ducked = false
let boost = false
let running = false

// ===================================================================
//  1. real songs (public/music/*.mp3)
// ===================================================================
const fileOk: Partial<Record<MusicStyle, boolean>> = {}
const checking: Partial<Record<MusicStyle, Promise<boolean>>> = {}
let song: HTMLAudioElement | null = null
let songStyle: MusicStyle | null = null

/** The dev server and Vercel answer a missing file with index.html, so check the type too. */
function hasFile(s: MusicStyle): Promise<boolean> {
  if (fileOk[s] !== undefined) return Promise.resolve(Boolean(fileOk[s]))
  checking[s] ??= fetch(`/music/${s}.mp3`, { method: 'HEAD' })
    .then((r) => r.ok && /audio|mpeg|octet-stream/.test(r.headers.get('content-type') ?? ''))
    .catch(() => false)
    .then((ok) => (fileOk[s] = ok))
  return checking[s]!
}

function fadeTo(el: HTMLAudioElement, target: number, seconds: number, then?: () => void) {
  const from = el.volume
  const t0 = performance.now()
  const id = window.setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / (seconds * 1000))
    el.volume = Math.max(0, Math.min(1, from + (target - from) * k))
    if (k >= 1) {
      window.clearInterval(id)
      then?.()
    }
  }, 50)
}

const songVolume = () => (ducked ? DUCKED : VOLUME) * 2.2 // mp3s are quieter than the synth bus

function playSong(s: MusicStyle) {
  if (songStyle === s && song) {
    if (song.paused) song.play().catch(() => {}) // the first try was before a click
    return
  }
  const old = song
  if (old) fadeTo(old, 0, FADE_S, () => old.pause())
  const el = new Audio(`/music/${s}.mp3`)
  el.loop = true
  el.volume = 0
  el.play().catch(() => {})
  fadeTo(el, songVolume(), FADE_S)
  song = el
  songStyle = s
}

function stopSong() {
  const old = song
  if (old) fadeTo(old, 0, 0.6, () => old.pause())
  song = null
  songStyle = null
}

// ===================================================================
//  2. generated music
// ===================================================================
interface Pattern {
  bpm: number
  /** 16 steps per bar; numbers are velocities (0..1) */
  kick: number[]
  snare: number[]
  clap: number[]
  hat: number[]
  openHat: number[]
  /** bass: semitone offset from the chord root per step (null = rest) */
  bass: (number | null)[]
  bassType: OscillatorType
  /** chords: semitones from C4, one per bar */
  chords: number[][]
  /** hook: 32 steps (2 bars), semitones from C5, null = rest */
  lead: (number | null)[]
  leadType: OscillatorType
  swing?: number
}

const _ = null
const S = (s: string) => s.split('').map((c) => (c === 'x' ? 1 : c === 'o' ? 0.55 : c === '.' ? 0.3 : 0))

const STYLES: Record<MusicStyle, Pattern> = {
  // calm Latin pop groove (~95 BPM)
  lobby: {
    bpm: 95,
    kick: S('x-----x-x-------'),
    snare: S('----o-------o---'),
    clap: S('----------------'),
    hat: S('.-o-.-o-.-o-.-o-'),
    openHat: S('----------------'),
    bass: [0, _, _, 7, _, _, 12, _, 0, _, _, 7, _, 5, _, _],
    bassType: 'triangle',
    chords: [
      [-3, 0, 4],
      [-7, -3, 0],
      [0, 4, 7],
      [-5, -1, 2],
    ],
    lead: [9, _, 7, _, 4, _, _, 2, 4, _, _, _, _, _, _, _, 9, _, 7, _, 4, _, 7, _, 9, _, _, _, _, _, _, _],
    leadType: 'triangle',
    swing: 0.12,
  },
  // reggaeton / dembow (~95 BPM)
  round1: {
    bpm: 95,
    kick: S('x---x---x---x---'),
    snare: S('---x--x----x--x-'),
    clap: S('----------------'),
    hat: S('o-.-o-.-o-.-o-.-'),
    openHat: S('----------------'),
    bass: [0, _, _, 0, _, _, 0, _, 0, _, _, 0, _, _, 7, _],
    bassType: 'sine',
    chords: [
      [2, 5, 9],
      [-2, 2, 5],
      [-7, -3, 0],
      [0, 4, 7],
    ],
    lead: [14, _, 12, _, 9, _, 12, _, _, _, 9, _, 7, _, _, _, 14, _, 12, _, 9, _, 7, _, 5, _, _, _, 7, _, _, _],
    leadType: 'square',
  },
  // dance pop, four on the floor (~118 BPM)
  round2: {
    bpm: 118,
    kick: S('x---x---x---x---'),
    snare: S('----------------'),
    clap: S('----x-------x---'),
    hat: S('.-.-.-.-.-.-.-.-'),
    openHat: S('--x---x---x---x-'),
    bass: [_, _, 12, _, _, _, 12, _, _, _, 12, _, _, _, 12, 7],
    bassType: 'sawtooth',
    chords: [
      [0, 4, 7],
      [-5, -1, 2],
      [-3, 0, 4],
      [-7, -3, 0],
    ],
    lead: [7, _, 7, _, 9, _, 7, _, 4, _, _, _, 2, _, 4, _, 7, _, 7, _, 9, _, 12, _, 11, _, _, _, 7, _, _, _],
    leadType: 'square',
  },
  // fast electro (~128 BPM)
  round3: {
    bpm: 128,
    kick: S('x---x---x---x---'),
    snare: S('----------------'),
    clap: S('----x-------x---'),
    hat: S('xoxoxoxoxoxoxoxo'),
    openHat: S('--o---o---o---o-'),
    bass: [0, 0, 12, 0, 0, 12, 0, 12, 0, 0, 12, 0, 0, 12, 0, 12],
    bassType: 'sawtooth',
    chords: [
      [-3, 0, 4],
      [-3, 0, 4],
      [-7, -3, 0],
      [-5, -1, 2],
    ],
    lead: [9, _, 12, _, 9, _, 16, _, 15, _, 12, _, 9, _, _, _, 9, _, 12, _, 9, _, 19, _, 17, _, 16, _, 12, _, _, _],
    leadType: 'sawtooth',
  },
  // celebration (~120 BPM, major, bright)
  podium: {
    bpm: 120,
    kick: S('x---x---x---x---'),
    snare: S('----x-------x---'),
    clap: S('----x-------x--x'),
    hat: S('.-o-.-o-.-o-.-o-'),
    openHat: S('--o---o---o---o-'),
    bass: [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, 7, 12, _],
    bassType: 'square',
    chords: [
      [0, 4, 7],
      [-5, -1, 2],
      [-3, 0, 4],
      [-7, -3, 0],
    ],
    lead: [12, _, 16, _, 19, _, 24, _, _, _, 19, _, 24, _, _, _, 12, _, 16, _, 19, _, 17, _, 16, _, 14, _, 12, _, _, _],
    leadType: 'square',
  },
}

const freq = (semi: number) => 261.63 * Math.pow(2, semi / 12) // semitones from C4

let bus: GainNode | null = null // music volume (ducking)
let dry: GainNode | null = null
let delayIn: GainNode | null = null
let reverbIn: GainNode | null = null
let timer: number | null = null
let step = 0
let nextTime = 0
let noiseBuf: AudioBuffer | null = null

function buildBus(c: AudioContext, out: AudioNode) {
  bus = c.createGain()
  bus.gain.value = ducked ? DUCKED : VOLUME
  bus.connect(out)
  dry = c.createGain()
  dry.connect(bus)
  // simple echo for the hook
  const delay = c.createDelay(1)
  delay.delayTime.value = (60 / STYLES[style].bpm) * 0.75
  const fb = c.createGain()
  fb.gain.value = 0.28
  const wet = c.createGain()
  wet.gain.value = 0.35
  delayIn = c.createGain()
  delayIn.connect(delay)
  delay.connect(fb)
  fb.connect(delay)
  delay.connect(wet)
  wet.connect(bus)
  // small room reverb: decaying noise as the impulse response
  const len = Math.floor(c.sampleRate * 1.6)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  }
  const conv = c.createConvolver()
  conv.buffer = ir
  const rwet = c.createGain()
  rwet.gain.value = 0.22
  reverbIn = c.createGain()
  reverbIn.connect(conv)
  conv.connect(rwet)
  rwet.connect(bus)
  // shared white noise for the drums
  noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
  const nd = noiseBuf.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
}

function env(c: AudioContext, t: number, peak: number, attack: number, decay: number, to: AudioNode) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  g.connect(to)
  return g
}

function kick(c: AudioContext, t: number, v: number) {
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(150, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.13)
  o.connect(env(c, t, 0.95 * v, 0.004, 0.32, dry!))
  o.start(t)
  o.stop(t + 0.4)
}

function noiseHit(c: AudioContext, t: number, v: number, type: BiquadFilterType, f: number, decay: number, to: AudioNode = dry!) {
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const flt = c.createBiquadFilter()
  flt.type = type
  flt.frequency.value = f
  src.connect(flt)
  flt.connect(env(c, t, v, 0.002, decay, to))
  src.start(t, Math.random() * 0.5, decay + 0.05)
}

function snare(c: AudioContext, t: number, v: number) {
  noiseHit(c, t, 0.32 * v, 'highpass', 1500, 0.14)
  noiseHit(c, t, 0.12 * v, 'highpass', 1500, 0.2, reverbIn!)
  const o = c.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(190, t)
  o.connect(env(c, t, 0.25 * v, 0.002, 0.08, dry!))
  o.start(t)
  o.stop(t + 0.12)
}

function clap(c: AudioContext, t: number, v: number) {
  for (const d of [0, 0.011, 0.023]) noiseHit(c, t + d, 0.3 * v, 'bandpass', 1300, 0.09)
  noiseHit(c, t, 0.15 * v, 'bandpass', 1300, 0.25, reverbIn!)
}

function synth(c: AudioContext, t: number, f: number, dur: number, type: OscillatorType, vol: number, to: AudioNode, cutoff = 2400, detune = 0) {
  const o = c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  o.detune.value = detune
  const flt = c.createBiquadFilter()
  flt.type = 'lowpass'
  flt.frequency.value = cutoff
  o.connect(flt)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4))
  g.gain.setValueAtTime(vol, t + dur * 0.7)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  flt.connect(g)
  g.connect(to)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function pad(c: AudioContext, t: number, chord: number[], dur: number) {
  for (const n of chord) {
    for (const dt of [-8, 8]) {
      const o = c.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = freq(n)
      o.detune.value = dt
      const flt = c.createBiquadFilter()
      flt.type = 'lowpass'
      flt.frequency.value = 900
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.022, t + dur * 0.3)
      g.gain.setValueAtTime(0.022, t + dur * 0.8)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(flt)
      flt.connect(g)
      g.connect(dry!)
      g.connect(reverbIn!)
      o.start(t)
      o.stop(t + dur + 0.05)
    }
  }
}

function scheduleStep(c: AudioContext, p: Pattern, i: number, t: number, sixteenth: number) {
  const s = i % 16
  const bar = Math.floor(i / 16)
  const chord = p.chords[bar % p.chords.length]
  const root = chord[0]
  const lift = boost ? 1.25 : 1
  if (p.kick[s]) kick(c, t, p.kick[s])
  if (p.snare[s]) snare(c, t, p.snare[s] * lift)
  if (p.clap[s]) clap(c, t, p.clap[s])
  if (p.hat[s]) noiseHit(c, t, 0.07 * p.hat[s] * lift, 'highpass', 8000, 0.03)
  if (p.openHat[s]) noiseHit(c, t, 0.06 * p.openHat[s], 'highpass', 7000, 0.16)
  // last 10 seconds of round 3: snare roll and a rising noise
  if (boost) {
    noiseHit(c, t, 0.08 + 0.16 * (s / 16), 'highpass', 2000, 0.06)
    if (s % 4 === 0) clap(c, t, 0.8)
    if (s === 0) noiseHit(c, t, 0.18, 'bandpass', 3000 + (bar % 4) * 1500, sixteenth * 15, reverbIn!)
  }
  const b = p.bass[s]
  if (b != null) synth(c, t, freq(root + b - 24), sixteenth * 1.7, p.bassType, p.bassType === 'sine' ? 0.42 : 0.2, dry!, boost ? 1400 : 700)
  if (s === 0) pad(c, t, chord, sixteenth * 16)
  const l = p.lead[i % 32]
  if (l != null) {
    synth(c, t, freq(l + 12), sixteenth * 1.5, p.leadType, 0.055, dry!, 3200, 4)
    synth(c, t, freq(l + 12), sixteenth * 1.5, p.leadType, 0.03, delayIn!, 3200, -4)
    if (boost) synth(c, t, freq(l + 24), sixteenth * 1.2, 'square', 0.035, dry!, 5000)
  }
}

function startSynth() {
  const a = getAudio()
  if (!a || timer !== null) return
  const { ctx: c, master } = a
  buildBus(c, master)
  nextTime = c.currentTime + 0.1
  step = 0
  let pending: MusicStyle = style
  let current: MusicStyle = style
  timer = window.setInterval(() => {
    if (c.state !== 'running') {
      nextTime = c.currentTime + 0.1
      return
    }
    pending = style
    while (nextTime < c.currentTime + 0.15) {
      // change style only at the start of a bar, so it never stumbles
      if (step % 16 === 0 && pending !== current) {
        current = pending
        step = 0
      }
      const p = STYLES[current]
      const sixteenth = 60 / p.bpm / 4
      const swing = p.swing && step % 2 === 1 ? sixteenth * p.swing : 0
      scheduleStep(c, p, step, nextTime + swing, sixteenth)
      nextTime += sixteenth
      step++
    }
  }, 25)
}

function stopSynth() {
  if (timer !== null) window.clearInterval(timer)
  timer = null
  const b = bus
  const a = getAudio()
  if (b && a) {
    b.gain.setTargetAtTime(0.0001, a.ctx.currentTime, 0.15)
    window.setTimeout(() => b.disconnect(), 600)
  }
  bus = null
}

// ===================================================================
//  public API
// ===================================================================
async function apply() {
  if (!running) return
  const want = style
  if (await hasFile(want)) {
    if (!running || style !== want) return
    stopSynth()
    playSong(want)
  } else {
    if (!running || style !== want) return
    stopSong()
    startSynth()
  }
}

/** Start the music (after a click: browsers block audio before that). */
export function startMusic() {
  if (!isMusicOn()) return
  running = true
  void apply()
}

export function stopMusic() {
  running = false
  stopSynth()
  stopSong()
}

/** lobby / round1 / round2 / round3 / podium */
export function setMusicStyle(s: MusicStyle) {
  if (s === style) return
  style = s
  void apply()
}

/** More energy (the last 10 seconds of round 3). */
export function setMusicBoost(on: boolean) {
  boost = on
}

/** Lower the music while someone talks (defense, Hot Take, host). */
export function duckMusic(on: boolean) {
  ducked = on
  const a = getAudio()
  if (bus && a) bus.gain.setTargetAtTime(on ? DUCKED : VOLUME, a.ctx.currentTime, 0.25)
  if (song) fadeTo(song, songVolume(), 0.5)
}
