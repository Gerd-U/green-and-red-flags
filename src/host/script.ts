import {
  FACT_DIVIDED,
  FACT_TOP_RED,
  FACT_TOXIC,
  Q_CLOSING,
  Q_DEFENSE,
  Q_GENERAL,
  Q_GREEN_MISSED,
  Q_GREEN_NOBODY,
  Q_GREY_CONFUSED,
  Q_HOT_GREEN,
  Q_HOT_RED,
  Q_INTRO,
  Q_PROFILE,
  Q_RED_CAUGHT,
  Q_RED_MANY,
  Q_SABOTAGE,
  SCRIPT_LINES,
} from '../data/host'
import { roundConfig } from '../lib/game'
import type { HostInfo } from '../lib/types'

export interface ScriptQuestion {
  text: string
  /** main player of the question (to avoid asking the same person twice in a row) */
  player?: string
  /** true = uses real names/cards from the game */
  real: boolean
}

export interface ScriptView {
  key: string
  title: string
  lines: string[]
  questions: ScriptQuestion[]
  facts: string[]
}

type Vars = Partial<Record<'player' | 'other' | 'card' | 'cardlc' | 'count' | 'times' | 'pct' | 'pct2' | 'bio', string>>

/** Fills a template. Returns null if any placeholder can't be filled. */
export function fill(template: string, vars: Vars): string | null {
  let missing = false
  const out = template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k as keyof Vars]
    if (v == null || v === '') {
      missing = true
      return ''
    }
    return v
  })
  return missing || /\{\w+\}/.test(out) ? null : out
}

const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)
/** stable "random" pick so the same data gives the same template */
const pickIdx = (seed: string, n: number) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % n
}

/** Adds up to `max` filled templates (rotating from a stable start) for one data item. */
function addFrom(out: ScriptQuestion[], templates: string[], vars: Vars, seed: string, max = 2, player?: string) {
  const start = pickIdx(seed, templates.length)
  let added = 0
  for (let i = 0; i < templates.length && added < max; i++) {
    const template = templates[(start + i) % templates.length]
    const text = fill(template, vars)
    if (text && !out.some((q) => q.text === text)) {
      // only "about" a player if the question really names them
      const named = /\{(player|other)\}/.test(template)
      out.push({ text, player: named ? player : undefined, real: true })
      added++
    }
  }
}

function general(list: string[]): ScriptQuestion[] {
  return list.map((text) => ({ text, real: false }))
}

