export type HairStyle = 'bald' | 'short' | 'quiff' | 'long' | 'ponytail' | 'bun' | 'afro' | 'mohawk'
export type EyeStyle = 'normal' | 'happy' | 'angry' | 'tired' | 'hearts' | 'stars'
export type MouthStyle = 'smile' | 'serious' | 'surprised' | 'tongue' | 'teeth'
export type TopStyle = 'tshirt' | 'hoodie' | 'jacket' | 'shirt' | 'dress' | 'overalls'
export type BottomStyle = 'pants' | 'shorts' | 'skirt' | 'ripped'
export type ShoeStyle = 'sneakers' | 'boots' | 'flipflops' | 'heels'
export type AccessoryStyle =
  | 'none'
  | 'glasses'
  | 'sunglasses'
  | 'cap'
  | 'crown'
  | 'headphones'
  | 'earrings'
  | 'flower'
  | 'scarf'
  | 'backpack'

export interface AvatarConfig {
  skin: string
  hair: HairStyle
  hairColor: string
  eyes: EyeStyle
  mouth: MouthStyle
  top: TopStyle
  topColor: string
  bottom: BottomStyle
  bottomColor: string
  shoes: ShoeStyle
  accessory: AccessoryStyle
}

/** What the character is doing (drives the CSS animations). */
export type Pose = 'idle' | 'walk' | 'cheer' | 'scared' | 'cry' | 'dance'

export type PowerId = 'gaslighting' | 'ghosting' | 'lovebombing' | 'mixedsignals' | 'exback' | 'therapy'

export interface Power {
  id: PowerId
  name: string
  emoji: string
  color: string
  hint: string
}

export type CardKind = 'green' | 'red' | 'power' | 'ick' | 'soulmate'

export interface ScheduledCard {
  id: number
  /** game time (ms since round start) when the card appears */
  t: number
  /** horizontal center, 0..1 */
  x: number
  kind: CardKind
  /** field heights per ms */
  speed: number
  /** short text printed on the card */
  text?: string
  /** full sentence (shown when caught) */
  full?: string
  power?: PowerId
  /** falls grey: color only revealed when caught or when it passes the player */
  grey?: boolean
}

export type Phase =
  | 'intro'
  | 'lobby'
  | 'tutorial'
  | 'playing'
  | 'defense'
  | 'roundEnd'
  | 'hotTake'
  | 'awards'
  | 'podium'
  | 'final'

export type HotTakeStage = 'vote' | 'reveal' | 'speaker' | 'verdict'

export interface HotTake {
  key: string
  text: string
  stage: HotTakeStage
  /** ms left of the vote (stage vote) or of the speaker (stage speaker) */
  remaining: number
  votesIn: number
  votesNeeded: number
  /** revealed after the vote */
  red?: string[]
  green?: string[]
  pctRed?: number
  /** player who has the word (stage speaker) */
  speaker?: string
}

export interface HotTakeVoteMsg {
  id: string
  key: string
  vote: 'red' | 'green'
}

export interface FinalStats {
  topRed?: { text: string; count: number }
  topMissedGreen?: { text: string; count: number }
  mostDivided?: { text: string; pctRed: number }
  mostToxic?: { playerId: string; count: number }
}

export type DefenseStage = 'talk' | 'vote' | 'result'

export interface Defense {
  key: string
  playerId: string
  name: string
  text: string
  stage: DefenseStage
  /** sentence starter shown before talking */
  starter: string
  /** ms left in the current stage (talk or vote) when the admin sent it */
  remaining: number
  votesIn: number
  votesNeeded: number
  convinced?: number
  notConvinced?: number
  result?: 'convinced' | 'not'
  /** how many times the host said "Objection!" */
  objections?: number
}

/** Countdown that moves the game forward on its own (admin can pause/skip it). */
export interface AutoAdvance {
  label: string
  /** ms left when the admin sent it */
  remaining: number
  paused: boolean
}

export interface RoundSummary {
  round: number
  topRed?: { text: string; count: number }
  question: string
}

export interface Award {
  id: 'toxic' | 'manipulator' | 'lawyer' | 'victim' | 'ick'
  title: string
  emoji: string
  playerId: string
  value: number
  desc: string
}

