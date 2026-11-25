import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Play from './pages/Play'
import { supabaseConfigured } from './lib/supabase'
import PolyBackground from './components/PolyBackground'

function MissingConfig() {
  return (
    <div className="screen center">
      <PolyBackground />
      <div className="panel narrow">
        <h1 className="title-sm">Setup needed</h1>
        <p>
          Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to a
          <code> .env</code> file (or to Vercel&apos;s environment variables) and restart.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!supabaseConfigured) return <MissingConfig />
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/play" element={<Play />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
