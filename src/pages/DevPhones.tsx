import { useSearchParams } from 'react-router-dom'

// DEV ONLY: the same screen at every phone size, side by side, to check the
// responsive layout. Each frame is its own player (pid=phone1..6).
//   /dev/phones?room=ABCD            players (join form / editor / game)
//   /dev/phones?room=ABCD&bot=1      players that play by themselves
//   /dev/phones?room=ABCD&host=1     the host view at every size
//   add &admin=1 to include the projector (small) so it all runs in one tab
const SIZES: [number, number][] = [
  [320, 568],
  [360, 640],
  [360, 740],
  [390, 844],
  [412, 915],
  [740, 360],
]

export default function DevPhones() {
  const [params] = useSearchParams()
  const room = (params.get('room') ?? '').toUpperCase()
  const bot = params.get('bot') === '1'
  const host = params.get('host') === '1'
  const tag = params.get('tag') ?? 'phone'
  const admin = params.get('admin') === '1'
  if (!room) return <p style={{ padding: 20 }}>Add ?room=ABCD to the URL.</p>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, background: '#000', alignItems: 'flex-start' }}>
      {SIZES.map(([w, h], i) => (
        <div key={i} style={{ color: '#fff', font: '12px sans-serif' }}>
          <div>
            {w}×{h}
          </div>
          <iframe
            title={`${w}x${h}`}
            src={host ? `/host?autologin=1&room=${room}` : `/play?room=${room}&pid=${tag}${i + 1}${bot ? '&bot=1' : ''}`}
            style={{ width: w, height: h, border: 0, display: 'block', background: '#160f24' }}
          />
        </div>
      ))}
      {admin && <iframe title="admin" src="/admin" style={{ width: 640, height: 360, border: 0 }} />}
    </div>
  )
}
