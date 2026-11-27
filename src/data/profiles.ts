// "Dating profile" lines players pick in the lobby. They show up on the
// projector as profile cards: an easy ice-breaker to talk in English.
export const PROFILE_LINES: string[] = [
  'I answer messages after 3 days',
  'My mom is my best friend',
  "I'm not like other people",
  'I want a gym partner',
  'I love to make jokes',
  'I have 3 cats and I love them',
  'I love pineapple on pizza',
  'I will take your hoodie',
  'I cook, but I never wash the dishes',
  'I am here for the food',
  'My ex says hi',
  'I cry at every movie',
  'I think too much',
  'I read your message at 2 a.m.',
  'My dog has to like you',
  'I plan every date',
  'Only good vibes here',
  'Ask me about my money ideas',
]

export function randomProfileLine(): string {
  return PROFILE_LINES[Math.floor(Math.random() * PROFILE_LINES.length)]
}

export function sanitizeProfileLine(v: unknown): string {
  return typeof v === 'string' && PROFILE_LINES.includes(v) ? v : randomProfileLine()
}
