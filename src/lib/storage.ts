// localStorage helpers that never throw (private mode, blocked storage, etc.)
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

// `slot` lets you test several players in one browser: /play?room=ABCD&pid=2
export function getPlayerId(slot = ''): string {
  const key = 'gr.playerId' + slot
  let id = load<string | null>(key, null)
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + slot.replace('.', '')
    save(key, id)
  }
  return id
}
