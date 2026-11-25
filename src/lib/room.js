import { supabase } from './supabase'

// Channel layout
//  gr-<CODE>            main channel: presence + admin state + sabotage events
//  gr-<CODE>-p-<id>     one per player: that player's ticks / catches / votes,
//                       only the admin listens, so 10 msg/s don't fan out to everyone.
export const mainTopic = (code) => `gr-${code}`
export const playerTopic = (code, id) => `gr-${code}-p-${id}`

export function makeRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)]
  return code
}

export function normalizeCode(code) {
  return (code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
}

// Wraps a supabase channel so send() is a no-op until subscribed (never throws).
export function openChannel(topic, { presenceKey, onStatus } = {}) {
  const channel = supabase.channel(topic, {
    config: {
      broadcast: { self: false, ack: false },
      presence: presenceKey ? { key: presenceKey } : undefined,
    },
  })
  const wrapper = {
    channel,
    ready: false,
    on(event, handler) {
      channel.on('broadcast', { event }, ({ payload }) => handler(payload))
      return wrapper
    },
    send(event, payload) {
      if (!wrapper.ready) return
      try {
        channel.send({ type: 'broadcast', event, payload }).catch(() => {})
      } catch {
        /* ignore */
      }
    },
    subscribe(onReady) {
      channel.subscribe((status) => {
        wrapper.ready = status === 'SUBSCRIBED'
        onStatus?.(status)
        if (status === 'SUBSCRIBED') onReady?.()
      })
      return wrapper
    },
    close() {
      wrapper.ready = false
      try {
        supabase.removeChannel(channel)
      } catch {
        /* ignore */
      }
    },
  }
  return wrapper
}
