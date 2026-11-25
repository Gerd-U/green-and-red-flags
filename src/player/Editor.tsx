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

  // thumbnails: the current character with one part swapped
  const thumbs = <K extends keyof AvatarConfig>(key: K, options: readonly AvatarConfig[K][], crop: 'head' | 'full') => (
    <div className="thumb-row">
      {options.map((opt) => {
        const cfg = { ...avatar, [key]: opt }
        return (
          <button
            key={String(opt)}
            className={`thumb ${avatar[key] === opt ? 'active' : ''} ${crop}`}
            onClick={() => set(key, opt)}
            aria-label={pretty(String(opt))}
          >
            <Avatar config={cfg} size={crop === 'head' ? 52 : 46} crop={crop} animate={false} />
            <span>{pretty(String(opt))}</span>
          </button>
        )
      })}
    </div>
  )

  const swatches = (key: 'skin' | 'hairColor' | 'topColor' | 'bottomColor', colors: string[]) => (
    <div className="swatch-row">
      {colors.map((c) => (
        <button
          key={c}
          className={`swatch ${avatar[key] === c ? 'active' : ''}`}
          style={{ background: c }}
          onClick={() => set(key, c)}
          aria-label={`${key} ${c}`}
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
      <div className="editor-head">
        <span className="chip">Build your character</span>
        <strong className="editor-name">{name}</strong>
      </div>

      <button className="editor-preview" onClick={() => setPose('dance')} aria-label="Preview (tap to dance)">
        <div className="preview-stage">
          <Avatar config={avatar} size={128} pose={pose} />
          <div className="preview-shadow" />
        </div>
        <div className="preview-bio">“{bio}”</div>
      </button>

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
            {section('Hairstyle', thumbs('hair', HAIRS, 'head'))}
            {section('Hair color', swatches('hairColor', HAIR_COLORS))}
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
            {section('Accessory', thumbs('accessory', ACCESSORIES, 'full'))}
            {section(
              'Dating profile',
              <div className="bio-list">
                {PROFILE_LINES.map((line) => (
                  <button key={line} className={`bio ${bio === line ? 'active' : ''}`} onClick={() => pickBio(line)}>
                    {line}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="editor-actions">
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
        <button className="btn btn-green btn-big" onClick={() => onReady(avatar, bio)}>
          Ready!
        </button>
      </div>
    </div>
  )
}
