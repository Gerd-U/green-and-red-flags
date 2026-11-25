// Dev-only stand-in for a Supabase Realtime channel, built on BroadcastChannel.
// Lets you test the whole game with several browser tabs on ONE computer
// without a Supabase project: set VITE_LOCAL_REALTIME=1 in .env.
// It is never used in production builds unless that variable is set.

type Listener = (msg: { payload: unknown }) => void

interface Wire {
  kind: 'broadcast' | 'presence' | 'presence-req' | 'leave'
  from: string
  event?: string
  payload?: unknown
  key?: string
  meta?: unknown
}

export function createLocalChannel(topic: string, presenceKey: string) {
  const bc = new BroadcastChannel(`local-rt-${topic}`)
  const self = Math.random().toString(36).slice(2)
  const key = presenceKey || self
  const broadcastListeners: Record<string, Listener[]> = {}
  const syncListeners: (() => void)[] = []
  const presence = new Map<string, { meta: unknown; seen: number; owner: string }>()
  let myMeta: unknown = null
  let closed = false

  const emitSync = () => syncListeners.forEach((cb) => cb())
  const post = (w: Omit<Wire, 'from'>) => {
    if (!closed) bc.postMessage({ ...w, from: self })
  }

  bc.onmessage = (e: MessageEvent<Wire>) => {
    const w = e.data
    if (w.kind === 'broadcast' && w.event) {
      broadcastListeners[w.event]?.forEach((cb) => cb({ payload: w.payload }))
    } else if (w.kind === 'presence' && w.key) {
      presence.set(w.key, { meta: w.meta, seen: Date.now(), owner: w.from })
      emitSync()
    } else if (w.kind === 'presence-req') {
      if (myMeta) post({ kind: 'presence', key, meta: myMeta })
    } else if (w.kind === 'leave' && w.key) {
      const p = presence.get(w.key)
      if (p && p.owner === w.from) {
        presence.delete(w.key)
        emitSync()
      }
    }
  }

  const heartbeat = setInterval(() => {
    if (myMeta) post({ kind: 'presence', key, meta: myMeta })
    const now = Date.now()
    let changed = false
    for (const [k, v] of presence) {
      if (v.owner !== self && now - v.seen > 5000) {
        presence.delete(k)
        changed = true
      }
    }
    if (changed) emitSync()
  }, 1500)

  const onUnload = () => post({ kind: 'leave', key })
  window.addEventListener('beforeunload', onUnload)

  const channel = {
    on(type: string, filter: { event: string }, cb: Listener | (() => void)) {
      if (type === 'broadcast') (broadcastListeners[filter.event] ??= []).push(cb as Listener)
      else if (type === 'presence' && filter.event === 'sync') syncListeners.push(cb as () => void)
      return channel
    },
    send(msg: { event: string; payload: unknown }) {
      post({ kind: 'broadcast', event: msg.event, payload: msg.payload })
      return Promise.resolve('ok')
    },
    subscribe(cb: (status: string) => void) {
      setTimeout(() => {
        cb('SUBSCRIBED')
        post({ kind: 'presence-req' })
      }, 50)
      return channel
    },
    track(meta: unknown) {
      myMeta = meta
      presence.set(key, { meta, seen: Date.now(), owner: self })
      post({ kind: 'presence', key, meta })
      emitSync()
      return Promise.resolve('ok')
    },
    presenceState() {
      const out: Record<string, unknown[]> = {}
      for (const [k, v] of presence) out[k] = [v.meta]
      return out
    },
    unsubscribe() {
      post({ kind: 'leave', key })
      closed = true
      clearInterval(heartbeat)
      window.removeEventListener('beforeunload', onUnload)
      bc.close()
      return Promise.resolve('ok')
    },
  }
  return channel
}
