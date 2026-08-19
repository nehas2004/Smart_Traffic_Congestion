'use client'

// ── Public-safe Traffic object — FROZEN SHAPE per SHARED_CONTRACT.md ──────────
export interface TrafficCorridor {
  corridor_id: number
  city?: string
  corridor_name: string
  timestamp: string
  current_congestion: number
  predicted_congestion: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
}

interface Props {
  corridors: TrafficCorridor[]
  /** compact = homepage widget; full = /forecast page */
  variant?: 'compact' | 'full'
}

const SEVERITY_BG: Record<string, string> = {
  critical: '#fee2e2',
  high:     '#fff7ed',
  medium:   '#fefce8',
  low:      '#f0fdf4',
}
const SEVERITY_TEXT: Record<string, string> = {
  critical: '#991b1b',
  high:     '#9a3412',
  medium:   '#854d0e',
  low:      '#15803d',
}
const SEVERITY_DOT: Record<string, string> = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#ca8a04',
  low:      '#16a34a',
}

/** Plain-language label for non-technical commuters */
function toPlainLanguage(c: TrafficCorridor): string {
  const delta = c.predicted_congestion - c.current_congestion
  const direction = delta >= 10 ? 'worsening significantly'
    : delta >= 3 ? 'getting worse'
    : delta <= -5 ? 'improving'
    : 'staying about the same'

  if (c.severity === 'critical') return `Heavy gridlock expected — ${direction} in the next 15 min`
  if (c.severity === 'high') return `Heavy traffic — ${direction}`
  if (c.severity === 'medium') return `Moderate delays — ${direction}`
  return `Traffic is flowing well — ${direction}`
}

/** Format timestamp to readable local time */
function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

export function ForecastSummary({ corridors, variant = 'compact' }: Props) {
  // Sort by current_congestion descending — worst first
  const sorted = [...corridors].sort((a, b) => b.current_congestion - a.current_congestion)
  const displayed = variant === 'compact' ? sorted.slice(0, 3) : sorted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {displayed.map((c) => {
        const sev = c.severity || 'low'
        return (
          <div key={c.corridor_id} style={{
            background: SEVERITY_BG[sev] || '#f9fafb',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: SEVERITY_DOT[sev] || '#6b7280',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2825' }}>{c.corridor_name}</span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 8px',
                borderRadius: 20, background: 'rgba(0,0,0,0.06)',
                color: SEVERITY_TEXT[sev],
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {sev}
              </span>
            </div>

            <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.4 }}>
              {toPlainLanguage(c)}
            </div>

            {variant === 'full' && (
              <div style={{ display: 'flex', gap: 16, marginTop: 2 }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Now: <strong style={{ color: SEVERITY_TEXT[sev] }}>{c.current_congestion}%</strong>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  15-min forecast: <strong>{c.predicted_congestion}%</strong>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Confidence: <strong>{Math.round(c.confidence * 100)}%</strong>
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              As of {formatTime(c.timestamp)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
