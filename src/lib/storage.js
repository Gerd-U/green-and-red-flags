// localStorage helpers that never throw (private mode, blocked storage, etc.)
export function load(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function remove(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function getPlayerId() {
  let id = load('gr.playerId')
  if (!id) {
    id = Math.random().toString(36).slice(2, 10)
    save('gr.playerId', id)
  }
  return id
}
