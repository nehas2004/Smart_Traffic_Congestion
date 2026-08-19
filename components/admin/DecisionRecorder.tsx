'use client'
import { useState } from 'react'

const AI_BACKEND = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000'

interface DecisionPayload {
  recommendation_id: string
  decision: 'accepted' | 'modified' | 'rejected'
  recommendation_text: string
  assigned_team?: string
  start_time?: string
  end_time?: string
  notes?: string
}

interface UseDecisionRecorderReturn {
  submitting: boolean
  submitted: boolean
  error: string
  record: (payload: DecisionPayload) => Promise<boolean>
  reset: () => void
}

/**
 * Hook for recording decisions.
 * Returns a `record` function and state flags.
 * Use this inside RecommendationCard or mount standalone.
 */
export function useDecisionRecorder(): UseDecisionRecorderReturn {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const record = async (payload: DecisionPayload): Promise<boolean> => {
    setSubmitting(true)
    setError('')

    // Optimistic state — applied before network call
    setSubmitted(true)

    try {
      const res = await fetch(`${AI_BACKEND}/recommendations/${payload.recommendation_id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Server error')
      return true
    } catch (e: any) {
      // Rollback optimistic state
      setSubmitted(false)
      setError(e.message || 'Failed to record decision')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setSubmitting(false)
    setSubmitted(false)
    setError('')
  }

  return { submitting, submitted, error, record, reset }
}

/**
 * Standalone DecisionRecorder button group.
 * Mounts anywhere — no parent layout assumptions.
 */
export function DecisionRecorder({
  recommendationId,
  recommendationText,
  onRecorded,
}: {
  recommendationId: string
  recommendationText: string
  onRecorded?: (decision: string) => void
}) {
  const { submitting, submitted, error, record } = useDecisionRecorder()
  const [chosen, setChosen] = useState<string | null>(null)

  const handleDecision = async (decision: 'accepted' | 'modified' | 'rejected') => {
    setChosen(decision)
    const ok = await record({ recommendation_id: recommendationId, decision, recommendation_text: recommendationText })
    if (ok) onRecorded?.(decision)
    else setChosen(null)
  }

  if (submitted && chosen) {
    return (
      <div style={{ padding: '10px 16px', background: '#f0fdf4', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#15803d' }}>
        ✓ Decision recorded: {chosen}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {error && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['accepted', 'modified', 'rejected'] as const).map(d => (
          <button
            key={d}
            onClick={() => handleDecision(d)}
            disabled={submitting}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: d === 'accepted' ? '#dcfce7' : d === 'rejected' ? '#fee2e2' : '#dbeafe',
              color: d === 'accepted' ? '#15803d' : d === 'rejected' ? '#991b1b' : '#1e40af',
              fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', fontSize: 13,
              textTransform: 'capitalize',
            }}
          >
            {submitting && chosen === d ? 'Saving...' : d}
          </button>
        ))}
      </div>
    </div>
  )
}
