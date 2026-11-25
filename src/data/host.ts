// =====================================================================
//  HOST SCRIPT (teleprompter on the host's phone) — edit freely.
//
//  Placeholders, filled with real data from the game:
//    {player}  a player's name           {other}   a second player's name
//    {card}    the full card sentence    {cardlc}  same, first letter lowercase
//              ("someone who {cardlc}" -> "someone who checks your phone")
//    {count}   a number of people        {times}   "once", "twice", "3 times"
//    {pct}     a percentage              {pct2}    100 - pct
//    {bio}     a player's dating-profile line
//  A question is only shown if ALL its placeholders can be filled, so you
//  never see a "{player}" on screen. Questions with real names and cards
//  are shown first; GENERAL ones only when there is no data.
// =====================================================================

/** What the host says in each phase (1–2 short lines, or the intro talking points). */
export const SCRIPT_LINES = {
  intro: [
    "Hi everyone! Today's topic: green flags and red flags in a partner.",
    'A RED flag is a warning sign: something that shows a relationship could become unhealthy.',
    'A GREEN flag is a good sign: respect, trust, kindness, good communication.',
    "The game: catch the green flags, dodge the red ones. If you catch a red one... you'll have to defend it in English!",
  ],
  lobby: ['Open the link on your phone and type the code on the screen.', 'Build your character and pick a line for your dating profile.'],
  tutorial: ['Quick rules: catch green, dodge red, and read the grey cards before you catch them.', 'The first red flag after 10 seconds means: defend yourself!'],
  round1: ['Round 1, First Date: easy mode. Every card shows its color.', 'Watch the screen: the first red flag stops the game!'],
  round2: ['Round 2, Getting Serious: half of the cards are grey now.', 'Read before you catch!'],
  round3: ['Round 3, Meet the Parents: everything is grey and points count double!', 'Last chance to win!'],
  defense: ['{player} caught "{card}". You have 20 seconds. Convince us!', 'Everyone else: listen carefully, then vote on your phone.'],
  roundEnd: ["Time's up! Look at the ranking.", "Let's talk about what happened in this round."],
  hotTakeVote: ['Hot Take time! Read the situation and vote in secret: red or green?', 'You have 15 seconds. No talking yet!'],
  hotTakeReveal: ['{pct}% said RED and {pct2}% said GREEN.', "Let's hear both sides. Tap a name to give them the word."],
  hotTakeVerdict: ['My verdict: give your opinion in two sentences.', 'Then go to the next round.'],
  awards: ['And now... the awards!', "Let's see who was the most toxic tonight."],
  podium: ['Congratulations to our top three!', 'Give them a round of applause!'],
  final: [
    "Remember: a red flag isn't always the end, but it's always worth a conversation.",
    'Thank you for playing and for sharing your opinions!',
  ],
}

/** A red flag one player caught in the round. */
export const Q_RED_CAUGHT = [
  '{player} caught "{card}". {player}, would you forgive this if it happened only once?',
  'Who here has dated someone who {cardlc}? No names!',
  '{player}, what would you say to a partner who {cardlc}?',
  '{player}, is "{card}" a deal breaker for you? Why?',
  '{player}, why do you think people do this: "{card}"?',
]

/** A red flag several players caught. */
export const Q_RED_MANY = [
  '{count} people caught "{card}". Is it really that bad, or are we overreacting?',
  '{count} of you caught "{card}". Why do you think it is so common?',
  '"{card}" got {count} people. When does it become a deal breaker?',
  '{count} catches for "{card}". Can it be OK in some situations or cultures?',
]

/** A green flag that nobody caught (everyone let it fall). */
export const Q_GREEN_NOBODY = [
  'Nobody caught "{card}". Is this a green flag or just the bare minimum?',
  'Everyone let "{card}" fall. Do we expect too little from partners?',
  '"{card}" fell and nobody saved it. Would you notice this in real life?',
  'Is "{card}" romantic, or should it be completely normal?',
]

/** A green flag one player let fall. */
export const Q_GREEN_MISSED = [
  '{player}, you let "{card}" fall. Green flag or bare minimum?',
  '{player}, would you notice if a partner {cardlc}?',
  '{player}, how important is it that a partner {cardlc}?',
  '{player}, is "{card}" something you would put on your list?',
]

/** A grey card that was a red flag: the player thought it was fine. */
export const Q_GREY_CONFUSED = [
  '{player}, you thought "{card}" was green. Defend your choice!',
  '{player} caught "{card}" when it was grey. Did it look harmless at first?',
  '{player}, "{card}" looked neutral. When does it become a red flag?',
  'Why can "{card}" look like a green flag at first, {player}?',
]

/** Sabotages between players. */
export const Q_SABOTAGE = [
  '{player} sabotaged {other} {times}. {other}, is that a red flag in a friend?',
  '{player}, why did you pick {other}? Is that how you treat people you like?',
  '{other}, how did it feel when {player} sabotaged you?',
  '{player} attacked {other} {times}. Is a little jealousy ever cute?',
]

/** Follow-up questions during a defense (about the card being defended). */
export const Q_DEFENSE = [
  'What if they did "{card}" every day?',
  'Would you accept "{card}" from a friend?',
  '{player}, would you date someone who {cardlc}?',
  'Is there a situation where "{card}" is actually OK?',
  'Everyone: hands up if you would forgive "{card}".',
]

/** Hot Take: questions for the RED side. */
export const Q_HOT_RED = [
  '{pct}% said RED to "{card}". {player}, what is the worst case?',
  '{player}, you voted red. What would make "{card}" OK for you?',
  '{player}, how would you tell a partner that "{card}" bothers you?',
  'Red side ({pct}%): is "{card}" always a red flag, or only sometimes?',
]

/** Hot Take: questions for the GREEN side. */
export const Q_HOT_GREEN = [
  '{pct}% said GREEN to "{card}". {player}, why is it fine for you?',
  '{player}, you voted green. Where is the line for "{card}"?',
  '{player}, is "{card}" a green flag or just your personal taste?',
  'Green side ({pct}%): would you still say green after five years together?',
]

/** Lobby: dating-profile lines. */
export const Q_PROFILE = [
  '{player}, your profile says "{bio}". Green flag or red flag?',
  'Who would swipe right on "{bio}"? {player}, tell us more!',
  '{player}, "{bio}"... is that a promise or a warning?',
  'Everyone: is "{bio}" a red flag in a dating profile?',
]

/** Fun facts for the closing (each one needs its data). */
export const FACT_TOXIC = 'Our most toxic player tonight: {player}, with {count} red flags. We still love you!'
export const FACT_TOP_RED = 'The red flag most of you caught: "{card}". {count} people fell for it!'
export const FACT_DIVIDED = 'The most divided Hot Take: "{card}", {pct}% red and {pct2}% green.'

/** Used only when there is no game data for the phase. */
export const Q_GENERAL = [
  'What is the biggest red flag you have seen in a movie or a series?',
  'Is a red flag always a deal breaker?',
  'Can a person change a red flag? How?',
  "What is a green flag that people don't value enough?",
  'Are red flags the same for everyone, or does it depend on culture?',
  'What small green flag makes you really happy?',
]

export const Q_INTRO = [
  'What is the first green flag you notice in a person?',
  'Can you name a red flag from a movie or a song?',
  'Is it easier to see red flags in your friends or in yourself?',
  'Who decides what is a red flag: you, your friends or your family?',
]

export const Q_CLOSING = [
  'What is ONE green flag you want in your next relationship?',
  'Did you change your mind about any card today?',
  'Which red flag from today is the hardest to see in real life?',
  'What is one green flag YOU have?',
]
