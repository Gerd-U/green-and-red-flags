import { useState } from 'react'
import Avatar from '../components/Avatar'
import { COLORS, PARTS, randomAvatar, type PartKey } from '../lib/avatar'
import type { AvatarConfig } from '../lib/types'

type Tab = PartKey | 'colors'

const TABS: { key: Tab; label: string }[] = [
  ...PARTS.map((p) => ({ key: p.key as Tab, label: p.label })),
  { key: 'colors', label: 'Colors' },
]

const pretty = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface Props {
  name: string
  initial: AvatarConfig
  onReady: (avatar: AvatarConfig) => void
  onChange?: (avatar: AvatarConfig) => void
}

export default function Editor({ name, initial, onReady, onChange }: Props) {
  const [avatar, setAvatar] = useState<AvatarConfig>(initial)
  const [tab, setTab] = useState<Tab>('body')
  const [pop, setPop] = useState(0)

  const update = (next: AvatarConfig) => {
    setAvatar(next)
    setPop((n) => n + 1)
    onChange?.(next)
  }

  const part = PARTS.find((p) => p.key === tab)

  const cycle = (dir: 1 | -1) => {
    if (part) {
      const list = part.options
      const i = list.indexOf(avatar[part.key])
      const next = list[(i + dir + list.length) % list.length]
      update({ ...avatar, [part.key]: next } as AvatarConfig)
    } else {
      const i = COLORS.indexOf(avatar.color1)
      update({ ...avatar, color1: COLORS[(i + dir + COLORS.length) % COLORS.length] })
    }
  }

  const currentLabel = part ? pretty(avatar[part.key]) : 'Main color'

  return (
    <div className="editor">
      <div className="editor-head">
        <span className="chip">Build your character</span>
        <strong className="editor-name">{name}</strong>
      </div>

      <div className="editor-preview">
        <button className="arrow-btn" onClick={() => cycle(-1)} aria-label="Previous option">
          ◀
        </button>
        <div className="preview-stage" key={pop}>
          <div className="preview-pop">
            <Avatar config={avatar} size={150} />
          </div>
          <div className="preview-shadow" />
        </div>
        <button className="arrow-btn" onClick={() => cycle(1)} aria-label="Next option">
          ▶
        </button>
      </div>
      <div className="option-label">{currentLabel}</div>

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
        {part ? (
          <div className="thumb-grid">
            {part.options.map((opt) => {
              const cfg = { ...avatar, [part.key]: opt } as AvatarConfig
              const active = avatar[part.key] === opt
              return (
                <button
                  key={opt}
                  className={`thumb ${active ? 'active' : ''}`}
                  onClick={() => update(cfg)}
                  aria-label={pretty(opt)}
                >
                  <Avatar config={cfg} size={54} animate={false} />
                  <span>{pretty(opt)}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="color-rows">
            <div className="label">Main color</div>
            <div className="swatches">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`swatch ${avatar.color1 === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => update({ ...avatar, color1: c })}
                  aria-label={`Main color ${c}`}
                />
              ))}
            </div>
            <div className="label">Accent color</div>
            <div className="swatches">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`swatch ${avatar.color2 === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => update({ ...avatar, color2: c })}
                  aria-label={`Accent color ${c}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="editor-actions">
        <button className="btn btn-ghost" onClick={() => update(randomAvatar())}>
          🎲 Random
        </button>
        <button className="btn btn-green btn-big" onClick={() => onReady(avatar)}>
          Ready!
        </button>
      </div>
    </div>
  )
}
