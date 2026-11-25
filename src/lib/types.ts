export type BodyShape = 'triangle' | 'square' | 'hexagon' | 'rhombus' | 'crystal' | 'pentagon'
export type EyeStyle = 'normal' | 'angry' | 'tired' | 'hearts' | 'glasses' | 'starry'
export type MouthStyle = 'smile' | 'serious' | 'surprised' | 'tongue' | 'grin'
export type HatStyle = 'none' | 'cap' | 'crown' | 'horns' | 'antenna' | 'bow'

export interface AvatarConfig {
  body: BodyShape
  eyes: EyeStyle
  mouth: MouthStyle
  hat: HatStyle
  color1: string
  color2: string
}

export type Mood = 'happy' | 'horror' | undefined

export type PowerId = 'gaslighting' | 'ghosting' | 'lovebombing' | 'mixedsignals' | 'exback'

export interface Power {
  id: PowerId
  name: string
  emoji: string
  color: string
  hint: string
}

export type CardKind = 'green' | 'red' | 'power'

export interface ScheduledCard {
  id: number
  /** game time (ms since round start) when the card appears */
  t: number
  /** horizontal center, 0..1 */
  x: number
  kind: CardKind
  /** field heights per ms */
  speed: number
  text?: string
  power?: PowerId
}

export type Phase = 'lobby' | 'playing' | 'defense' | 'roundEnd' | 'podium'

export type DefenseStage = 'talk' | 'vote' | 'result'

export interface Defense {
  playerId: string
  name: string
  text: string
  stage: DefenseStage
  /** 'first' = first red flag of the round, 'end' = random one at round end */
  context: 'first' | 'end'
  /** ms left in the talk stage (as computed by the admin when sending) */
  remaining: number
  votesIn: number
  votesNeeded: number
  convinced?: number
  notConvinced?: number
  result?: 'convinced' | 'not'
}

export interface PodiumStats {
  topRed?: { text: string; count: number }
  topMissedGreen?: { text: string; count: number }
}

/** Authoritative game state, broadcast by the admin on the main channel. */
export interface GameState {
  phase: Phase
  round: number
  seed: number
  running: boolean
  /** game time in ms when the message was sent (negative = countdown) */
  elapsed: number
  totals: Record<string, number>
  roundScores: Record<string, number>
  lives: Record<string, number>
  defense: Defense | null
  /** sequence number, increases on every state message */
  seq: number
  stats?: PodiumStats
}

export interface MiniCard {
  id: number
  x: number
  y: number
  k: 'g' | 'r' | 'p'
}

/** Sent by each phone ~10 times per second to the admin. */
export interface Tick {
  id: string
  round: number
  x: number
  cards: MiniCard[]
  score: number
  fx: PowerId[]
  mood?: Mood
  out?: boolean
}

export interface CatchMsg {
  id: string
  round: number
  kind: CardKind
  cardId: number
  text?: string
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
  ready: boolean
  online: boolean
}
