import { load, remove, save } from './storage'

// ---------------------------------------------------------------------------
//  Host (moderator) authentication
//
//  1. The host phone sends `host-login` on the main channel with a random
//     nonce and proof = hash(password | room | nonce). The password itself is
//     never sent, so other phones listening to the channel can't read it.
//  2. The admin (projector) checks the proof. If it matches, it creates a
//     random token and answers `host-auth` with the token encrypted with a
//     key derived from the password, so only the real host can read it.
//  3. From then on the host talks to the admin on a private channel whose
//     name is derived from the token, and every command carries the token.
//     The admin ignores commands without a valid token, so a player who
//     knows the room code can't control the game.
//
//  Plain JS hashing (not crypto.subtle) on purpose: crypto.subtle only exists
//  on https/localhost, and phones on the same wifi use http://192.168...
//  This is classroom-grade protection, not bank-grade.
// ---------------------------------------------------------------------------

/** cyrb53: small, fast 53-bit string hash */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/** 32 hex chars built from two seeded hashes */
export function hash32(str: string): string {
  return [1, 2, 3].map((s) => cyrb53(str, s).toString(16).padStart(14, '0')).join('').slice(0, 32)
}

export function randomHex(n = 32): string {
  let out = ''
  const buf = new Uint8Array(n)
  try {
    crypto.getRandomValues(buf)
  } catch {
    for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256)
  }
  for (let i = 0; i < n; i++) out += (buf[i] & 15).toString(16)
  return out
}

export const loginProof = (password: string, code: string, nonce: string) => hash32(`${password.trim()}|${code}|${nonce}|login`)

function keystream(password: string, nonce: string) {
  return hash32(`${password.trim()}|${nonce}|key`)
}

/** XOR a 32-hex token with a key derived from the password (same function decrypts). */
export function xorToken(token: string, password: string, nonce: string): string {
  const k = keystream(password, nonce)
  let out = ''
  for (let i = 0; i < 32; i++) out += (parseInt(token[i], 16) ^ parseInt(k[i], 16)).toString(16)
  return out
}

export const hostTopic = (code: string, token: string) => `gr-${code}-h-${hash32(token).slice(0, 12)}`

/** Password from VITE_HOST_PASSWORD; empty = the admin generates a 4-digit PIN. */
export const ENV_HOST_PASSWORD = (import.meta.env.VITE_HOST_PASSWORD ?? '').trim()

export function makePin(): string {
  return String(1000 + Math.floor(Math.random() * 9000))
}

// ---- host session on this phone ----
export interface HostSession {
  code: string
  token: string
}
const SESSION_KEY = 'gr.hostSession'
export const loadHostSession = () => load<HostSession | null>(SESSION_KEY, null)
export const saveHostSession = (s: HostSession) => save(SESSION_KEY, s)
export const clearHostSession = () => remove(SESSION_KEY)

// ---- messages ----
export interface HostLoginMsg {
  nonce: string
  proof: string
}
export interface HostAuthMsg {
  nonce: string
  ok: boolean
  /** token XOR key(password, nonce) */
  enc?: string
}

export type HostCmdName =
  | 'openLobby'
  | 'start'
  | 'pause'
  | 'skip'
  | 'endRound'
  | 'awards'
  | 'podium'
  | 'final'
  | 'playAgain'
  | 'objection'
  | 'vote'
  | 'htReveal'
  | 'htSpeaker'
  | 'htVerdict'
  | 'htNext'

export interface HostCmd {
  token: string
  cmd: HostCmdName
  arg?: string
}
