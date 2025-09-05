import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Sermon } from '@/lib/types'

/**
 * Format a JS Date or ISO string to ICS date format
 */
function toICSDate(date: string | Date): string {
  const dt = typeof date === 'string' ? new Date(date) : date
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const sermonId = searchParams.get('sermonId') // export single sermon
  const rangeFrom = searchParams.get('from')    // YYYY-MM-DD
  const rangeTo = searchParams.get('to')        // YYYY-MM-DD

  // Load environment vars
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 })
  }

  const sb = createClient(url, anon)

  // Fetch sermons
  let sermons: Sermon[] = []
  if (sermonId) {
    const { data, error } = await sb.from('sermons').select('*').eq('id', sermonId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sermons = data ?? []
  } else {
    let q = sb.from('sermons').select('*').order('date', { ascending: true })
    if (rangeFrom) q = q.gte('date', rangeFrom)
    if (rangeTo) q = q.lte('date', rangeTo)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sermons = data ?? []
  }

  // Build ICS file content
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pastor Sermon Studio//EN',
    'CALSCALE:GREGORIAN',
  ]

  sermons.forEach((s) => {
    if (!s.date) return
    const dtStart = toICSDate(s.date)

    const title = (s.title || 'Sermon').replace(/\r?\n/g, ' ')
    const desc = [
      s.theme ? `Theme: ${s.theme}` : '',
      Array.isArray(s.passages) && s.passages.length ? `Passages: ${s.passages.join(', ')}` : '',
      s.notes ? `Notes: ${s.notes}` : '',
    ]
      .filter(Boolean)
      .join('\\n')

    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id}@sermon-studio`,
      `DTSTAMP:${toICSDate(new Date())}T000000Z`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`.slice(0, 75000), // ICS spec safety
      'END:VEVENT'
    )
  })

  lines.push('END:VCALENDAR')

  const icsBody = lines.join('\r\n')

  return new NextResponse(icsBody, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sermons.ics"',
    },
  })
}
