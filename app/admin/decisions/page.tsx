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
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-6 py-12 pb-20">
        <div className="mb-8">
          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">City Planner · History</div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Decision History</h1>
          <p className="text-slate-500 text-xs mt-2">{total} total decisions recorded</p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 mb-5">
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading history...</div>
        ) : decisions.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400">
            <Clock className="size-8 opacity-30 mx-auto mb-3 text-slate-400" />
            <p>
              No decisions recorded yet. Go to{' '}
              <a href="/admin/recommendations" className="text-emerald-700 font-bold hover:underline">
                AI Recommendations
              </a>{' '}
              to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {decisions.map((d) => {
              const style = DECISION_STYLE[d.decision] || DECISION_STYLE.accepted
              const Icon = style.icon
              return (
                <div
                  key={d.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 sm:px-6 flex gap-4 sm:gap-5 items-start shadow-xs transition hover:shadow-md"
                >
                  <div
                    className="flex-shrink-0 size-10 rounded-xl flex items-center justify-center"
                    style={{ background: style.bg }}
                  >
                    <Icon size={18} color={style.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider capitalize"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {d.decision}
                      </span>
                      {d.assigned_team && <span className="text-xs text-slate-400">→ {d.assigned_team}</span>}
                    </div>
                    <p className="text-sm text-slate-900 font-bold mb-1 leading-snug">{d.recommendation}</p>
                    {d.notes && <p className="text-xs text-slate-500 mt-1">Notes: {d.notes}</p>}
                    {d.outcome && <p className="text-xs text-slate-500 mt-1">Outcome: {d.outcome}</p>}
                  </div>
                  <div className="flex-shrink-0 text-right text-[11px] text-slate-400 font-mono">
                    {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
                    {d.start_time && (
                      <div className="mt-1">
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
