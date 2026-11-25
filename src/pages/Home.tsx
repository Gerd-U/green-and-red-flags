import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import PolyBackground from '../components/PolyBackground'
import Avatar from '../components/Avatar'
import { normalizeCode } from '../lib/room'
import { load } from '../lib/storage'
import type { AvatarConfig } from '../lib/types'

const DEMO_A: AvatarConfig = { body: 'crystal', eyes: 'hearts', mouth: 'smile', hat: 'crown', color1: '#22c55e', color2: '#ffd23f' }
const DEMO_B: AvatarConfig = { body: 'triangle', eyes: 'angry', mouth: 'serious', hat: 'horns', color1: '#ff3b5c', color2: '#8b5cf6' }

export default function Home() {
  const nav = useNavigate()
  const [code, setCode] = useState(() => load<string>('gr.lastRoom', ''))

  const join = (e: FormEvent) => {
    e.preventDefault()
    const c = normalizeCode(code)
    if (c.length === 4) nav(`/play?room=${c}`)
  }

  return (
    <div className="screen home">
      <PolyBackground />
      <div className="home-inner">
        <div className="home-hero">
          <div className="hero-avatars">
            <Avatar config={DEMO_A} size={110} />
            <Avatar config={DEMO_B} size={110} className="delay" />
          </div>
          <h1 className="logo">
            <span className="g">Green</span> <span className="amp">&amp;</span> <span className="r">Red</span>
            <br />
            <span className="flags">Flags</span>
          </h1>
          <p className="tagline">Catch the green flags. Dodge the red ones. Defend yourself.</p>
        </div>

        <form className="panel join-panel" onSubmit={join}>
          <label className="label" htmlFor="code">Room code</label>
          <input
            id="code"
            className="input code-input"
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            placeholder="ABCD"
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
            maxLength={4}
          />
          <button className="btn btn-green btn-big" disabled={normalizeCode(code).length !== 4}>
            Join as player
          </button>
          <div className="divider"><span>or</span></div>
          <button type="button" className="btn btn-ghost" onClick={() => nav('/admin')}>
            Host a game (big screen)
          </button>
        </form>
      </div>
    </div>
  )
}
