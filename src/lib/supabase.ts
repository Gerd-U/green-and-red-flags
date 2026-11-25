import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Dev only: VITE_LOCAL_REALTIME=1 runs the game across tabs of one browser, no Supabase needed. */
export const localRealtime = import.meta.env.VITE_LOCAL_REALTIME === '1'

export const supabaseConfigured = Boolean(url && key) || localRealtime

export const supabase: SupabaseClient | null =
  url && key
  ? createClient(url as string, key as string, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 40 } },
    })
  : null
