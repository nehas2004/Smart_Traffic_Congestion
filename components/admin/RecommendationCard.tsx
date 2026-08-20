'use client'
import { useState } from 'react'
import { CheckCircle, XCircle, Edit3, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react'

const AI_BACKEND = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000'

export type Confidence = 'low' | 'medium' | 'high'

export interface RecommendationOption {
  id: string
  strategy_type: 'signal_timing' | 'dynamic_reroute' | 'officer_dispatch'
  title: string
  action: string
  reason: string
  expected_impact: string
  side_effect_tradeoff: string
  confidence: Confidence
  is_recommended?: boolean
}

export interface RecommendationData {
  id: string
  action: string
  reason: string
  expected_effect: string
  confidence: Confidence
  corridor_name: string
  predicted_congestion: number
  severity: string
  generated_at: string
  options?: RecommendationOption[]
}

interface Props {
  data: RecommendationData | null
  unavailable?: boolean
  onDecisionRecorded?: (decision: string) => void
}

const CONFIDENCE_STYLES: Record<Confidence, { bg: string; text: string; label: string }> = {
  low:    { bg: '#fef9c3', text: '#854d0e', label: 'Low confidence' },
  medium: { bg: '#dbeafe', text: '#1e40af', label: 'Medium confidence' },
  high:   { bg: '#dcfce7', text: '#15803d', label: 'High confidence' },
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
}

export function RecommendationCard({ data, unavailable, onDecisionRecorded }: Props) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt-1')
  const [decision, setDecision] = useState<string | null>(null)
  const [showModify, setShowModify] = useState(false)
  const [modifyForm, setModifyForm] = useState({
    assigned_team: '',
    start_time: '',
    end_time: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  if (unavailable || !data) {
    return (
      <div style={{
        background: 'white', borderRadius: 20, border: '1px solid #e8e0d5',
        padding: 32, textAlign: 'center', color: '#9e9189',
      }}>
        <Info size={28} style={{ marginBottom: 12, opacity: 0.5, display: 'block', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, fontWeight: 600 }}>No recommendation available</p>
        <p style={{ fontSize: 12, marginTop: 6 }}>The AI pipeline could not produce a validated recommendation for current conditions.</p>
      </div>
    )
  }

  const hasOptions = data.options && data.options.length > 0
  const activeOption = hasOptions ? (data.options!.find(o => o.id === selectedOptionId) || data.options![0]) : null

  const displayAction = activeOption ? activeOption.action : data.action
  const displayReason = activeOption ? activeOption.reason : data.reason
  const displayEffect = activeOption ? `${activeOption.expected_impact} (Tradeoff: ${activeOption.side_effect_tradeoff})` : data.expected_effect
  const displayConfidence = activeOption ? activeOption.confidence : data.confidence

  const conf = CONFIDENCE_STYLES[displayConfidence] || CONFIDENCE_STYLES.medium
  const sevColor = SEVERITY_COLOR[data.severity] || '#9e9189'

  const postDecision = async (chosenDecision: string, extraFields = {}) => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${AI_BACKEND}/recommendations/${data.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: data.id,
          decision: chosenDecision,
          recommendation_text: displayAction,
          selected_strategy: activeOption ? activeOption.strategy_type : 'signal_timing',
          ...extraFields,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Failed')
      setDecision(chosenDecision)
      setSubmitted(true)
      onDecisionRecorded?.(chosenDecision)
    } catch (e: any) {
      setDecision(null)
      setError(e.message || 'Failed to record decision. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccept = () => postDecision('accepted')
  const handleReject = () => postDecision('rejected')
  const handleModifySubmit = () =>
    postDecision('modified', {
      assigned_team: modifyForm.assigned_team || undefined,
      start_time: modifyForm.start_time || undefined,
      end_time: modifyForm.end_time || undefined,
      notes: modifyForm.notes || undefined,
    })

  return (
    <div style={{
      background: 'white', borderRadius: 20,
      border: '1px solid #e8e0d5',
      boxShadow: '0 4px 24px rgba(44,40,37,0.07)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', background: '#faf8f5', borderBottom: '1px solid #e8e0d5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9e9189', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            AI Multi-Option Advisory · {data.corridor_name}
          </div>
          <div style={{ fontSize: 12, color: '#9e9189', marginTop: 2 }}>
            Generated {new Date(data.generated_at).toLocaleTimeString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ background: conf.bg, color: conf.text, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            {conf.label}
          </span>
          <span style={{ background: '#fee2e2', color: sevColor, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            {data.severity} · {data.predicted_congestion}% predicted
          </span>
        </div>
      </div>

      {/* Multi-Strategy Option Tabs */}
      {hasOptions && (
        <div style={{ padding: '12px 24px', background: '#f5f2ee', borderBottom: '1px solid #e8e0d5', display: 'flex', gap: 8 }}>
          {data.options!.map((opt, i) => {
            const isSelected = (selectedOptionId === opt.id) || (!selectedOptionId && i === 0)
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedOptionId(opt.id)}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 12, textAlign: 'left',
                  border: isSelected ? '2px solid #2c2825' : '1px solid #e8e0d5',
                  background: isSelected ? '#white' : '#faf8f5',
                  color: isSelected ? '#2c2825' : '#6b625b',
                  cursor: 'pointer', transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                {opt.is_recommended && (
                  <span style={{ position: 'absolute', top: -8, right: 10, background: '#2c2825', color: '#c8a97e', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase' }}>
                    AI Recommended
                  </span>
                )}
                <div style={{ fontSize: 10, fontWeight: 800, color: isSelected ? '#a67c52' : '#9e9189', textTransform: 'uppercase', marginBottom: 2 }}>
                  Option {i + 1} · {opt.strategy_type.replace('_', ' ')}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{opt.title}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#9e9189', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Action Plan</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#2c2825', lineHeight: 1.4 }}>{displayAction}</p>
        </div>

        {activeOption ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#faf8f5', padding: 14, borderRadius: 12, border: '1px solid #e8e0d5' }}>
            <div>
              <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                ✓ Expected Impact
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', margin: 0 }}>{activeOption.expected_impact}</p>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#b45309', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                ⚠ Side Effect Trade-off
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#b45309', margin: 0 }}>{activeOption.side_effect_tradeoff}</p>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: '#9e9189', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Expected Effect</div>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5, fontStyle: 'italic' }}>{displayEffect}</p>
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, color: '#9e9189', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Data Justification</div>
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{displayReason}</p>
        </div>
      </div>

      {/* Decision area */}
      {!submitted ? (
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0ebe4', background: '#faf8f5' }}>
          {error && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, fontSize: 12, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={12} /> {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleAccept}
              disabled={submitting}
              style={{ flex: 1, minWidth: 100, padding: '10px 16px', borderRadius: 10, background: '#dcfce7', color: '#15803d', border: 'none', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <CheckCircle size={14} /> Accept
            </button>

            <button
              onClick={() => setShowModify(v => !v)}
              disabled={submitting}
              style={{ flex: 1, minWidth: 100, padding: '10px 16px', borderRadius: 10, background: '#dbeafe', color: '#1e40af', border: 'none', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Edit3 size={14} /> Modify {showModify ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <button
              onClick={handleReject}
              disabled={submitting}
              style={{ flex: 1, minWidth: 100, padding: '10px 16px', borderRadius: 10, background: '#fee2e2', color: '#991b1b', border: 'none', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <XCircle size={14} /> Reject
            </button>
          </div>

          {/* Modify form */}
          {showModify && (
            <div style={{ marginTop: 16, padding: 16, background: 'white', borderRadius: 12, border: '1px solid #e8e0d5', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {(['assigned_team', 'notes'] as const).map(field => (
                  <div key={field}>
                    <label style={{ fontSize: 11, color: '#9e9189', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      {field === 'assigned_team' ? 'Assigned Team' : 'Notes'}
                    </label>
                    <input
                      value={modifyForm[field]}
                      onChange={e => setModifyForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, color: '#2c2825', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                {(['start_time', 'end_time'] as const).map(field => (
                  <div key={field}>
                    <label style={{ fontSize: 11, color: '#9e9189', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      {field === 'start_time' ? 'Start Time' : 'End Time'}
                    </label>
                    <input
                      type="datetime-local"
                      value={modifyForm[field]}
                      onChange={e => setModifyForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, color: '#2c2825', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleModifySubmit}
                disabled={submitting}
                style={{ padding: '10px 20px', borderRadius: 10, background: '#2c2825', color: '#c8a97e', border: 'none', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', fontSize: 13 }}
              >
                {submitting ? 'Submitting...' : 'Submit Modified Decision'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0ebe4', background: decision === 'accepted' ? '#f0fdf4' : decision === 'rejected' ? '#fef2f2' : '#eff6ff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={16} color={decision === 'accepted' ? '#15803d' : decision === 'rejected' ? '#991b1b' : '#1e40af'} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#2c2825' }}>
            Decision recorded: <strong style={{ textTransform: 'capitalize' }}>{decision}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
