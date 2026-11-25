import { useSearchParams } from 'react-router-dom'

// DEV ONLY (registered only in `npm run dev`): runs N bot players at once in
// iframes, so the whole game can be tested with 7 "phones" on one screen.
// Usage: /dev/bots?room=ABCD&n=7   (needs VITE_LOCAL_REALTIME=1 or Supabase)
export default function DevBots() {
  const [params] = useSearchParams()
  const room = (params.get('room') ?? '').toUpperCase()
  const n = Math.min(10, Math.max(1, Number(params.get('n') ?? 7)))
  if (!room) return <p style={{ padding: 20 }}>Add ?room=ABCD&amp;n=7 to the URL.</p>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 4, background: '#000', minHeight: '100vh' }}>
      {Array.from({ length: n }, (_, i) => (
        <iframe
          key={i}
          title={`bot ${i + 1}`}
          src={`/play?room=${room}&pid=bot${i + 1}&bot=1`}
          style={{ width: 180, height: 380, border: 0 }}
        />
      ))}
    </div>
  )
}
