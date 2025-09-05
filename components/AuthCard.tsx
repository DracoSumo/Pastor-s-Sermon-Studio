'use client'

import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from './supabaseClient'

type Props = {
  className?: string
  /** Optional: fire when a session becomes active */
  onSignedIn?: (user: User) => void
  /** Optional: fire when user signs out */
  onSignedOut?: () => void
}

export default function AuthCard({ className = '', onSignedIn, onSignedOut }: Props) {
  const supabase = useMemo(() => getSupabase(), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  // Load current user + subscribe to auth changes
  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUser(data.user ?? null)
      if (data.user && onSignedIn) onSignedIn(data.user)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u && onSignedIn) onSignedIn(u)
      if (!u && onSignedOut) onSignedOut()
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase, onSignedIn, onSignedOut])

  async function signUp() {
    setBusy(true); setMsg('')
    const { error } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    setMsg(error ? `❌ ${error.message}` : '✅ Check your email to confirm (or sign in if confirmations are disabled).')
  }

  async function signIn() {
    setBusy(true); setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    setMsg(error ? `❌ ${error.message}` : '✅ Signed in!')
    if (!error) { setEmail(''); setPassword('') }
  }

  async function signOut() {
    setBusy(true); setMsg('')
    const { error } = await supabase.auth.signOut()
    setBusy(false)
    setMsg(error ? `❌ ${error.message}` : '👋 Signed out')
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {user ? (
        <>
          <span className="text-sm text-gray-600">Signed in as {user.email}</span>
          <button className="btn btn-outline" onClick={signOut} disabled={busy}>Sign out</button>
        </>
      ) : (
        <>
          <input
            className="input"
            placeholder="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: 200 }}
            disabled={busy}
          />
          <input
            className="input"
            type="password"
            placeholder="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: 160 }}
            disabled={busy}
          />
          <button className="btn btn-primary" onClick={signIn} disabled={busy}>Sign in</button>
          <button className="btn" onClick={signUp} disabled={busy}>Sign up</button>
        </>
      )}
      {msg && <span className="text-xs text-gray-500 ml-2">{msg}</span>}
    </div>
  )
}
