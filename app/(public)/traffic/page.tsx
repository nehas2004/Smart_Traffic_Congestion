'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Navigation, Zap, Radio } from 'lucide-react'
import dynamic from 'next/dynamic'
import { ForecastSummary, TrafficCorridor } from '@/components/public/ForecastSummary'

const LiveTrafficMap = dynamic(
  () => import('@/components/public/LiveTrafficMap').then((m) => m.LiveTrafficMap),
  { ssr: false, loading: () => <div style={{ height: 440, background: '#f5f2ee', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9e9189', fontSize: 14 }}>Loading map…</div> }
)

// ONE-LINE SWAP: replace with '/traffic/current' when Shadeed's API is ready
const TRAFFIC_CURRENT_URL = '/data/mock_traffic_current.json'

const SEVERITY_BG: Record<string, string> = {
  critical: '#fee2e2', high: '#fff7ed', medium: '#fefce8', low: '#f0fdf4',
}
const SEVERITY_TEXT: Record<string, string> = {
  critical: '#991b1b', high: '#9a3412', medium: '#854d0e', low: '#15803d',
}

export default function LiveTrafficPage() {
  const [corridors, setCorridors] = useState<TrafficCorridor[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const raw = await fetch(TRAFFIC_CURRENT_URL).then(r => r.json())
      // Accept only public-safe fields
      const safe: TrafficCorridor[] = (Array.isArray(raw) ? raw : []).map((c: any) => ({
        corridor_id:          c.corridor_id,
        corridor_name:        c.corridor_name,
        timestamp:            c.timestamp,
        current_congestion:   c.current_congestion,
        predicted_congestion: c.predicted_congestion,
        severity:             c.severity,
        confidence:           c.confidence,
      }))
      setCorridors(safe)
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      // fail silently, keep empty state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const criticalCount = corridors.filter(c => c.severity === 'critical').length
  const highCount = corridors.filter(c => c.severity === 'high').length

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* NAV */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,248,245,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8e0d5',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/public" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#9e9189', textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Home
            </Link>
            <span style={{ color: '#e8e0d5' }}>·</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#2c2825' }}>Live Traffic</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#a67c52' }}>
              <Radio size={12} /> Updated {lastUpdated || '—'}
            </div>
            <button onClick={loadData} style={{
              padding: '7px 12px', borderRadius: 8, border: '1px solid #e8e0d5',
              background: 'white', fontSize: 12, fontWeight: 700, color: '#2c2825',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <RefreshCw size={12} /> Refresh
            </button>
            <Link href="/journey" style={{
              padding: '8px 14px', borderRadius: 8, background: '#2c2825', color: '#c8a97e',
              fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Navigation size={13} /> Plan Journey
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Zap size={18} color="#c8a97e" />
            <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: '#2c2825', margin: 0, letterSpacing: '-0.5px' }}>
              Live Traffic — Kochi Metro Area
            </h1>
          </div>
          <p style={{ fontSize: 14, color: '#9e9189', margin: 0 }}>
            All data is public-only. No admin fields are displayed. {criticalCount > 0 && <strong style={{ color: '#dc2626' }}>{criticalCount} critical corridor{criticalCount > 1 ? 's' : ''}</strong>} {highCount > 0 && <><span style={{ color: '#9e9189' }}> + </span><strong style={{ color: '#ea580c' }}>{highCount} heavy</strong></>} right now.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9e9189', fontSize: 14 }}>Loading live traffic data…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, alignItems: 'start' }}>

            {/* Map — full height */}
            <div>
              <LiveTrafficMap corridors={corridors} height={440} />
            </div>

            {/* All corridors detail list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#2c2825', margin: '0 0 4px' }}>All Corridors</h2>
              {corridors.map(c => (
                <div key={c.corridor_id} style={{
                  background: SEVERITY_BG[c.severity] || 'white',
                  borderRadius: 12, padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2c2825' }}>{c.corridor_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      color: SEVERITY_TEXT[c.severity], letterSpacing: '0.05em' }}>
                      {c.severity}
                    </span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Now: <strong>{c.current_congestion}%</strong></span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>+15 min: <strong>{c.predicted_congestion}%</strong></span>
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Confidence: {Math.round(c.confidence * 100)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