export function buildScript(info: HostInfo): ScriptView {
  const s = info.state
  const sc = info.script
  const name = (id?: string) => info.players.find((p) => p.id === id)?.name
  const lines = (arr: string[], vars: Vars = {}) => arr.map((l) => fill(l, vars)).filter((l): l is string => Boolean(l))

  // ---- question pools from the game data ----
  const roundQuestions = (): ScriptQuestion[] => {
    const q: ScriptQuestion[] = []
    const reds = [...sc.roundRed].sort((a, b) => b.ids.length - a.ids.length)
    for (const r of reds.filter((r) => r.ids.length >= 2).slice(0, 2)) {
      addFrom(q, Q_RED_MANY, { card: r.text, cardlc: lc(r.text), count: String(r.ids.length) }, r.text, 1)
    }
    for (const r of reds.slice(0, 4)) {
      for (const id of r.ids.slice(0, 2)) {
        const p = name(id)
        if (p) addFrom(q, Q_RED_CAUGHT, { player: p, card: r.text, cardlc: lc(r.text) }, r.text + id, 1, id)
      }
    }
    for (const g of sc.greyReds.slice(-3)) {
      const p = name(g.id)
      if (p) addFrom(q, Q_GREY_CONFUSED, { player: p, card: g.text, cardlc: lc(g.text) }, g.text + g.id, 1, g.id)
    }
    const active = sc.activeIds.length
    for (const m of sc.roundMiss) {
      if (active > 0 && m.ids.length >= active) addFrom(q, Q_GREEN_NOBODY, { card: m.text, cardlc: lc(m.text) }, m.text, 1)
    }
    for (const m of sc.roundMiss.filter((m) => m.ids.length < active).slice(0, 2)) {
      const p = name(m.ids[0])
      if (p) addFrom(q, Q_GREEN_MISSED, { player: p, card: m.text, cardlc: lc(m.text) }, m.text + m.ids[0], 1, m.ids[0])
    }
    q.push(...sabotageQuestions())
    return q
  }

  const sabotageQuestions = (): ScriptQuestion[] => {
    const q: ScriptQuestion[] = []
    for (const p of [...sc.sabotages].sort((a, b) => b.n - a.n).slice(0, 2)) {
      const from = name(p.from)
      const to = name(p.to)
      if (from && to) addFrom(q, Q_SABOTAGE, { player: from, other: to, count: String(p.n), times: times(p.n) }, p.from + p.to, 1, p.from)
    }
    return q
  }

  let title = ''
  let ls: string[] = []
  let questions: ScriptQuestion[] = []
  let facts: string[] = []
  let key: string = s.phase

  switch (s.phase) {
    case 'intro':
      title = 'Intro — your talking points'
      ls = SCRIPT_LINES.intro
      questions = general(Q_INTRO)
      break
    case 'lobby': {
      title = 'Lobby'
      ls = SCRIPT_LINES.lobby
      const q: ScriptQuestion[] = []
      for (const p of info.players.filter((p) => p.online && p.ready)) {
        addFrom(q, Q_PROFILE, { player: p.name, bio: p.bio }, p.id, 1, p.id)
      }
      questions = [...q, ...general(Q_INTRO)]
      break
    }
    case 'tutorial':
      title = 'Tutorial'
      ls = SCRIPT_LINES.tutorial
      questions = general(Q_INTRO)
      break
    case 'playing':
      title = `Round ${s.round}: ${roundConfig(s.round).name}`
      key = `playing${s.round}`
      ls = SCRIPT_LINES[`round${Math.min(3, Math.max(1, s.round))}` as 'round1']
      // while they play, prepare questions about what is happening
      questions = [...roundQuestions(), ...general(Q_GENERAL)]
      break
    case 'defense': {
      const d = s.defense
      title = 'Defense'
      key = `defense-${d?.key ?? ''}`
      const vars: Vars = d ? { player: d.name, card: d.text, cardlc: lc(d.text) } : {}
      ls = lines(SCRIPT_LINES.defense, vars)
      const q: ScriptQuestion[] = []
      if (d) addFrom(q, Q_DEFENSE, vars, d.key, 3, d.playerId)
      questions = [...q, ...general(Q_GENERAL)]
      break
    }
    case 'roundEnd':
      title = `Round ${s.round} results`
      key = `roundEnd${s.round}`
      ls = SCRIPT_LINES.roundEnd
      questions = [...roundQuestions(), ...general(Q_GENERAL)]
      break
    case 'hotTake': {
      const h = s.hotTake
      title = 'Hot Take'
      key = `hotTake-${h?.key ?? ''}-${h?.stage === 'vote' ? 'vote' : 'open'}`
      if (!h || h.stage === 'vote') {
        ls = SCRIPT_LINES.hotTakeVote
        questions = general(Q_GENERAL)
        break
      }
      const pct = h.pctRed ?? 50
      const vars: Vars = { card: h.text, cardlc: lc(h.text), pct: String(pct), pct2: String(100 - pct) }
      ls = lines(h.stage === 'verdict' ? SCRIPT_LINES.hotTakeVerdict : SCRIPT_LINES.hotTakeReveal, vars)
      const red: ScriptQuestion[] = []
      const green: ScriptQuestion[] = []
      for (const id of h.red ?? []) addFrom(red, Q_HOT_RED, { ...vars, player: name(id) }, h.key + id, 1, id)
      for (const id of h.green ?? []) addFrom(green, Q_HOT_GREEN, { ...vars, pct: String(100 - pct), player: name(id) }, h.key + id, 1, id)
      // alternate sides: red, green, red, green...
      const both: ScriptQuestion[] = []
      for (let i = 0; i < Math.max(red.length, green.length); i++) {
        if (red[i]) both.push(red[i])
        if (green[i]) both.push(green[i])
      }
      questions = [...both, ...general(Q_GENERAL)]
      break
    }
    case 'awards':
      title = 'Awards'
      ls = SCRIPT_LINES.awards
      questions = [...sabotageQuestions(), ...roundQuestions(), ...general(Q_GENERAL)]
      break
    case 'podium':
      title = 'Podium'
      ls = SCRIPT_LINES.podium
      questions = general(Q_CLOSING)
      break
    case 'final': {
      title = 'Final thoughts — closing'
      ls = SCRIPT_LINES.final
      const f = s.finalStats
      const toxic = f?.mostToxic ? name(f.mostToxic.playerId) : undefined
      facts = [
        f?.mostToxic && fill(FACT_TOXIC, { player: toxic, count: String(f.mostToxic.count) }),
        f?.topRed && fill(FACT_TOP_RED, { card: f.topRed.text, count: String(f.topRed.count) }),
        f?.mostDivided && fill(FACT_DIVIDED, { card: f.mostDivided.text, pct: String(f.mostDivided.pctRed), pct2: String(100 - f.mostDivided.pctRed) }),
      ].filter((x): x is string => Boolean(x))
      questions = general(Q_CLOSING)
      break
    }
  }

  // real questions first, then general ones; no duplicates
  const seen = new Set<string>()
  // order: real data with names > real data without names > general
  questions = [
    ...questions.filter((q) => q.real && q.player),
    ...questions.filter((q) => q.real && !q.player),
    ...questions.filter((q) => !q.real),
  ].filter((q) =>
    seen.has(q.text) ? false : (seen.add(q.text), true)
  )
  return { key, title, lines: ls, questions, facts }
}

/**
 * Picks the order to show questions in: never the same question or the same
 * player twice in a row (so everybody gets to talk), real data first.
 */
export function orderQuestions(list: ScriptQuestion[], lastText?: string, lastPlayer?: string): ScriptQuestion[] {
  const rest = list.filter((q) => q.text !== lastText)
  if (!rest.length) return list
  // greedy: take the first question (keeps "real data first") whose player is
  // not the same as the previous one; fall back to the first left
  const out: ScriptQuestion[] = []
  let prev = lastPlayer
  while (rest.length) {
    let i = rest.findIndex((q) => !q.player || q.player !== prev)
    if (i < 0) i = 0
    const [q] = rest.splice(i, 1)
    out.push(q)
    prev = q.player ?? prev
  }
  return out
}
