// "Dating profile" lines players pick in the lobby. They show up on the
// projector as profile cards: an easy ice-breaker to talk in English.
export const PROFILE_LINES: string[] = [
  'I reply in 3 business days',
  'My mom is my best friend',
  "I'm not like other people",
  'Looking for my gym partner',
  'Fluent in sarcasm',
  'I have 3 cats and no regrets',
  'Pineapple on pizza is a must',
  "I'll steal your hoodie",
  'Will cook, will not wash dishes',
  'Just here for the snacks',
  'My ex says hi',
  'I cry at every movie',
  'Professional overthinker',
  'Seen at 2 a.m., replying at noon',
  'My dog has to approve you',
  'I plan dates in spreadsheets',
  'Here for good vibes only',
  'Ask me about my crypto',
]

export function randomProfileLine(): string {
  return PROFILE_LINES[Math.floor(Math.random() * PROFILE_LINES.length)]
}

export function sanitizeProfileLine(v: unknown): string {
  return typeof v === 'string' && PROFILE_LINES.includes(v) ? v : randomProfileLine()
}