export interface PodiumStats {
  topRed?: { text: string; count: number }
  topMissedGreen?: { text: string; count: number }
}

/** Authoritative game state, broadcast by the admin on the main channel. */
export interface GameState {
  phase: Phase
  /** 1..TOTAL_ROUNDS (0 in the lobby) */
  round: number
  seed: number
  /** fixed for the whole game: decides the card deck order */
  gameSeed: number
  running: boolean
  /** game time in ms when the message was sent (negative = countdown) */
  elapsed: number
  totals: Record<string, number>
  roundScores: Record<string, number>
  /** last hearts each phone reported (used to recover after a reload) */
  hearts: Record<string, number>
  /** players who started the current round (late joiners wait for the next one) */
  roundIds: string[]
  defense: Defense | null
  hotTake: HotTake | null
  auto: AutoAdvance | null
  /** ms left in the tutorial */
  tutorialLeft?: number
  summary?: RoundSummary
  awards?: Award[]
  stats?: PodiumStats
  finalStats?: FinalStats
  /** sequence number, increases on every state message */
  seq: number
}

export interface MiniCard {
  id: number
  x: number
  y: number
  /** g=green r=red p=power i=ick s=soulmate */
  k: 'g' | 'r' | 'p' | 'i' | 's'
  /** still grey on the phone */
  h?: 1
}

/** Sent by each phone ~7 times per second to the admin. */
export interface Tick {
  id: string
  round: number
  x: number
  /** -1 left, 1 right (facing) */
  f: -1 | 1
  pose: Pose
  cards: MiniCard[]
  score: number
  hearts: number
  streak: number
  /** heartbroken (can't catch) */
  hb?: 1
  shield?: 1
  fx: PowerId[]
}

export interface CatchMsg {
  id: string
  round: number
  kind: CardKind
  cardId: number
  text?: string
  power?: PowerId
  /** greens in a row after this catch */
  streak: number
  /** this catch left the player heartbroken */
  broke?: boolean
  /** the card was falling grey (color hidden) */
  grey?: boolean
}

export interface MissMsg {
  id: string
  round: number
  text: string
}

export interface PowerMsg {
  from: string
  to: string
  power: PowerId
}

export interface SabotageEvent extends PowerMsg {
  key: string
  round: number
}

/** Admin -> one phone: give back a heart (won a defense). */
export interface GrantEvent {
  to: string
  key: string
  hearts: number
}

export interface VoteMsg {
  id: string
  vote: 'convinced' | 'not'
  defenseKey: string
}

export interface PresencePlayer {
  role: 'player'
  id: string
  name: string
  avatar: AvatarConfig | null
  bio?: string
  ready: boolean
}

export interface PresenceAdmin {
  role: 'admin'
}

export type PresenceMeta = PresencePlayer | PresenceAdmin

export interface PlayerInfo {
  id: string
  name: string
  avatar: AvatarConfig
  bio: string
  ready: boolean
  online: boolean
}

/** Data the host's script needs (names are resolved on the host phone). */
export interface ScriptData {
  /** red flags caught this round (or the last round), full text -> player ids */
  roundRed: { text: string; ids: string[] }[]
  /** greens that fell this round, full text -> ids of players who missed them */
  roundMiss: { text: string; ids: string[] }[]
  /** grey red cards caught this round (they looked neutral) */
  greyReds: { id: string; text: string }[]
  /** sabotages sent this game */
  sabotages: { from: string; to: string; n: number }[]
  /** finished hot takes */
  hotTakes: { text: string; pctRed: number; red: string[]; green: string[] }[]
  /** players who were in the round (to know if "nobody" caught a green) */
  activeIds: string[]
  reds: Record<string, number>
}

export interface HostPlayer {
  id: string
  name: string
  avatar: AvatarConfig
  bio: string
  online: boolean
  ready: boolean
}

/** Admin -> host (private channel): everything the host view shows. */
export interface HostInfo {
  state: GameState
  players: HostPlayer[]
  /** ms since the room was created */
  activityMs: number
  script: ScriptData
}
