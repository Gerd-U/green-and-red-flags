import type { Power, PowerId } from '../lib/types'

// Situations that fall during the game. Max 7 words each so they can be
// read while falling. A game uses up to 14 of each color per round, so
// 42+ of each means no repeats across the 3 rounds.
// Lines marked "debatable" are ambiguous on purpose, to spark discussion.

export const RED_FLAGS: string[] = [
  'Checks your phone without asking',
  'Says all their exes were crazy',
  'Gets jealous of your friends',
  'Never says sorry first',
  'Makes fun of your dreams',
  'Ignores your texts for days',
  'Lies about small things',
  'Is rude to waiters',
  'Asks for your passwords',
  'Forgets your birthday every year',
  'Only texts you late at night',
  'Talks over you all the time',
  'Tells you what to wear',
  'Keeps score in every argument',
  'Still texts their ex every day',
  'Hides you from their friends',
  'Blames you for their bad mood',
  'Never asks about your day',
  'Borrows money and never pays back',
  'Gives you the silent treatment',
  'Cancels plans at the last minute',
  'Laughs when you are upset',
  'Compares you to their ex',
  'Is always on their phone',
  'Gets angry when you say no',
  'Shares your secrets with friends',
  'Reads your messages over your shoulder',
  'Makes you choose: me or friends',
  'Never pays, always "forgets" their wallet',
  'Criticizes your family all the time',
  'Breaks promises every single week',
  'Yells at you in public',
  'Disappears for weeks, then says "hey"',
  'Makes every problem your fault',
  // debatable
  'Says "I love you" on date two',
  'Wants to spend every minute together',
  'Posts about you without asking',
  "Hasn't met your family after a year",
  'Likes hundreds of models online',
  'Needs to know where you are',
  'Still has their ex on Instagram',
  'Wants to share one bank account',
]

export const GREEN_FLAGS: string[] = [
  'Remembers your coffee order',
  'Says sorry and means it',
  'Listens without checking their phone',
  'Supports your goals',
  'Respects your "no"',
  'Is kind to waiters',
  'Gets along with your friends',
  'Texts "home safe?" after dates',
  'Keeps their promises',
  'Admits when they are wrong',
  'Gives you space when you need it',
  'Laughs at your bad jokes',
  'Asks how your day was',
  'Celebrates your wins',
  'Talks about problems calmly',
  'Introduces you to their friends',
  'Is honest even when it\'s hard',
  'Makes plans and shows up',
  'Respects your privacy',
  'Brings you soup when you\'re sick',
  'Has their own hobbies and friends',
  'Says "I\'m proud of you"',
  'Remembers small things you said',
  'Encourages you to see your family',
  'Shares their fries with you',
  'Apologizes without saying "but"',
  'Asks before posting your photo',
  'Is nice to your little brother',
  'Splits chores without being asked',
  'Helps you study for exams',
  'Is on time for your dates',
  'Learns to cook your favorite food',
  'Calms down before arguing',
  'Says thank you for small things',
  // debatable
  'Is still friends with their ex',
  'Pays for every single date',
  'Texts you good morning every day',
  'Talks to their mom every day',
  'Already plans your future together',
  'Always tells you exactly what they think',
  'Gives you their phone password',
  'Wants to meet your parents fast',
]

/** Funny, absurd turn-offs. They don't change the score, they just trigger "THE ICK!". */
export const ICKS: string[] = [
  'Claps when the plane lands',
  'Runs like a cartoon',
  'Says "yummers"',
  'Chews with their mouth open',
  'Wears socks with sandals',
  'Sings in elevators',
  'Says "hehe" out loud',
  'Takes 40 selfies per date',
  'Calls their car "baby"',
  'Eats pizza with a fork',
  'Uses a voice for their pet',
  'Says "the cringe" in real life',
]

/** Rare golden cards: +300 points and one heart back. */
export const SOULMATES: string[] = [
  'Learns your love language',
  "Defends you when you're not there",
  'Grows with you, not away',
  'Makes you feel safe and free',
  'Loves your weird side',
  'Chooses you on hard days too',
]

/** Questions shown with the "red flag of the round" so the class can talk for a minute. */
export const DISCUSSION_QUESTIONS: string[] = [
  'Would you forgive this? Why?',
  'Is this always a red flag? When is it OK?',
  'How would you talk to your partner about this?',
  'Is this worse at 15, 25 or 45 years old?',
  'What would you do on the first day you noticed this?',
  'Is this a red flag in a friendship too?',
]

export const POWERS: Record<PowerId, Power> = {
  gaslighting: {
    id: 'gaslighting',
    name: 'Gaslighting',
    emoji: '🌀',
    color: '#a855f7',
    hint: 'Controls are reversed!',
  },
  ghosting: {
    id: 'ghosting',
    name: 'Ghosting',
    emoji: '👻',
    color: '#94a3b8',
    hint: 'Where did the cards go?',
  },
  lovebombing: {
    id: 'lovebombing',
    name: 'Love bombing',
    emoji: '💘',
    color: '#ff5fa2',
    hint: 'Every flag looks green...',
  },
  mixedsignals: {
    id: 'mixedsignals',
    name: 'Mixed signals',
    emoji: '📶',
    color: '#ffb020',
    hint: 'Everything is falling faster!',
  },
  exback: {
    id: 'exback',
    name: 'The ex is back',
    emoji: '🧊',
    color: '#38bdf8',
    hint: 'You are frozen!',
  },
  therapy: {
    id: 'therapy',
    name: 'Therapy',
    emoji: '🛡️',
    color: '#22d3ee',
    hint: 'Shield on: blocks the next sabotage',
  },
}

export const POWER_IDS = Object.keys(POWERS) as PowerId[]
/** Powers you send to someone else (therapy is a shield for yourself). */
export const SABOTAGE_IDS = POWER_IDS.filter((p) => p !== 'therapy')
