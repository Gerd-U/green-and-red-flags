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

export function getPlayerId(): string {
  let id = load<string | null>('gr.playerId', null)
  if (!id) {
    id = Math.random().toString(36).slice(2, 10)
    save('gr.playerId', id)
  }
  return id
}
