import { useEffect, useState, type ReactNode } from 'react'
import Avatar from '../components/Avatar'
import { PROFILE_LINES } from '../data/profiles'
import {
  ACCESSORIES,
  BOTTOMS,
  COLORS,
  EYES,
  HAIR_COLORS,
  HAIRS,
  MOUTHS,
  pretty,
  randomAvatar,
  SHOES,
  SKINS,
  TOPS,
} from '../lib/avatar'
import type { AvatarConfig, Pose } from '../lib/types'

type Tab = 'face' | 'hair' | 'clothes' | 'extras'
const TABS: { key: Tab; label: string }[] = [
  { key: 'face', label: 'Face' },
  { key: 'hair', label: 'Hair' },
  { key: 'clothes', label: 'Clothes' },
  { key: 'extras', label: 'Extras' },
]

interface Props {
  name: string
  initial: AvatarConfig
  initialBio: string
  onReady: (avatar: AvatarConfig, bio: string) => void
  onChange?: (avatar: AvatarConfig, bio: string) => void
}

export default function Editor({ name, initial, initialBio, onReady, onChange }: Props) {
  const [avatar, setAvatar] = useState<AvatarConfig>(initial)
  const [bio, setBio] = useState(initialBio)
  const [tab, setTab] = useState<Tab>('face')
  const [pose, setPose] = useState<Pose>('idle')

  useEffect(() => {
    if (pose === 'idle') return
    const t = setTimeout(() => setPose('idle'), 900)
    return () => clearTimeout(t)
  }, [pose])

  const set = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    const next = { ...avatar, [key]: value }
    setAvatar(next)
    setPose('cheer')
    onChange?.(next, bio)
  }

  const pickBio = (line: string) => {
    setBio(line)
    onChange?.(avatar, line)
  }
  /** tapping the bubble swaps the line for another one */
  const nextBio = () => {
    const i = PROFILE_LINES.indexOf(bio)
    pickBio(PROFILE_LINES[(i + 1 + Math.floor(Math.random() * (PROFILE_LINES.length - 1))) % PROFILE_LINES.length])
  }

  // thumbnails: the current character with one part swapped (3-column grid)
  const thumbs = <K extends keyof AvatarConfig>(key: K, options: readonly AvatarConfig[K][], crop: 'head' | 'full') => (
    <div className="thumb-grid">
      {options.map((opt) => {
        const cfg = { ...avatar, [key]: opt }
        return (
          <button
            key={String(opt)}
            className={`thumb ${avatar[key] === opt ? 'active' : ''} ${crop}`}
            onClick={() => set(key, opt)}
            aria-label={pretty(String(opt))}
            aria-pressed={avatar[key] === opt}
          >
            <Avatar config={cfg} size={crop === 'head' ? 52 : 46} crop={crop} animate={false} />
            <span>{pretty(String(opt))}</span>
          </button>
        )
      })}
    </div>
  )

  const swatches = (key: 'skin' | 'hairColor' | 'topColor' | 'bottomColor', colors: string[]) => (
    <div className="swatch-grid">
      {colors.map((c) => (
        <button
          key={c}
          className={`swatch ${avatar[key] === c ? 'active' : ''}`}
          style={{ background: c }}
          onClick={() => set(key, c)}
          aria-label={`${key} ${c}`}
          aria-pressed={avatar[key] === c}
        />
      ))}
    </div>
  )

  const section = (label: string, body: ReactNode) => (
    <div className="ed-section">
      <div className="label">{label}</div>
      {body}
    </div>
  )

  return (
    <div className="editor">
      <div className="editor-quick">
        <button
          className="btn btn-ghost"
          onClick={() => {
            const a = randomAvatar()
            setAvatar(a)
            setPose('dance')
            onChange?.(a, bio)
          }}
        >
          🎲 Random
        </button>
        <button className="btn btn-green" onClick={() => onReady(avatar, bio)}>
          Looks good! ✓
        </button>
      </div>

      <div className="editor-preview">
        <button className="preview-stage" onClick={() => setPose('dance')} aria-label="Your character (tap to dance)">
          <Avatar config={avatar} size={128} pose={pose} />
          <span className="preview-shadow" />
        </button>
        <div className="preview-side">
          <strong className="editor-name">{name}</strong>
          <button className="preview-bio" onClick={nextBio} aria-label="Change your dating profile line">
            “{bio}”<span className="bio-hint">tap to change ↻</span>
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="editor-options">
        {tab === 'face' && (
          <>
            {section('Skin', swatches('skin', SKINS))}
            {section('Eyes', thumbs('eyes', EYES, 'head'))}
            {section('Mouth', thumbs('mouth', MOUTHS, 'head'))}
          </>
        )}
        {tab === 'hair' && (
          <>
            {section('Hair color', swatches('hairColor', HAIR_COLORS))}
            {section('Hairstyle', thumbs('hair', HAIRS, 'head'))}
          </>
        )}
        {tab === 'clothes' && (
          <>
            {section('Top', thumbs('top', TOPS, 'full'))}
            {section('Top color', swatches('topColor', COLORS))}
            {section('Bottom', thumbs('bottom', BOTTOMS, 'full'))}
            {section('Bottom color', swatches('bottomColor', COLORS))}
            {section('Shoes', thumbs('shoes', SHOES, 'full'))}
          </>
        )}
        {tab === 'extras' && (
          <>
            {section(
              'Dating profile (tap one)',
              <div className="bio-list">
                {PROFILE_LINES.map((line) => (
                  <button key={line} className={`bio ${bio === line ? 'active' : ''}`} onClick={() => pickBio(line)}>
                    {line}
                  </button>
                ))}
              </div>
            )}
            {section('Accessory', thumbs('accessory', ACCESSORIES, 'full'))}
          </>
        )}
      </div>
    </div>
  )
}
