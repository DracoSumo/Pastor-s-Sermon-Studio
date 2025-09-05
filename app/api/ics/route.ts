// app/api/ics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type SermonRow = {
  id: string
  title: string | null
  theme: string | null
  date: string | null            // YYYY-MM-DD
  start_time: string | null      // ISO string
  end_time: string | null        // ISO string
  location: string | null
  passages: string[] | null
  notes: string | null
  church_id: string | null
}

// Format a Date to ICS UTC date-time: YYYYMMDDTHHMMSSZ
function fmtDateTimeUTC(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${y}${m}${day}T${hh}${mm}${ss}Z`
}

// Escape newlines per RFC5545
function foldText(text: string): string {
  return text.replace(/\r?\n/g, '\\n')
}

function buildICS(sermons: SermonRow[]): string {
  const now = fmtDateTimeUTC(new Date())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pastor Sermon Studio//EN',
    'CALSCALE:GREGORIAN',
  ]

  for (const s of sermons) {
    const uid = `${s.id}@sermon-studio`
    const title = foldText(String(s.title ?? 'Sermon'))
    const desc = foldText(
      [
        s.theme ? `Theme: ${s.theme}` : '',
        Array.isArray(s.passages) && s.passages.length ? `Passages: ${s.passages.join(', ')}` : '',
        s.notes ? `Notes: ${s.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${now}`)

    if (s.start_time) {
      // Date-time event
      const start = fmtDateTimeUTC(new Date(s.start_time))
      lines.push(`DTSTART:${start}`)
      if (s.end_time) {
        const end = fmtDateTimeUTC(new Date(s.end_time))
        lines.push(`DTEND:${end}`)
      }
    } else if (s.date) {
      // All-day event
      const d = new Date(`${s.date}T00:00:00Z`)
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      lines.push(`DTSTART;VALUE=DATE:${y}${m}${day}`)
    }

    lines.push(`SUMMARY:${title}`)
    if (s.location) lines.push(`LOCATION:${foldText(s.location)}`)
    if (desc) lines.push(`DESCRIPTION:${desc}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sermonId = searchParams.get('sermonId')
  const from = searchParams.get('from') // YYYY-MM-DD
  const to = searchParams.get('to')     // YYYY-MM-DD
  const token = searchParams.get('token') // church feed token (optional)

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || // prefer server-only key
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json(
      {
        error: 'Missing Supabase environment variables',
        have: {
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          SUPABASE_URL: !!process.env.SUPABASE_URL,
          SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
      { status: 500 }
    )
  }

  const sb = createClient(url, key)

  // Build query
  let sermons: SermonRow[] = []
  if (sermonId) {
    const { data, error } = await sb
      .from('sermons')
      .select('*')
      .eq('id', sermonId)
      .limit(1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sermons = (data as SermonRow[]) || []
  } else {
    let q = sb.from('sermons').select('*').order('date', { ascending: true })
    if (from) q = q.gte('date', from)
    if (to) q = q.lte('date', to)

    // If a church feed token is provided, scope by church
    if (token) {
      const { data: ch, error: chErr } = await sb
        .from('churches')
        .select('id')
        .eq('feed_token', token)
        .single()
      if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 })
      if (ch?.id) q = q.eq('church_id', ch.id)
    }

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sermons = (data as SermonRow[]) || []
  }

  const ics = buildICS(sermons)
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sermons.ics"',
    },
  })
}
