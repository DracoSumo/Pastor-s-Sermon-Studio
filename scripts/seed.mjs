
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in environment.')
  process.exit(1)
}

const sb = createClient(url, key)

async function run() {
  const songsJson = new URL('../data/seed/songs.json', import.meta.url)
  const versesJson = new URL('../data/seed/verses.json', import.meta.url)

  const songs = JSON.parse(await readFile(songsJson, 'utf-8'))
  const verses = JSON.parse(await readFile(versesJson, 'utf-8'))

  const { error: songErr } = await sb.from('songs').upsert(songs)
  if (songErr) { console.error('Error inserting songs:', songErr.message); process.exit(1) }

  // normalized schema
  const verseRows = verses.map(v => ({ ref: v.ref, themes: v.themes }))
  const { error: vErr } = await sb.from('verses').upsert(verseRows)
  if (vErr) { console.error('Error inserting verses:', vErr.message); process.exit(1) }

  const texts = []
  for (const v of verses) {
    for (const [translation_id, text_body] of Object.entries(v.text)) {
      texts.push({ ref: v.ref, translation_id, text_body })
    }
  }
  const { error: tErr } = await sb.from('verse_texts').upsert(texts)
  if (tErr) { console.error('Error inserting verse texts:', tErr.message); process.exit(1) }

  console.log('Seed complete ✅')
}

run().catch(err => { console.error(err); process.exit(1) })
