'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Navigation, Radio, RefreshCw } from 'lucide-react'
import { ForecastSummary, TrafficCorridor } from '@/components/public/ForecastSummary'

const TRAFFIC_FORECAST_URL = '/data/mock_traffic_current.json'
const CITIES = ['All Cities', 'Kochi', 'Thrissur', 'Thiruvananthapuram', 'Kozhikode', 'Kollam']

export default function ForecastPage() {
  const [allCorridors, setAllCorridors] = useState<TrafficCorridor[]>([])
  const [selectedCity, setSelectedCity] = useState('All Cities')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const raw = await fetch(TRAFFIC_FORECAST_URL).then(r => r.json())
      const safe: TrafficCorridor[] = (Array.isArray(raw) ? raw : []).map((c: any) => ({
        corridor_id: c.corridor_id, city: c.city || 'Kochi',
        corridor_name: c.corridor_name, timestamp: c.timestamp,
        current_congestion: c.current_congestion, predicted_congestion: c.predicted_congestion,
        severity: c.severity, confidence: c.confidence,
      }))
      setAllCorridors(safe.sort((a, b) => b.predicted_congestion - a.predicted_congestion))
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const corridors = selectedCity === 'All Cities'
    ? allCorridors
    : allCorridors.filter(c => c.city === selectedCity)

  const avgNow  = corridors.length ? Math.round(corridors.reduce((s, c) => s + c.current_congestion, 0)   / corridors.length) : null
  const avgNext = corridors.length ? Math.round(corridors.reduce((s, c) => s + c.predicted_congestion, 0) / corridors.length) : null
  const delta = avgNow !== null && avgNext !== null ? avgNext - avgNow : null

  function trendLabel() {
    if (delta === null) return ''
    if (delta > 10) return 'Traffic expected to worsen significantly in the next 15 minutes'
    if (delta > 5)  return 'Traffic is getting heavier — plan for delays'
    if (delta < -5) return 'Traffic is easing — conditions improving'
    return 'Traffic is holding steady — no major changes expected'
  }

  function TrendIcon() {
    if (delta === null) return null
    if (delta > 5)  return <TrendingUp size={22} color="#dc2626" />
    if (delta < -3) return <TrendingDown size={22} color="#16a34a" />
    return <Minus size={22} color="#ca8a04" />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,248,245,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e8e0d5' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/public" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#9e9189', textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Home
            </Link>
            <span style={{ color: '#e8e0d5' }}>·</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#2c2825' }}>Traffic Forecast</span>
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

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '36px 20px 80px' }}>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#2c2825', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          Traffic Forecast — Next 15 Minutes
        </h1>

        {/* City selector */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9e9189', fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            {/* City-wide summary */}
            {avgNow !== null && avgNext !== null && (
              <div style={{ background: '#2c2825', borderRadius: 18, padding: '24px 28px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <TrendIcon />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#faf8f5', marginBottom: 4 }}>
                      {selectedCity === 'All Cities' ? 'Kerala-wide' : selectedCity} outlook
                    </div>
                    <div style={{ fontSize: 14, color: '#c8a97e', lineHeight: 1.4 }}>{trendLabel()}</div>
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#faf8f5' }}>{avgNow}%</div>
                    <div style={{ fontSize: 11, color: '#c8a97e' }}>Average now</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: delta && delta > 5 ? '#fca5a5' : '#86efac' }}>{avgNext}%</div>
                    <div style={{ fontSize: 11, color: '#c8a97e' }}>In 15 min</div>
                  </div>
                </div>
              </div>
            )}

            {corridors.length === 0 ? (
              <div style={{ padding: 20, background: '#f5f2ee', borderRadius: 12, fontSize: 14, color: '#9e9189', textAlign: 'center' }}>
                No forecast data for {selectedCity}. Try a different city.
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#2c2825', margin: '0 0 14px' }}>
                  Corridor Breakdown {selectedCity !== 'All Cities' ? `· ${selectedCity}` : '· All Kerala'}
                </h2>
                <ForecastSummary corridors={corridors} variant="full" />
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
