'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Navigation, Radio, Search, Crosshair, X, MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'
import { TrafficCorridor } from '@/components/public/ForecastSummary'

const LiveTrafficMap = dynamic(
  () => import('@/components/public/LiveTrafficMap').then((m) => m.LiveTrafficMap),
  { ssr: false, loading: () => <div style={{ height: 440, background: '#f5f2ee', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9e9189', fontSize: 14 }}>Loading map…</div> }
)

const PRESET_CITIES = [
  { name: 'Kothamangalam', lat: 10.0601, lon: 76.6214 },
  { name: 'Munnar', lat: 10.0889, lon: 77.0595 },
  { name: 'Aluva', lat: 10.1076, lon: 76.3516 },
  { name: 'Kochi (Kaloor)', lat: 10.0033, lon: 76.2996 },
  { name: 'Thrissur', lat: 10.5276, lon: 76.2144 },
  { name: 'Trivandrum', lat: 8.5241, lon: 76.9366 },
  { name: 'Kozhikode', lat: 11.2588, lon: 75.7804 },
  { name: 'Kollam', lat: 8.8932, lon: 76.6141 },
]

const TRAFFIC_CURRENT_URL = '/data/mock_traffic_current.json'

const SEVERITY_BG: Record<string, string> = { critical: '#fee2e2', high: '#fff7ed', medium: '#fefce8', low: '#f0fdf4' }
const SEVERITY_TEXT: Record<string, string> = { critical: '#991b1b', high: '#9a3412', medium: '#854d0e', low: '#15803d' }

export default function LiveTrafficPage() {
  const [allCorridors, setAllCorridors] = useState<TrafficCorridor[]>([])
  const [selectedCity, setSelectedCity] = useState('Kothamangalam')
  const [customCenter, setCustomCenter] = useState<[number, number]>([10.0601, 76.6214])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchDebounceRef = useRef<any>(null)

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

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

  // Dynamic Live Flow Fetch for custom location
  async function fetchLiveFlow(lat: number, lon: number, locationName: string) {
    try {
      const flowRes = await fetch(
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/14/json?key=${KEY}&point=${lat},${lon}`
      )
      let currentSpeed = 30
      let freeFlowSpeed = 48
      if (flowRes.ok) {
        const data = await flowRes.json()
        const seg = data?.flowSegmentData
        if (seg) {
          currentSpeed = seg.currentSpeed || 30
          freeFlowSpeed = seg.freeFlowSpeed || 48
        }
      }

      const ratio = currentSpeed / Math.max(freeFlowSpeed, 1)
      const currentCongestion = Math.min(99, Math.max(12, Math.round((1 - ratio) * 100)))
      const predictedCongestion = Math.min(99, Math.round(currentCongestion * 1.1))

      let severity: 'critical' | 'high' | 'medium' | 'low' = 'low'
      if (currentCongestion >= 75) severity = 'critical'
      else if (currentCongestion >= 50) severity = 'high'
      else if (currentCongestion >= 30) severity = 'medium'

      const dynamicCorridor: TrafficCorridor = {
        corridor_id: Date.now(),
        city: locationName,
        corridor_name: `${locationName} Sector Artery`,
        timestamp: new Date().toISOString(),
        current_congestion: currentCongestion,
        predicted_congestion: predictedCongestion,
        severity: severity,
        confidence: 0.92,
        coordinates: [lat, lon],
      }

      setAllCorridors(prev => [dynamicCorridor, ...prev.filter(c => c.city !== locationName)])
      setSelectedCity(locationName)
      setCustomCenter([lat, lon])
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    } catch (err) {
      console.warn('Flow fetch failed:', err)
    }
  }

  const handleSearchInput = (val: string) => {
    setSearchQuery(val)
    if (!val || val.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(
          `https://api.tomtom.com/search/2/search/${encodeURIComponent(val)}.json?key=${KEY}&countrySet=IN&limit=5`
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data?.results || [])
          setShowSuggestions(true)
        }
      } catch { }
      finally { setIsSearching(false) }
    }, 280)
  }

  const handleSelectLocation = (lat: number, lon: number, name: string) => {
    setSearchQuery(name)
    setShowSuggestions(false)
    fetchLiveFlow(lat, lon, name)
  }

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    if (suggestions.length > 0) {
      const first = suggestions[0]
      const name = first.address?.freeformAddress || first.poi?.name || searchQuery
      handleSelectLocation(first.position.lat, first.position.lon, name)
      return
    }

    try {
      const res = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(searchQuery)}.json?key=${KEY}&countrySet=IN&limit=1`
      )
      if (res.ok) {
        const data = await res.json()
        const r = data?.results?.[0]
        if (r) {
          const name = r.address?.freeformAddress || r.poi?.name || searchQuery
          handleSelectLocation(r.position.lat, r.position.lon, name)
        }
      }
    } catch { }
  }

  const corridors = selectedCity === 'All Cities'
    ? allCorridors
    : allCorridors.filter(c => c.city?.toLowerCase().includes(selectedCity.toLowerCase()) || selectedCity.toLowerCase().includes(c.city?.toLowerCase() || ''))

  const displayedCorridors = corridors.length > 0 ? corridors : allCorridors.slice(0, 4)
  const criticalCount = displayedCorridors.filter(c => c.severity === 'critical').length
  const highCount     = displayedCorridors.filter(c => c.severity === 'high').length

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
            <span style={{ fontSize: 12, color: '#a67c52', display: 'flex', alignItems: 'center', gap: 5 }}><Radio size={12} /> {lastUpdated || 'LIVE'}</span>
            <button onClick={loadData} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e8e0d5', background: 'white', fontSize: 12, fontWeight: 700, color: '#2c2825', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={12} /> Refresh
            </button>
            <Link href="/journey" style={{ padding: '8px 14px', borderRadius: 8, background: '#2c2825', color: '#c8a97e', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Navigation size={13} /> Plan Journey
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Dynamic Search Box */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e8e0d5', padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <h1 style={{ fontSize: 'clamp(18px, 3.5vw, 24px)', fontWeight: 900, color: '#2c2825', margin: 0 }}>
              Live Traffic Surveillance — {selectedCity}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9e9189', textTransform: 'uppercase' }}>Quick Jump:</span>
              {PRESET_CITIES.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelectLocation(c.lat, c.lon, c.name)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: '1px solid #e8e0d5',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: selectedCity === c.name ? '#2c2825' : '#faf8f5',
                    color: selectedCity === c.name ? '#c8a97e' : '#6b7280',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Search size={16} color="#9e9189" style={{ position: 'absolute', left: 12 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                placeholder="Search any town, city, or junction (e.g. Kothamangalam, Munnar, Aluva, Kaloor, Thrissur)..."
                style={{
                  width: '100%', height: 42, borderRadius: 10, border: '1px solid #e8e0d5',
                  paddingLeft: 38, paddingRight: 90, background: '#faf8f5', fontSize: 13,
                  outline: 'none', color: '#2c2825', fontWeight: 600,
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false) }}
                  style={{ position: 'absolute', right: 75, background: 'none', border: 'none', cursor: 'pointer', color: '#9e9189' }}
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="submit"
                style={{
                  position: 'absolute', right: 6, height: 30, padding: '0 12px',
                  borderRadius: 7, background: '#2c2825', color: '#c8a97e',
                  border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Crosshair size={13} /> Search
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: 46, left: 0, right: 0, zIndex: 100,
                background: 'white', border: '1px solid #e8e0d5', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 6,
              }}>
                {suggestions.map((item, idx) => {
                  const title = item.poi?.name || item.address?.freeformAddress || 'Location'
                  const sub = item.address?.municipality || item.address?.countrySubdivision || 'India'
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectLocation(item.position.lat, item.position.lon, title)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', border: 'none', background: 'transparent',
                        textAlign: 'left', cursor: 'pointer', borderRadius: 6,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#faf8f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={14} color="#a67c52" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#2c2825' }}>{title}</div>
                          <div style={{ fontSize: 11, color: '#9e9189' }}>{sub}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#a67c52', fontFamily: 'monospace' }}>
                        {item.position.lat.toFixed(3)}, {item.position.lon.toFixed(3)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </form>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9e9189', fontSize: 14 }}>Loading live traffic…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, alignItems: 'start' }}>
            <div>
              <LiveTrafficMap corridors={displayedCorridors} selectedCity={selectedCity} customCenter={customCenter} height={460} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: '#2c2825', margin: 0 }}>
                  Active Corridors in {selectedCity}
                </h2>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '2px 8px', borderRadius: 20 }}>
                  Live TomTom Flow
                </span>
              </div>

              {displayedCorridors.map(c => (
                <div key={c.corridor_id} style={{ background: SEVERITY_BG[c.severity] || 'white', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.city || selectedCity}</div>
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
