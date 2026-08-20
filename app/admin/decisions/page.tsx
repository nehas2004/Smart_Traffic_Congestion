'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Edit3, Clock } from 'lucide-react'

const AI_BACKEND = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000'

interface Decision {
  id: number
  recommendation: string
  decision: 'accepted' | 'modified' | 'rejected'
  assigned_team: string | null
  start_time: string | null
  end_time: string | null
  notes: string | null
  outcome: string | null
  created_at: string | null
}

const DECISION_STYLE: Record<string, { bg: string; color: string; icon: any }> = {
  accepted: { bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  rejected: { bg: '#fee2e2', color: '#991b1b', icon: XCircle },
  modified: { bg: '#dbeafe', color: '#1e40af', icon: Edit3 },
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`${AI_BACKEND}/admin/decisions?limit=50`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setDecisions(json.data.decisions || [])
          setTotal(json.data.total || 0)
        } else {
          setError('Failed to load decision history.')
        }
      })
      .catch(() => setError('Could not reach AI backend. Make sure it is running on port 8000.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: '#9e9189', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>City Planner · History</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#2c2825', letterSpacing: '-0.5px', margin: 0 }}>Decision History</h1>
          <p style={{ color: '#9e9189', fontSize: 13, marginTop: 8 }}>{total} total decisions recorded</p>
        </div>

        {error && <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: 12, fontSize: 13, color: '#991b1b', marginBottom: 20 }}>⚠ {error}</div>}

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9e9189' }}>Loading history...</div>
        ) : decisions.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9e9189' }}>
            <Clock size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
            <p>No decisions recorded yet. Go to <a href="/admin/recommendations" style={{ color: '#c8a97e', fontWeight: 700 }}>AI Recommendations</a> to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {decisions.map(d => {
              const style = DECISION_STYLE[d.decision] || DECISION_STYLE.accepted
              const Icon = style.icon
              return (
                <div key={d.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e8e0d5', padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={style.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ background: style.bg, color: style.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{d.decision}</span>
                      {d.assigned_team && <span style={{ fontSize: 12, color: '#9e9189' }}>→ {d.assigned_team}</span>}
                    </div>
                    <p style={{ fontSize: 14, color: '#2c2825', fontWeight: 600, margin: '0 0 4px', lineHeight: 1.4 }}>{d.recommendation}</p>
                    {d.notes && <p style={{ fontSize: 12, color: '#9e9189', margin: 0 }}>Notes: {d.notes}</p>}
                    {d.outcome && <p style={{ fontSize: 12, color: '#9e9189', margin: '4px 0 0' }}>Outcome: {d.outcome}</p>}
                  </div>
                  <div style={{ flexShrink: 0, fontSize: 11, color: '#9e9189', textAlign: 'right' }}>
                    {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
                    {d.start_time && (
                      <div style={{ marginTop: 4 }}>
                        {new Date(d.start_time).toLocaleTimeString()} – {d.end_time ? new Date(d.end_time).toLocaleTimeString() : '?'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
