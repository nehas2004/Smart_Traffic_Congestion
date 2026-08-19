'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Navigation, Radio } from 'lucide-react'
import dynamic from 'next/dynamic'
import { TrafficCorridor } from '@/components/public/ForecastSummary'

const LiveTrafficMap = dynamic(
  () => import('@/components/public/LiveTrafficMap').then((m) => m.LiveTrafficMap),
  { ssr: false, loading: () => <div style={{ height: 440, background: '#f5f2ee', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9e9189', fontSize: 14 }}>Loading map…</div> }
)

const CITIES = ['All Cities', 'Kochi', 'Thrissur', 'Thiruvananthapuram', 'Kozhikode', 'Kollam']
const TRAFFIC_CURRENT_URL = '/data/mock_traffic_current.json'

const SEVERITY_BG: Record<string, string> = { critical: '#fee2e2', high: '#fff7ed', medium: '#fefce8', low: '#f0fdf4' }
const SEVERITY_TEXT: Record<string, string> = { critical: '#991b1b', high: '#9a3412', medium: '#854d0e', low: '#15803d' }

export default function LiveTrafficPage() {
  const [allCorridors, setAllCorridors] = useState<TrafficCorridor[]>([])
  const [selectedCity, setSelectedCity] = useState('All Cities')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const raw = await fetch(TRAFFIC_CURRENT_URL).then(r => r.json())
      const safe: TrafficCorridor[] = (Array.isArray(raw) ? raw : []).map((c: any) => ({
        corridor_id: c.corridor_id, city: c.city || 'Kochi',
        corridor_name: c.corridor_name, timestamp: c.timestamp,
        current_congestion: c.current_congestion, predicted_congestion: c.predicted_congestion,
        severity: c.severity, confidence: c.confidence,
      }))
      setAllCorridors(safe)
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const corridors = selectedCity === 'All Cities'
    ? allCorridors
    : allCorridors.filter(c => c.city === selectedCity)

  const criticalCount = corridors.filter(c => c.severity === 'critical').length
  const highCount     = corridors.filter(c => c.severity === 'high').length

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,248,245,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e8e0d5' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/public" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#9e9189', textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Home
            </Link>
            <span style={{ color: '#e8e0d5' }}>·</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#2c2825' }}>Live Traffic</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#a67c52', display: 'flex', alignItems: 'center', gap: 5 }}><Radio size={12} /> {lastUpdated || '—'}</span>
            <button onClick={loadData} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e8e0d5', background: 'white', fontSize: 12, fontWeight: 700, color: '#2c2825', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={12} /> Refresh
            </button>
            <Link href="/journey" style={{ padding: '8px 14px', borderRadius: 8, background: '#2c2825', color: '#c8a97e', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Navigation size={13} /> Plan Journey
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: '#2c2825', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            Live Traffic — Kerala
          </h1>
          {/* City selector */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {CITIES.map(city => (
              <button key={city} onClick={() => setSelectedCity(city)} style={{
                padding: '7px 14px', borderRadius: 20, border: '1px solid',
                borderColor: selectedCity === city ? '#2c2825' : '#e8e0d5',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                background: selectedCity === city ? '#2c2825' : 'white',
                color: selectedCity === city ? '#c8a97e' : '#6b7280',
              }}>{city}</button>
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#9e9189', margin: 0 }}>
            {criticalCount > 0 && <strong style={{ color: '#dc2626' }}>{criticalCount} critical</strong>}
            {criticalCount > 0 && highCount > 0 && ' · '}
            {highCount > 0 && <strong style={{ color: '#ea580c' }}>{highCount} heavy</strong>}
            {(criticalCount > 0 || highCount > 0) ? ` in ${selectedCity === 'All Cities' ? 'Kerala' : selectedCity}` : `All clear in ${selectedCity === 'All Cities' ? 'Kerala' : selectedCity}`}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9e9189', fontSize: 14 }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, alignItems: 'start' }}>
            <LiveTrafficMap corridors={corridors} selectedCity={selectedCity} height={440} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: '#2c2825', margin: '0 0 4px' }}>
                All Corridors {selectedCity !== 'All Cities' ? `· ${selectedCity}` : ''}
              </h2>
              {corridors.length === 0 ? (
                <div style={{ padding: 16, background: '#f5f2ee', borderRadius: 12, fontSize: 13, color: '#9e9189' }}>
                  No corridors monitored in {selectedCity}.
                </div>
              ) : corridors.map(c => (
                <div key={c.corridor_id} style={{ background: SEVERITY_BG[c.severity] || 'white', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.city}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2c2825' }}>{c.corridor_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: SEVERITY_TEXT[c.severity], letterSpacing: '0.05em' }}>{c.severity}</span>
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
