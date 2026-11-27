import type { Power, PowerId } from '../lib/types'

// Situations that fall during the game.
//   short: what is printed on the falling card (max 5 words, 2 lines)
//   full:  the complete sentence, shown big when someone catches the card,
//          in defenses and in the stats (if missing, `short` is used)
// A game uses up to 14 of each color per round, so 42 of each means no
// repeats across the 3 rounds. Lines under "debatable" are ambiguous on
// purpose, to spark discussion.

export interface CardText {
  short: string
  full?: string
}

export const fullText = (c: CardText) => c.full ?? c.short

export const RED_FLAGS: CardText[] = [
  { short: 'Checks your phone', full: 'Checks your phone without asking' },
  { short: 'Says all exes were crazy', full: 'Says all their exes were crazy' },
  { short: 'Jealous of your friends', full: 'Gets jealous of your friends' },
  { short: 'Never says sorry first' },
  { short: 'Mocks your dreams', full: 'Makes fun of your dreams' },
  { short: 'Ignores texts for days', full: 'Ignores your texts for days' },
  { short: 'Lies about small things' },
  { short: 'Rude to waiters', full: 'Is rude to waiters' },
  { short: 'Asks for your passwords' },
  { short: 'Forgets your birthday', full: 'Forgets your birthday every year' },
  { short: 'Only texts at 2 a.m.', full: 'Only texts you late at night' },
  { short: 'Always talks over you', full: 'Talks over you all the time' },
  { short: 'Picks your outfits', full: 'Tells you what to wear' },
  { short: 'Keeps score in fights', full: 'Keeps score in every argument' },
  { short: 'Texts their ex daily', full: 'Still texts their ex every day' },
  { short: 'Hides you from friends', full: 'Hides you from their friends' },
  { short: 'Blames you for moods', full: 'Blames you for their bad mood' },
  { short: 'Never asks about you', full: 'Never asks about your day' },
  { short: 'Borrows money, never pays', full: 'Borrows money and never pays it back' },
  { short: 'Silent treatment', full: 'Gives you the silent treatment' },
  { short: 'Cancels last minute', full: 'Cancels plans at the last minute' },
  { short: 'Laughs when you cry', full: 'Laughs when you are upset' },
  { short: 'Compares you to ex', full: 'Compares you to their ex' },
  { short: 'Always on their phone', full: 'Is always on their phone on dates' },
  { short: 'Angry when you say no', full: 'Gets angry when you say no' },
  { short: 'Shares your secrets', full: 'Shares your secrets with friends' },
  { short: 'Reads your messages', full: 'Reads your messages over your shoulder' },
  { short: '"Me or your friends"', full: 'Makes you choose: me or your friends' },
  { short: 'Always "forgets" wallet', full: 'Never pays, always "forgets" their wallet' },
  { short: 'Hates your family', full: 'Criticizes your family all the time' },
  { short: 'Breaks every promise', full: 'Breaks promises every single week' },
  { short: 'Yells at you in public' },
  { short: 'Ghosts, then says "hey"', full: 'Disappears for weeks, then says "hey"' },
  { short: 'Everything is your fault', full: 'Makes every problem your fault' },
  // debatable
  { short: 'Says "I love you" early', full: 'Says "I love you" on date two' },
  { short: 'Wants you 24/7', full: 'Wants to spend every minute together' },
  { short: 'Posts you without asking', full: 'Posts about you without asking' },
  { short: 'Never met your parents', full: "Hasn't met your parents after a year" },
  { short: 'Likes models online', full: 'Likes hundreds of models online' },
  { short: 'Needs your location', full: 'Needs to know where you are' },
  { short: 'Ex still on Instagram', full: 'Still has their ex on Instagram' },
  { short: 'Wants one bank account', full: 'Wants to share one bank account' },
]

