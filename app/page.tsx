
'use client'
import React, { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { Sermon, Series, Song, Verse } from '@/lib/types'

const TRANSLATIONS = [
  { id: 'KJV', name: 'King James Version (KJV)' },
  { id: 'ESV', name: 'English Standard Version (ESV)' },
  { id: 'NIV', name: 'New International Version (NIV)' },
  { id: 'NKJV', name: 'New King James Version (NKJV)' },
  { id: 'CSB', name: 'Christian Standard Bible (CSB)' },
]
const THEMES = ['faith','love','grace','hope','holiness','discipleship','mission','transformation','trust','praise']

const FALLBACK_SONGS: Song[] = [
  { id: 1, title: 'How Great Is Our God', artist: 'Chris Tomlin', themes: ['greatness','praise'], tempo: 'mid' },
  { id: 2, title: 'Oceans (Where Feet May Fail)', artist: 'Hillsong UNITED', themes: ['faith','trust'], tempo: 'slow' },
  { id: 3, title: 'Reckless Love', artist: 'Cory Asbury', themes: ['love','grace'], tempo: 'mid' },
  { id: 4, title: 'Build My Life', artist: 'Pat Barrett', themes: ['holiness','surrender'], tempo: 'mid' },
  { id: 5, title: 'Graves Into Gardens', artist: 'Elevation Worship', themes: ['transformation','victory'], tempo: 'up' },
  { id: 6, title: 'The Blessing', artist: 'Kari Jobe & Elevation', themes: ['blessing','benediction'], tempo: 'slow' },
]
const FALLBACK_VERSES: Verse[] = [
  { ref: 'John 3:16', text: { KJV:'For God so loved the world...', ESV:'For God so loved the world...', NIV:'For God so loved the world...', NKJV:'For God so loved the world...', CSB:'For God loved the world...' }, themes: ['salvation','love','gospel'] },
  { ref: 'Psalm 23:1', text: { KJV:'The LORD is my shepherd; I shall not want.', ESV:'The Lord is my shepherd; I shall not want.', NIV:'The Lord is my shepherd, I lack nothing.', NKJV:'The Lord is my shepherd; I shall not want.', CSB:'The Lord is my shepherd; I have what I need.' }, themes: ['trust','guidance','shepherd'] },
  { ref: 'Matthew 28:19-20', text: { KJV:'Go ye therefore...', ESV:'Go therefore...', NIV:'Therefore go...', NKJV:'Go therefore...', CSB:'Go, therefore...' }, themes: ['mission','discipleship','great commission'] },
  { ref: 'Romans 12:2', text: { KJV:'Be not conformed...', ESV:'Do not be conformed...', NIV:'Do not conform...', NKJV:'Do not be conformed...', CSB:'Do not be conformed...' }, themes: ['transformation','holiness','mind'] },
]

function suggestIdeas(theme: string, verses: Verse[]) {
  const verseThemes = new Set(verses.flatMap(r=>r.themes))
  const allThemes = new Set([theme, ...verseThemes])
  const bullets = [
    `Tension: Where are we conforming (Rom 12:2) instead of transforming?`,
    `Gospel: God's love initiates (John 3:16) — we respond in faith.`,
    `Practice: Three habits to renew the mind this week.`,
    `Mission: Everyday discipleship rhythms (Matt 28:19–20).`,
    `Comfort: The Shepherd's care in uncertainty (Ps 23).`,
  ]
  const lens = Array.from(allThemes).slice(0,3).join(', ')
  return [
    `Big Idea: A ${theme || 'Christ-centered'} life shaped by Scripture and Spirit.`,
    `Text Lens: ${lens}.`,
    ...bullets
  ]
}

function randomColor() {
  const palette = ['#22c55e','#06b6d4','#a855f7','#f97316','#ef4444','#eab308','#3b82f6','#D946EF']
  return palette[Math.floor(Math.random()*palette.length)]
}

export default function Page() {
  const supabase = getSupabaseClient()
  const [translation, setTranslation] = useState('KJV')
  const [search, setSearch] = useState('')
  const [theme, setTheme] = useState('')
  const [tempo, setTempo] = useState('')
  const [songs, setSongs] = useState<Song[]>(FALLBACK_SONGS)
  const [verses, setVerses] = useState<Verse[]>(FALLBACK_VERSES)
  const [series, setSeries] = useState<Series[]>([{ id: 'fall-2025-renew', name: 'Renewed: A Romans 12 Series', color: '#D946EF' }])
  const [library, setLibrary] = useState<Sermon[]>([])
  const [sermon, setSermon] = useState<Sermon>({ title:'', theme:'faith', date:'', passages:[], notes:'', setlist:[], isSeriesItem:false, seriesId:'' })

  useEffect(()=>{(async()=>{
    if (supabase) {
      const { data: songRows } = await supabase.from('songs').select('*').order('id')
      if (songRows) setSongs(songRows as any)
      // Try normalized verses
      const { data: verseTexts } = await supabase.from('verse_texts').select('*')
      const { data: versesRows } = await supabase.from('verses').select('*')
      if (verseTexts && versesRows) {
        const byRef: Record<string, Record<string,string>> = {}
        for (const vt of verseTexts as any[]) {
          if (!byRef[vt.ref]) byRef[vt.ref] = {}
          byRef[vt.ref][vt.translation_id] = vt.text_body
        }
        const merged = (versesRows as any[]).map(v => ({ ref: v.ref, themes: v.themes, text: byRef[v.ref] || {} }))
        if (merged.length) setVerses(merged as any)
      } else {
        // fallback older schema
        const { data: versesOld } = await supabase.from('verses').select('*')
        if (versesOld) setVerses((versesOld as any).map(v=>({ref:v.ref, text:v.text_by_translation, themes:v.themes})))
      }
      const { data: seriesRows } = await supabase.from('series').select('*').order('created_at',{ascending:false})
      if (seriesRows) setSeries(seriesRows as any)
      const { data: sermonRows } = await supabase.from('sermons').select('*').order('created_at',{ascending:false})
      if (sermonRows) setLibrary(sermonRows as any)
    } else {
      const raw = localStorage.getItem('sermon-studio-lib')
      if (raw) setLibrary(JSON.parse(raw))
      const rawS = localStorage.getItem('sermon-studio-series')
      if (rawS) setSeries(JSON.parse(rawS))
    }
  })()},[])

  useEffect(()=>{ if (!supabase) localStorage.setItem('sermon-studio-lib', JSON.stringify(library)) },[library, supabase])
  useEffect(()=>{ if (!supabase) localStorage.setItem('sermon-studio-series', JSON.stringify(series)) },[series, supabase])

  const selectedPassages = useMemo(()=> sermon.passages.map(ref=>verses.find(v=>v.ref===ref)).filter(Boolean) as Verse[], [sermon.passages, verses])
  const ideas = useMemo(()=> suggestIdeas(sermon.theme, selectedPassages), [sermon.theme, selectedPassages])
  const scriptureResults = useMemo(()=>{
    const q = search.trim().toLowerCase()
    if (!q) return verses
    return verses.filter(v => v.ref.toLowerCase().includes(q) || v.themes.some(t=>t.includes(q)))
  },[search, verses])
  const songResults = useMemo(()=> songs.filter(s=> (theme? s.themes.includes(theme):true) && (tempo? s.tempo===tempo:true)), [songs, theme, tempo])

  function addPassage(ref: string) { setSermon(s=> ({...s, passages: Array.from(new Set([...s.passages, ref]))})) }
  function removePassage(ref: string) { setSermon(s=> ({...s, passages: s.passages.filter(r=>r!==ref)})) }
  function addSong(id: number) { setSermon(s=> ({...s, setlist: Array.from(new Set([...s.setlist, id]))})) }
  function removeSong(id: number) { setSermon(s=> ({...s, setlist: s.setlist.filter(x=>x!==id)})) }

  async function saveSermon() {
    const record: Sermon = { ...sermon, id: sermon.id || crypto.randomUUID() }
    if (supabase) {
      const payload = {
        title: record.title || 'Untitled Sermon',
        theme: record.theme,
        date: record.date || null,
        passages: record.passages,
        notes: record.notes,
        setlist: record.setlist,
        is_series_item: record.isSeriesItem,
        series_id: record.seriesId || null,
      }
      const { data, error } = await supabase.from('sermons').insert(payload).select('*').single()
      if (!error && data) {
        setLibrary(l => [{...data, id: data.id}, ...l])
        setSermon({ title:'', theme:'faith', date:'', passages:[], notes:'', setlist:[], isSeriesItem:false, seriesId:'' })
        alert('Saved to Supabase')
        return
      }
      alert('Save error (Supabase): ' + (error?.message || 'unknown'))
    } else {
      setLibrary(l => [record, ...l])
      setSermon({ title:'', theme:'faith', date:'', passages:[], notes:'', setlist:[], isSeriesItem:false, seriesId:'' })
      alert('Saved locally')
    }
  }

  async function createSeries(name: string) {
    const rec: Series = { id: crypto.randomUUID(), name, color: randomColor() }
    if (supabase) {
      const { data, error } = await supabase.from('series').insert({ name: rec.name, color: rec.color }).select('*').single()
      if (!error && data) { setSeries(arr => [data as any, ...arr]); return }
      alert('Series create error: ' + (error?.message || 'unknown'))
    } else {
      setSeries(arr => [rec, ...arr])
    }
  }

  return (
    <div className='p-6 max-w-7xl mx-auto space-y-6'>
      <header className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Pastor&apos;s Sermon Studio</h1>
          <p className='text-sm text-gray-500'>Draft sermons, plan series, curate worship, and stay on schedule.</p>
        </div>
        <div className='flex gap-3'>
          <Button onClick={saveSermon}>Save Draft</Button>
          <Button className='btn-outline'>Add to Schedule</Button>
        </div>
      </header>

      <Card><CardHeader><CardTitle>Current Sermon</CardTitle></CardHeader><CardContent className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='md:col-span-2'><label className='text-sm font-medium'>Title</label>
            <Input placeholder='e.g., Renewed Minds' value={sermon.title} onChange={e=>setSermon({...sermon, title: e.target.value})} /></div>
          <div><label className='text-sm font-medium'>Theme</label>
            <select className='select' value={sermon.theme} onChange={(e)=>setSermon({...sermon, theme: e.target.value})}>
              {THEMES.map(t=> <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label className='text-sm font-medium'>Date</label>
            <Input type='date' value={sermon.date} onChange={e=>setSermon({...sermon, date: e.target.value})} /></div>
        </div>

        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <Switch id='series' checked={sermon.isSeriesItem} onCheckedChange={(v)=>setSermon({...sermon, isSeriesItem: v})} />
            <label htmlFor='series' className='text-sm'>Part of a series</label>
          </div>
          {sermon.isSeriesItem && (
            <select className='select w-64' value={sermon.seriesId} onChange={(e)=>setSermon({...sermon, seriesId: e.target.value})}>
              <option value=''>Select series</option>
              {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <Button className='btn-outline' onClick={()=>{ const name = window.prompt('Series name?'); if (name) createSeries(name) }}>New Series</Button>
        </div>

        <div>
          <label className='text-sm font-medium'>Notes</label>
          <Textarea rows={5} placeholder='Outline, application points, prayer, calls-to-action...' value={sermon.notes} onChange={e=>setSermon({...sermon, notes: e.target.value})} />
        </div>

        <div className='flex flex-wrap gap-2'>
          {sermon.passages.map(ref => (
            <Badge key={ref}><span>{ref}</span><button className='ml-2 text-gray-500' onClick={()=>removePassage(ref)}>×</button></Badge>
          ))}
        </div>
      </CardContent></Card>

      {/* Scripture */}
      <Card><CardHeader><CardTitle>Browse Scripture</CardTitle></CardHeader><CardContent className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='md:col-span-2 flex gap-2'>
            <Input placeholder="Search by reference or theme (e.g., 'John 3:16' or 'trust')" value={search} onChange={e=>setSearch(e.target.value)} />
            <Button className='btn-outline'>Search</Button>
          </div>
          <div>
            <select className='select' value={translation} onChange={(e)=>setTranslation(e.target.value)}>
              {TRANSLATIONS.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {scriptureResults.map(v => (
            <Card key={v.ref}>
              <CardHeader className='pb-2 flex flex-row items-center justify-between'>
                <CardTitle className='text-base'>{v.ref}</CardTitle>
                <div className='flex gap-1'>{v.themes.map(t => <span key={t} className='badge'>{t}</span>)}</div>
              </CardHeader>
              <CardContent className='space-y-2'>
                <p className='text-sm leading-relaxed'>{v.text[translation]}</p>
                <div className='flex gap-2'><Button onClick={()=>addPassage(v.ref)}>Add to Sermon</Button></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className='text-xs text-gray-500'>Licensing note: Some translations require publisher licenses for on-screen or printed use.</p>
      </CardContent></Card>

      {/* Ideas */}
      <Card><CardHeader><CardTitle>Idea Gatherer</CardTitle></CardHeader><CardContent className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div><label className='text-sm font-medium'>Sermon Theme</label>
            <select className='select' value={sermon.theme} onChange={e=>setSermon({...sermon, theme: e.target.value})}>{THEMES.map(t=> <option key={t} value={t}>{t}</option>)}</select></div>
          <div className='md:col-span-2'><label className='text-sm font-medium'>From Passages</label>
            <div className='flex flex-wrap gap-2'>{selectedPassages.length===0 ? <p className='text-sm text-gray-500'>Add passages in the Scripture section to seed ideas.</p> : null}{selectedPassages.map(p => <span key={p.ref} className='badge'>{p.ref}</span>)}</div></div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <Card><CardHeader className='pb-2'><CardTitle className='text-base'>Auto-Suggestions</CardTitle></CardHeader>
            <CardContent><ul className='list-disc ml-5 space-y-2 text-sm'>{ideas.map((i, idx)=> <li key={idx}>{i}</li>)}</ul></CardContent></Card>
          <div><label className='text-sm font-medium'>Your Additions</label><Textarea rows={10} placeholder='Add hooks, illustrations, testimonies, commentaries, and applications...' value={sermon.notes} onChange={e=>setSermon({...sermon, notes: e.target.value})} /></div>
        </div>
      </CardContent></Card>

      {/* Worship */}
      <Card><CardHeader><CardTitle>Praise & Worship Setlist</CardTitle></CardHeader><CardContent className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div><label className='text-sm font-medium'>Filter by Theme</label>
            <select className='select' value={theme} onChange={e=>setTheme(e.target.value)}><option value=''>Any</option>{THEMES.map(t=> <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className='text-sm font-medium'>Tempo</label>
            <select className='select' value={tempo} onChange={e=>setTempo(e.target.value)}><option value=''>Any</option><option value='slow'>Slow</option><option value='mid'>Mid</option><option value='up'>Upbeat</option></select></div>
          <div className='md:col-span-2 flex items-end'><Button className='btn-outline' onClick={()=> setTheme(sermon.theme)}>Match Current Sermon Theme</Button></div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <Card><CardHeader className='pb-2'><CardTitle className='text-base'>Song Suggestions</CardTitle></CardHeader>
            <CardContent className='space-y-2'>
              {songResults.map(s => (
                <div key={s.id} className='flex items-center justify-between p-2 rounded-xl border'>
                  <div><div className='font-medium'>{s.title}</div><div className='text-xs text-gray-500'>{s.artist} • {s.tempo} • {s.themes.join(', ')}</div></div>
                  <Button onClick={()=>addSong(s.id)}>Add</Button>
                </div>
              ))}
              {songResults.length===0 && <p className='text-sm text-gray-500'>No matches. Try a different filter.</p>}
            </CardContent></Card>
          <Card><CardHeader className='pb-2'><CardTitle className='text-base'>Current Setlist</CardTitle></CardHeader>
            <CardContent className='space-y-2'>
              {sermon.setlist.map(id => { const s = songs.find(x=>x.id===id); if (!s) return null; return (
                <div key={id} className='flex items-center justify-between p-2 rounded-xl border'>
                  <div><div className='font-medium'>{s.title}</div><div className='text-xs text-gray-500'>{s.artist}</div></div>
                  <Button className='btn-outline' onClick={()=>removeSong(id)}>Remove</Button>
                </div>
              )})}
              {sermon.setlist.length===0 && <p className='text-sm text-gray-500'>No songs yet. Add from suggestions.</p>}
            </CardContent></Card>
        </div>
      </CardContent></Card>

      {/* Series */}
      <Card><CardHeader><CardTitle>Series Planner</CardTitle></CardHeader><CardContent className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='md:col-span-2'><label className='text-sm font-medium'>Attach to Series</label>
            <div className='flex gap-2 items-center'>
              <select className='select w-64' value={sermon.seriesId} onChange={(e)=>setSermon({...sermon, seriesId: e.target.value, isSeriesItem: true})}>
                <option value=''>Select series</option>
                {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Button className='btn-outline' onClick={()=>{ const name = window.prompt('Series name?'); if (name) createSeries(name) }}>New Series</Button>
            </div>
          </div>
          <div className='flex items-end'><div className='flex items-center gap-2'><Switch id='series2' checked={sermon.isSeriesItem} onCheckedChange={(v)=>setSermon({...sermon, isSeriesItem: v})} /><label htmlFor='series2' className='text-sm'>Make current sermon part of selected series</label></div></div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {series.map(s => (
            <Card key={s.id} className='border' style={{ borderColor: s.color }}>
              <CardHeader className='pb-2 flex flex-row justify-between items-center'><CardTitle className='text-base'>{s.name}</CardTitle><div className='w-3 h-3 rounded-full' style={{ background: s.color }} /></CardHeader>
              <CardContent><p className='text-sm text-gray-500'>Attach saved sermons to this series from the library section.</p></CardContent>
            </Card>
          ))}
        </div>
      </CardContent></Card>

      {/* Library */}
      <Card><CardHeader><CardTitle>Saved Sermons & Schedule</CardTitle></CardHeader><CardContent className='space-y-3'>
        {library.length===0 && <p className='text-sm text-gray-500'>No saved sermons yet. Draft one and click Save.</p>}
        {library.map(s => (
          <div key={(s as any).id} className='p-3 rounded-xl border flex items-start justify-between'>
            <div>
              <div className='font-medium'>{(s as any).title || 'Untitled Sermon'}</div>
              <div className='text-xs text-gray-500'>
                {(s as any).date ? new Date((s as any).date).toDateString() : 'No date'} • Theme: {(s as any).theme}
                {(s as any).is_series_item && (s as any).series_id ? ` • Series: ${(s as any).series_id}` : ''}
              </div>
              <div className='mt-1 flex flex-wrap gap-1'>{(s as any).passages?.map((r:string)=> <span key={r} className='badge'>{r}</span>)}</div>
            </div>
            <div className='flex gap-2'>
              <Button className='btn-outline' onClick={()=>{
                const loaded: Sermon = { id:(s as any).id, title:(s as any).title, theme:(s as any).theme, date:(s as any).date || '', passages:(s as any).passages || [], notes:(s as any).notes || '', setlist:(s as any).setlist || [], isSeriesItem:(s as any).is_series_item || false, seriesId:(s as any).series_id || '' }
                setSermon(loaded)
              }}>Edit</Button>
              {!supabase && <Button className='bg-red-600 text-white hover:bg-red-500' onClick={()=>{ setLibrary(arr => arr.filter(x=> (x as any).id !== (s as any).id)) }}>Delete</Button>}
            </div>
          </div>
        ))}
      </CardContent></Card>

    </div>
  )
}
