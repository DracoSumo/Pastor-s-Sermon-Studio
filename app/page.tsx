
// app/page.tsx — with Auth, Auto-onboarding, Church Switcher, ICS Feed
'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import AuthCard from '@/components/AuthCard'
import ChurchSwitcher from '@/components/ChurchSwitcher'
import { getSupabase } from '@/components/supabaseClient'

export type SongRow = {
  id: number
  title: string
  artist: string
  themes: string[]
  tempo: 'slow' | 'mid' | 'up'
  song_key?: string | null
  bpm?: number | null
  ccli_number?: string | null
}

export type SermonRow = {
  id?: string
  title: string
  theme: string
  date: string | null
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  passages: string[]
  notes: string
  setlist: number[]
  is_series_item: boolean
  series_id: string | null
  church_id?: string | null
}

export default function HomePage() {
  const supabase = useMemo(() => getSupabase(), [])
  const [songs, setSongs] = useState<SongRow[]>([])
  const [passages, setPassages] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [sermons, setSermons] = useState<SermonRow[]>([])
  const [series, setSeries] = useState<any[]>([])
  const [status, setStatus] = useState<string>('')
  const [shareUrl, setShareUrl] = useState<string>('')

  const [activeChurch, setActiveChurch] = useState<{ id: string | null, name?: string | null, feed_token?: string | null }>({ id: null })

  const [sermon, setSermon] = useState<SermonRow>({
    title: '',
    theme: 'faith',
    date: null,
    start_time: null,
    end_time: null,
    location: '',
    passages: [],
    notes: '',
    setlist: [],
    is_series_item: false,
    series_id: null,
    church_id: null,
  })

  // Auto-onboard: ensure church + membership and capture church_id
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: cid, error } = await supabase.rpc('ensure_default_church', { church_name: 'My Church' })
      if (!error && cid) {
        setSermon(s => ({ ...s, church_id: cid as string }))
        // If no church selected yet, set it as active
        if (!activeChurch.id) setActiveChurch({ id: cid as string })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // Load songs once
  useEffect(() => {
    (async () => {
      const { data: songRows } = await supabase
        .from('songs')
        .select('id,title,artist,themes,tempo,song_key,bpm,ccli_number')
        .order('title')
      if (songRows) setSongs(songRows as SongRow[])
    })()
  }, [supabase])

  // Load series + sermons for the active church
  useEffect(() => {
    (async () => {
      // SERIES
      let qs = supabase.from('series').select('*').order('created_at', { ascending: false })
      if (activeChurch.id) qs = qs.eq('church_id', activeChurch.id)
      const { data: seriesRows } = await qs
      if (seriesRows) setSeries(seriesRows as any[])

      // SERMONS
      let q = supabase.from('sermons').select('*').order('created_at', { ascending: false }).limit(20)
      if (activeChurch.id) q = q.eq('church_id', activeChurch.id)
      const { data: sermonRows } = await q
      if (sermonRows) setSermons(sermonRows as SermonRow[])
    })()
  }, [supabase, activeChurch.id])

  function toggleSong(id: number) {
    setSermon(prev => {
      const has = prev.setlist.includes(id)
      const setlist = has ? prev.setlist.filter(x => x !== id) : [...prev.setlist, id]
      return { ...prev, setlist }
    })
  }

  async function saveSermon() {
    setStatus('Saving…')
    const payload: SermonRow = {
      title: sermon.title || 'Untitled Sermon',
      theme: sermon.theme,
      date: sermon.date,
      start_time: sermon.start_time || null,
      end_time: sermon.end_time || null,
      location: sermon.location || null,
      passages,
      notes,
      setlist: sermon.setlist,
      is_series_item: sermon.is_series_item,
      series_id: sermon.series_id,
      church_id: sermon.church_id || activeChurch.id || null,
    }

    const { data, error } = await supabase.from('sermons').insert(payload).select().single()
    if (error) {
      setStatus(`❌ ${error.message}`)
      return
    }
    setStatus('✅ Saved')
    setSermons(prev => (data ? [data as SermonRow, ...prev] : prev))
  }

  async function makeShareLink(id: string) {
    setStatus('Creating share link…')
    try {
      const res = await fetch('/api/share/sermon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Share failed')
      setShareUrl(j.url)
      await navigator.clipboard.writeText(j.url)
      setStatus('🔗 Share link copied!')
    } catch (e: any) {
      setStatus(`❌ ${e.message || e}`)
    }
  }

  return (
    <main className="p-6 space-y-8 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Pastor Sermon Studio</h1>
        <div className="flex items-center gap-3">
          <ChurchSwitcher
            value={activeChurch.id}
            onChange={(id, meta) => {
              setActiveChurch({ id, name: meta?.name ?? null, feed_token: meta?.feed_token ?? null })
              setSermon(s => ({ ...s, church_id: id }))
            }}
          />
          <button
            className="btn btn-outline"
            onClick={async () => {
              if (!activeChurch.id) return alert('Pick a church first')
              const { data: token, error } = await supabase.rpc('ensure_church_feed_token', { _church_id: activeChurch.id })
              if (error) return alert(error.message)
              const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
              const url = `${base}/api/ics?token=${token}`
              await navigator.clipboard.writeText(url)
              alert('ICS feed URL copied to clipboard!')
            }}
          >
            Copy ICS Feed
          </button>
          <AuthCard />
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Current Sermon</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Title</label>
            <input className="input w-full" value={sermon.title}
              onChange={e => setSermon(s => ({ ...s, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm">Theme</label>
            <input className="input w-full" value={sermon.theme}
              onChange={e => setSermon(s => ({ ...s, theme: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm">Date</label>
            <input type="date" className="input w-full"
              value={sermon.date ?? ''}
              onChange={e => setSermon(s => ({ ...s, date: e.target.value || null }))} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Start time</label>
            <input type="datetime-local" className="input w-full"
              onChange={e => setSermon(s => ({ ...s, start_time: e.target.value || null }))} />
          </div>
          <div>
            <label className="text-sm">End time</label>
            <input type="datetime-local" className="input w-full"
              onChange={e => setSermon(s => ({ ...s, end_time: e.target.value || null }))} />
          </div>
          <div>
            <label className="text-sm">Location</label>
            <input className="input w-full" placeholder="Sanctuary, Main Campus"
              onChange={e => setSermon(s => ({ ...s, location: e.target.value || '' }))} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm">Notes</label>
            <textarea className="textarea w-full h-32" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Passages</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="e.g., John 3:16"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val) setPassages(p => Array.from(new Set([...p, val])))
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }} />
              <button className="btn" onClick={() => setPassages([])}>Clear</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {passages.map((p) => (
                <span key={p} className="badge">{p}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Worship Setlist</h3>
          <div className="overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-2">Add</th>
                  <th className="p-2">Title</th>
                  <th className="p-2">Artist</th>
                  <th className="p-2">Key</th>
                  <th className="p-2">BPM</th>
                  <th className="p-2">Tempo</th>
                  <th className="p-2">CCLI</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((s: SongRow) => {
                  const checked = sermon.setlist.includes(s.id)
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleSong(s.id)} />
                      </td>
                      <td className="p-2">{s.title}</td>
                      <td className="p-2">{s.artist}</td>
                      <td className="p-2">{s.song_key || '-'}</td>
                      <td className="p-2">{s.bpm ?? '-'}</td>
                      <td className="p-2 uppercase">{s.tempo}</td>
                      <td className="p-2">{s.ccli_number || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button className="btn btn-primary" onClick={saveSermon}>Save Draft</button>
          {/* Fallback ICS (year range) */}
          <a
            className="btn btn-outline"
            href={`/api/ics?from=${new Date().getFullYear()}-01-01&to=${new Date().getFullYear()}-12-31`}
            target="_blank"
          >
            Export Year (ICS)
          </a>
        </div>

        {shareUrl && (
          <div className="text-sm text-emerald-600">
            Share URL: <a className="underline" href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Saved Sermons & Schedule</h2>
        <div className="grid gap-3">
          {sermons.map((s: SermonRow) => (
            <div key={s.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">{s.title}</div>
                <div className="text-sm text-gray-500">
                  {s.date || (s.start_time ? new Date(s.start_time).toISOString().slice(0,10) : '')}
                  {s.location ? ` • ${s.location}` : ''}
                </div>
                {Array.isArray(s.passages) && s.passages.length > 0 && (
                  <div className="text-xs text-gray-600">Passages: {s.passages.join(', ')}</div>
                )}
              </div>
              <div className="flex gap-2">
                {s.id && (
                  <a className="btn btn-outline" href={`/api/ics?sermonId=${s.id}`}>Export ICS</a>
                )}
                {s.id && (
                  <button className="btn" onClick={() => makeShareLink(s.id!)}>Get Share Link</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
