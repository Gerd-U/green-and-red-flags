// =====================================================================
//  HOST SCRIPT (on the host's phone) — edit freely.
//
//  The host sees ONE step at a time: "SAY" steps (what you say) and then
//  "ASK" steps (a question for a person). Keep each step to 1–2 short
//  sentences, simple English (A2–B1).
//
//  Placeholders, filled with real data from the game:
//    {player}  a player's name           {other}   a second player's name
//    {card}    the card sentence         {cardlc}  same, first letter lowercase
//              ("someone who {cardlc}" -> "someone who checks your phone")
//    {count}   a number of people        {times}   "once", "twice", "3 times"
//    {pct}     a percentage              {pct2}    100 - pct
//    {bio}     a player's dating-profile line
//  A question is only shown if ALL its placeholders can be filled, so you
//  never see a "{player}" on screen. Questions with real names and cards
//  come first; GENERAL ones only when there is no data.
// =====================================================================

/** SAY steps for each phase, in order (one step = one item). */
export const SCRIPT_LINES = {
  intro: [
    'Hi everyone! Today we talk about green flags and red flags in a partner.',
    'A RED flag is a bad sign. It can mean the relationship is not healthy.',
    'A GREEN flag is a good sign. For example: respect, trust and kindness.',
    'In the game, catch the green flags and move away from the red ones.',
  ],
  lobby: ['Scan the code on the screen with your phone.', 'Make your character. Choose a line for your profile.'],
  tutorial: ['Look at the screen. Catch green, move away from red.', 'Grey cards: read them first!'],
  round1: ['Round 1: First Date. You can see all the colors.', 'If you catch a red flag, you may need to explain it!'],
  round2: ['Round 2: Getting Serious. Some cards are grey now.', 'Read the card before you catch it!'],
  round3: ['Round 3: Meet the Parents. All cards are grey.', 'Points are double. Last chance!'],
  defense: ['{player} caught "{card}". {player}, you have 20 seconds. Explain it!', 'Everyone: listen. Then vote on your phone.'],
  roundEnd: ['Time is up! Look at the ranking.', 'Now we talk about this round.'],
  hotTakeVote: ['Hot Take! Read the sentence. Is it red or green?', 'Vote on your phone. Don\'t talk yet!'],
  hotTakeReveal: ['{pct}% said RED and {pct2}% said GREEN.', 'Now I choose people to talk. Tap a name.'],
  hotTakeVerdict: ['Say your opinion in 1 or 2 sentences.', 'Then tap Next.'],
  awards: ['Now... the prizes!', 'Who was the most toxic player today?'],
  podium: ['Congratulations to the top 3!', 'Everyone, clap for them!'],
  final: ['A red flag is not always the end. But it is good to talk about it.', 'Thank you for playing!'],
}

/** A red flag one player caught in the round. */
export const Q_RED_CAUGHT = [
  '{player}, you caught "{card}". Can you forgive this one time?',
  'Has someone you know done this: "{card}"? No names!',
  '{player}, what can you say to a partner who {cardlc}?',
  '{player}, is "{card}" the end of the relationship for you? Why?',
  '{player}, why do people do this: "{card}"?',
]

/** A red flag several players caught. */
export const Q_RED_MANY = [
  '{count} people caught "{card}". Is it really so bad?',
  '{count} of you caught "{card}". Why is it so common?',
  '"{card}": {count} people caught it. When is it the end?',
  '{count} people caught "{card}". Is it OK sometimes?',
]

/** A green flag that nobody caught (everyone let it fall). */
export const Q_GREEN_NOBODY = [
  'Nobody caught "{card}". Is it special, or is it normal?',
  'Everyone missed "{card}". Do we want too little from a partner?',
  'Nobody caught "{card}". Do you see this in real life?',
  'Is "{card}" romantic, or is it normal?',
]

/** A green flag one player let fall. */
export const Q_GREEN_MISSED = [
  '{player}, you missed "{card}". Is it important to you?',
  '{player}, do you notice when a partner {cardlc}?',
  '{player}, is it important that a partner {cardlc}?',
  '{player}, do you want "{card}" in a partner?',
]

/** A grey card that was a red flag: the player thought it was fine. */
export const Q_GREY_CONFUSED = [
  '{player}, you thought "{card}" was green. Why?',
  '{player}, you caught "{card}" when it was grey. Did it look OK?',
  '{player}, "{card}" looked OK. When is it a red flag?',
  '{player}, why can "{card}" look like a green flag?',
]

/** Sabotages between players. */
export const Q_SABOTAGE = [
  '{player} attacked {other} {times}. {other}, is that a red flag in a friend?',
  '{player}, why did you choose {other}?',
  '{other}, how did you feel when {player} attacked you?',
  '{player} attacked {other} {times}. Is a little jealousy OK?',
]

/** Follow-up questions during a defense (about the card being defended). */
export const Q_DEFENSE = [
  'And if they do "{card}" every day?',
  'Is "{card}" OK from a friend?',
  '{player}, can you date someone who {cardlc}?',
  'When is "{card}" OK?',
  'Everyone: hands up if you can forgive "{card}".',
]

/** Hot Take: questions for the RED side. */
export const Q_HOT_RED = [
  '{player}, you said RED to "{card}". Why?',
  '{player}, you voted red. When is "{card}" OK for you?',
  '{player}, how can you tell a partner that "{card}" is a problem?',
  '{player}, is "{card}" always red, or only sometimes?',
]

/** Hot Take: questions for the GREEN side. */
export const Q_HOT_GREEN = [
  '{player}, you said GREEN to "{card}". Why is it OK?',
  '{player}, you voted green. When is "{card}" too much?',
  '{player}, is "{card}" a green flag for everyone, or only for you?',
  '{player}, is it still green after 5 years together?',
]

/** Lobby: dating-profile lines. */
export const Q_PROFILE = [
  '{player}, your profile says "{bio}". Green flag or red flag?',
  '{player}, your profile says "{bio}". Tell us more!',
  '{player}, "{bio}". Is that good or bad?',
  'Everyone: is "{bio}" a red flag on a dating profile?',
]

/** Fun facts for the closing (each one needs its data). */
export const FACT_TOXIC = 'The most toxic player today: {player} (red flags: {count}). We still love you!'
export const FACT_TOP_RED = 'The red flag you caught the most: "{card}" (people: {count}).'
export const FACT_DIVIDED = 'The Hot Take with the most mixed votes: "{card}". {pct}% red and {pct2}% green.'

/** Used only when there is no game data for the phase. */
export const Q_GENERAL = [
  'What is a big red flag in a movie or a series?',
  'Is a red flag always the end?',
  'Can a person change a red flag? How?',
  'What is a green flag that people forget?',
  'Are red flags the same in every country?',
  'What small green flag makes you happy?',
]

export const Q_INTRO = [
  'What is the first green flag you see in a person?',
  'Can you say a red flag from a movie or a song?',
  'Is it easier to see red flags in friends or in you?',
  'Who decides what is a red flag: you, your friends or your family?',
]

export const Q_CLOSING = [
  'What is ONE green flag you want in a partner?',
  'Did you change your opinion about a card today?',
  'Which red flag from today is hard to see in real life?',
  'What is one green flag that YOU have?',
]
