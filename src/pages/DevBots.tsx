import { useSearchParams } from 'react-router-dom'

// DEV ONLY (registered only in `npm run dev`): runs N bot players at once in
// iframes, so the whole game can be tested with 7 "phones" on one screen.
// Usage: /dev/bots?room=ABCD&n=7                 bots only
//        /dev/bots?room=ABCD&n=7&admin=1         + the projector view
//        /dev/bots?room=ABCD&n=7&admin=1&host=1  + the host phone (logs in by itself)
//        add &aw=1280&ah=720 to choose the projector size
// (needs VITE_LOCAL_REALTIME=1 or a Supabase project)
export default function DevBots() {
  const [params] = useSearchParams()
  const room = (params.get('room') ?? '').toUpperCase()
  const n = Math.min(10, Math.max(0, Number(params.get('n') ?? 7)))
  const withAdmin = params.get('admin') === '1'
  const withHost = params.get('host') === '1'
  // projector size, e.g. &aw=1280&ah=720 or &aw=1920&ah=1080 (default 960x540)
  const aw = Number(params.get('aw') ?? 960)
  const ah = Number(params.get('ah') ?? 540)
  if (!room) return <p style={{ padding: 20 }}>Add ?room=ABCD&amp;n=7 to the URL.</p>
  return (
    <div style={{ background: '#000', minHeight: '100vh', padding: 4 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {withAdmin && <iframe title="admin" src="/admin" style={{ width: aw, height: ah, border: 0, display: 'block' }} />}
        {withHost && (
          <iframe title="host" src={`/host?autologin=1&room=${room}`} style={{ width: 330, height: 540, border: 0, display: 'block' }} />
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {Array.from({ length: n }, (_, i) => (
          <iframe
            key={i}
            title={`bot ${i + 1}`}
            src={`/play?room=${room}&pid=bot${i + 1}&bot=1`}
            style={{ width: 180, height: 380, border: 0 }}
          />
        ))}
      </div>
    </div>
  )
}