export const GREEN_FLAGS: CardText[] = [
  { short: 'Remembers your coffee order' },
  { short: 'Says sorry and means it' },
  { short: 'Listens, phone away', full: 'Listens without checking their phone' },
  { short: 'Supports your goals' },
  { short: 'Respects your "no"' },
  { short: 'Kind to waiters', full: 'Is kind to waiters' },
  { short: 'Likes your friends', full: 'Gets along with your friends' },
  { short: 'Texts "home safe?"', full: 'Texts "home safe?" after dates' },
  { short: 'Keeps their promises' },
  { short: 'Admits when wrong', full: 'Admits when they are wrong' },
  { short: 'Gives you space', full: 'Gives you space when you need it' },
  { short: 'Laughs at your jokes', full: 'Laughs at your bad jokes' },
  { short: 'Asks about your day', full: 'Asks how your day was' },
  { short: 'Celebrates your wins' },
  { short: 'Talks calmly in fights', full: 'Talks about problems calmly' },
  { short: 'Introduces you to friends', full: 'Introduces you to their friends' },
  { short: "Honest when it's hard", full: "Is honest even when it's hard" },
  { short: 'Plans dates and shows up', full: 'Makes plans and shows up' },
  { short: 'Respects your privacy' },
  { short: 'Brings soup when sick', full: "Brings you soup when you're sick" },
  { short: 'Has their own hobbies', full: 'Has their own hobbies and friends' },
  { short: 'Says "I\'m proud of you"' },
  { short: 'Remembers small details', full: 'Remembers small things you said' },
  { short: 'Supports family time', full: 'Encourages you to see your family' },
  { short: 'Shares their fries', full: 'Shares their fries with you' },
  { short: 'Sorry without "but"', full: 'Apologizes without saying "but"' },
  { short: 'Asks before posting you', full: 'Asks before posting your photo' },
  { short: 'Nice to your siblings', full: 'Is nice to your little brother' },
  { short: 'Does chores unasked', full: 'Splits chores without being asked' },
  { short: 'Helps you study', full: 'Helps you study for exams' },
  { short: 'Always on time', full: 'Is on time for your dates' },
  { short: 'Learns your favorite dish', full: 'Learns to cook your favorite food' },
  { short: 'Calms down before arguing' },
  { short: 'Thanks you for little things', full: 'Says thank you for small things' },
  // debatable
  { short: 'Friends with their ex', full: 'Is still friends with their ex' },
  { short: 'Pays for every date', full: 'Pays for every single date' },
  { short: 'Good morning text daily', full: 'Texts you good morning every day' },
  { short: 'Calls mom every day', full: 'Talks to their mom every day' },
  { short: 'Already plans your future', full: 'Already plans your future together' },
  { short: 'Brutally honest', full: 'Always tells you exactly what they think' },
  { short: 'Shares phone password', full: 'Gives you their phone password' },
  { short: 'Wants to meet parents fast', full: 'Wants to meet your parents fast' },
]

/** Funny, absurd turn-offs. They don't change the score, they just trigger "THE ICK!". */
export const ICKS: CardText[] = [
  { short: 'Claps when plane lands', full: 'Claps when the plane lands' },
  { short: 'Runs like a cartoon' },
  { short: 'Says "yummers"' },
  { short: 'Chews mouth open', full: 'Chews with their mouth open' },
  { short: 'Socks with sandals', full: 'Wears socks with sandals' },
  { short: 'Sings in elevators' },
  { short: 'Says "hehe" out loud' },
  { short: '40 selfies per date', full: 'Takes 40 selfies per date' },
  { short: 'Calls their car "baby"' },
  { short: 'Eats pizza with fork', full: 'Eats pizza with a fork' },
  { short: 'Baby voice for pets', full: 'Uses a baby voice for their pet' },
  { short: 'Says "cringe" out loud', full: 'Says "the cringe" in real life' },
]

/** Rare golden cards: +300 points and one heart back. */
export const SOULMATES: CardText[] = [
  { short: 'Learns your love language' },
  { short: 'Defends you when absent', full: "Defends you when you're not there" },
  { short: 'Grows with you', full: 'Grows with you, not away' },
  { short: 'Makes you feel safe', full: 'Makes you feel safe and free' },
  { short: 'Loves your weird side' },
  { short: 'Chooses you on bad days', full: 'Chooses you on hard days too' },
]

/** Ambiguous situations for the Hot Take votes between rounds. */
export const HOT_TAKES: string[] = [
  'Wants to see your location all the time',
  'Is still friends with their ex',
  'Always pays for everything',
  'Texts you every hour',
  'Posts couple photos every day',
  'Wants all your passwords',
  'Wants to live together after 3 months',
  'Spends every weekend with their mom',
]

/** Fallback questions (used if the host script has no data yet). */
export const DISCUSSION_QUESTIONS: string[] = [
  'Can you forgive this? Why?',
  'Is this always bad? When is it OK?',
  'What can you say to your partner about this?',
  'Is it worse at 15, 25 or 45?',
  'Is it a red flag with friends too?',
]

export const POWERS: Record<PowerId, Power> = {
  gaslighting: {
    id: 'gaslighting',
    name: 'Gaslighting',
    emoji: '🌀',
    color: '#a855f7',
    hint: 'Left is right, right is left!',
  },
  ghosting: {
    id: 'ghosting',
    name: 'Ghosting',
    emoji: '👻',
    color: '#94a3b8',
    hint: 'The cards are hiding!',
  },
  lovebombing: {
    id: 'lovebombing',
    name: 'Love bombing',
    emoji: '💘',
    color: '#ff5fa2',
    hint: 'All the cards look green!',
  },
  mixedsignals: {
    id: 'mixedsignals',
    name: 'Mixed signals',
    emoji: '📶',
    color: '#ffb020',
    hint: 'The cards fall faster!',
  },
  exback: {
    id: 'exback',
    name: 'The ex is back',
    emoji: '🧊',
    color: '#38bdf8',
    hint: "You can't move!",
  },
  therapy: {
    id: 'therapy',
    name: 'Therapy',
    emoji: '🛡️',
    color: '#22d3ee',
    hint: 'You are safe from the next attack',
  },
}

export const POWER_IDS = Object.keys(POWERS) as PowerId[]
/** Powers you send to someone else (therapy is a shield for yourself). */
export const SABOTAGE_IDS = POWER_IDS.filter((p) => p !== 'therapy')
