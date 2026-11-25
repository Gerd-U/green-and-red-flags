import type { RealtimeChannel } from '@supabase/supabase-js'
import { createLocalChannel } from './localChannel'
import { localRealtime, supabase } from './supabase'

// Channel layout
//  gr-<CODE>            main channel: presence + admin state + sabotage events
//  gr-<CODE>-p-<id>     one per player: that player's ticks / catches / votes.
//                       Only the admin listens, so 10 msg/s per phone don't
//                       fan out to every other phone (keeps us far below the
//                       Supabase free-tier message limits).
export const mainTopic = (code: string) => `gr-${code}`
export const playerTopic = (code: string, id: string) => `gr-${code}-p-${id}`

export function makeRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)]
  return code
}

export function normalizeCode(code: string | null | undefined): string {
  return (code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
}

export type ChannelStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | string

export interface Room {
  channel: RealtimeChannel
  ready: boolean
  on<T>(event: string, handler: (payload: T) => void): Room
  send(event: string, payload: unknown): void
  subscribe(onReady?: () => void): Room
  close(): void
}

// Wraps a supabase channel so send() is a no-op until subscribed (never throws).
export function openChannel(
  topic: string,
  opts: { presenceKey?: string; onStatus?: (status: ChannelStatus) => void } = {}
): Room {
  const client = supabase
  let channel: RealtimeChannel
  if (localRealtime || !client) {
    channel = createLocalChannel(topic, opts.presenceKey ?? '') as unknown as RealtimeChannel
  } else {
    channel = client.channel(topic, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: opts.presenceKey ?? '' },
      },
    })
  }
  const room: Room = {
    channel,
    ready: false,
    on(event, handler) {
      channel.on('broadcast', { event }, (msg) => handler(msg.payload as never))
      return room
    },
    send(event, payload) {
      if (!room.ready) return
      try {
        channel.send({ type: 'broadcast', event, payload }).catch(() => {})
      } catch {
        /* ignore */
      }
    },
    subscribe(onReady) {
      channel.subscribe((status) => {
        room.ready = status === 'SUBSCRIBED'
        opts.onStatus?.(status)
        if (status === 'SUBSCRIBED') onReady?.()
      })
      return room
    },
    close() {
      room.ready = false
      try {
        if (client && !localRealtime) client.removeChannel(channel)
        else channel.unsubscribe()
      } catch {
        /* ignore */
      }
    },
  }
  return room
}
