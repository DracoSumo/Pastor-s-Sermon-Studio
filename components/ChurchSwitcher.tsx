'use client'
import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from './supabaseClient'

type Church = { id: string; name: string; feed_token?: string | null }
type Props = {
  value?: string | null
  onChange?: (churchId: string | null, meta?: Church) => void
}

export default function ChurchSwitcher({ value = null, onChange }: Props) {
  const supabase = useMemo(() => getSupabase(), [])
  const [churches, setChurches] = useState<Church[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChurches([]); setLoading(false); return }

      const { data, error } = await supabase
        .from('memberships')
        .select('church_id, churches(name, feed_token)')
        .eq('user_id', user.id)

      if (!error && data) {
        const rows = data.map((r: any) => ({
          id: r.church_id as string,
          name: r.churches?.name ?? 'Unnamed Church',
          feed_token: r.churches?.feed_token ?? null,
        }))
        setChurches(rows)
        if (!value && rows[0]) onChange?.(rows[0].id, rows[0])
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Church:</span>
      <select
        className="input"
        value={value ?? ''}
        disabled={loading || churches.length === 0}
        onChange={(e) => {
          const id = e.target.value || null
          const meta = churches.find(c => c.id === id) || null
          onChange?.(id, meta || undefined)
        }}
        style={{ minWidth: 220 }}
      >
        {churches.length === 0 && <option value="">(none)</option>}
        {churches.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}
