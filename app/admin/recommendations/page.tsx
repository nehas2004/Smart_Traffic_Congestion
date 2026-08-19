'use client'
import { useEffect, useState, useCallback } from 'react'
import { Nav } from '@/components/shared/nav'
import { RecommendationCard, RecommendationData } from '@/components/admin/RecommendationCard'
import { RefreshCw } from 'lucide-react'

const AI_BACKEND = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000'
const POLL_INTERVAL_MS = 60_000 // refresh every 60 seconds

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationData | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [backendError, setBackendError] = useState('')

  const fetchRecommendation = useCallback(async () => {
    setLoading(true)
    setBackendError('')
    try {
      const res = await fetch(`${AI_BACKEND}/recommendations`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data as RecommendationData)
        setUnavailable(false)
      } else {
        setData(null)
        setUnavailable(true)
      }
      setLastRefresh(new Date())
    } catch (e) {
      setBackendError('Could not reach AI backend. Make sure it is running on port 8000.')
      setUnavailable(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + poll
  useEffect(() => {
    fetchRecommendation()
    const timer = setInterval(fetchRecommendation, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [fetchRecommendation])

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
      <Nav />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, color: '#9e9189', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>City Planner · AI Advisory</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#2c2825', letterSpacing: '-0.5px', margin: 0 }}>
              Traffic Recommendations
            </h1>
            <p style={{ color: '#9e9189', fontSize: 13, marginTop: 8 }}>
              AI-generated advisory — review and record your decision below.
              {lastRefresh && ` Last updated: ${lastRefresh.toLocaleTimeString()}`}
            </p>
          </div>
          <button
            onClick={fetchRecommendation}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#2c2825', color: '#c8a97e', border: 'none', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontSize: 13 }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Fetching...' : 'Refresh'}
          </button>
        </div>

        {/* Backend unreachable banner */}
        {backendError && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fee2e2', borderRadius: 12, fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
            ⚠ {backendError}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ marginBottom: 24, padding: '10px 16px', background: '#fef9c3', borderRadius: 10, fontSize: 12, color: '#854d0e', fontWeight: 600 }}>
          ℹ The AI advisory never acts automatically. Your explicit decision below is what gets recorded.
        </div>

        {/* Recommendation */}
        {loading && !data ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9e9189', fontSize: 14 }}>Generating recommendation...</div>
        ) : (
          <RecommendationCard
            data={data}
            unavailable={unavailable}
            onDecisionRecorded={(decision) => {
              // After a decision, wait 2s then auto-refresh for next recommendation
              setTimeout(fetchRecommendation, 2000)
            }}
          />
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
