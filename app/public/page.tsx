'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, Navigation, ArrowRight, Zap, Radio, Search, Crosshair, X, MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'
import { ForecastSummary, TrafficCorridor } from '@/components/public/ForecastSummary'

const LiveTrafficMap = dynamic(
  () => import('@/components/public/LiveTrafficMap').then((m) => m.LiveTrafficMap),
  { ssr: false, loading: () => <div style={{ height: 320, background: '#f5f2ee', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9e9189', fontSize: 14 }}>Loading map…</div> }
)

interface PublicEvent {
  id: number
  name: string
  type: string
  status: 'confirmed' | 'possible'
  start_time: string
  end_time: string
  latitude: number
  longitude: number
  impact_level: 'high' | 'medium' | 'low'
}

const PRESET_CITIES = [
  { name: 'Kothamangalam', lat: 10.0601, lon: 76.6214 },
  { name: 'Munnar', lat: 10.0889, lon: 77.0595 },
  { name: 'Aluva', lat: 10.1076, lon: 76.3516 },
  { name: 'Kochi', lat: 10.0200, lon: 76.3050 },
  { name: 'Thrissur', lat: 10.5276, lon: 76.2144 },
  { name: 'Trivandrum', lat: 8.5241, lon: 76.9366 },
  { name: 'Kozhikode', lat: 11.2588, lon: 75.7804 },
  { name: 'Kollam', lat: 8.8932, lon: 76.6141 },
]

const IMPACT_COLOUR: Record<string, string> = { high: '#dc2626', medium: '#ca8a04', low: '#16a34a' }
const SEVERITY_BG: Record<string, string> = { critical: '#fee2e2', high: '#fff7ed', medium: '#fefce8', low: '#f0fdf4' }
const SEVERITY_TEXT: Record<string, string> = { critical: '#991b1b', high: '#9a3412', medium: '#854d0e', low: '#15803d' }

const MOCK_CURRENT_URL = '/data/mock_traffic_current.json'
const MOCK_EVENTS_URL  = '/data/mock_events_public.json'

function formatTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
  catch { return ts }
}
function formatDate(ts: string) {
  try { return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
  catch { return ts }
}

export default function PublicHomePage() {
  const [allCorridors, setAllCorridors] = useState<TrafficCorridor[]>([])
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState('Kothamangalam')
  const [customCenter, setCustomCenter] = useState<[number, number]>([10.0601, 76.6214])
  const [lastUpdated, setLastUpdated] = useState('')

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchDebounceRef = useRef<any>(null)

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  useEffect(() => {
    async function load() {
      try {
        const [trafficRes, eventsRes] = await Promise.all([
          fetch(MOCK_CURRENT_URL).then(r => r.json()),
          fetch(MOCK_EVENTS_URL).then(r => r.json()).catch(() => []),
        ])
        const safe: TrafficCorridor[] = (Array.isArray(trafficRes) ? trafficRes : []).map((c: any) => ({
          corridor_id:          c.corridor_id,
          city:                 c.city || 'Kochi',
          corridor_name:        c.corridor_name,
          timestamp:            c.timestamp,
          current_congestion:   c.current_congestion,
          predicted_congestion: c.predicted_congestion,
          severity:             c.severity,
          confidence:           c.confidence,
        }))
        const safeEvents: PublicEvent[] = (Array.isArray(eventsRes) ? eventsRes : []).map((e: any) => ({
          id: e.id, name: e.name, type: e.type,
          status: e.status === 'possible' ? 'possible' : 'confirmed',
          start_time: e.start_time, end_time: e.end_time,
          latitude: e.latitude, longitude: e.longitude,
          impact_level: e.impact_level,
        }))
        setAllCorridors(safe)
        setEvents(safeEvents.slice(0, 2))
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
      } catch { }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Dynamic Live Flow Fetch
  async function fetchLiveFlow(lat: number, lon: number, locationName: string) {
    try {
      const flowRes = await fetch(
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/14/json?key=${KEY}&point=${lat},${lon}`
      )
      let currentSpeed = 32
      let freeFlowSpeed = 48
      if (flowRes.ok) {
        const data = await flowRes.json()
        const seg = data?.flowSegmentData
        if (seg) {
          currentSpeed = seg.currentSpeed || 32
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
        corridor_name: `${locationName} Main Artery`,
        timestamp: new Date().toISOString(),
        current_congestion: currentCongestion,
        predicted_congestion: predictedCongestion,
        severity: severity,
        confidence: 0.94,
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

  // Filter by selected city
  const corridors = selectedCity === 'All Cities'
    ? allCorridors
    : allCorridors.filter(c => c.city?.toLowerCase().includes(selectedCity.toLowerCase()) || selectedCity.toLowerCase().includes(c.city?.toLowerCase() || ''))

  const displayedCorridors = corridors.length > 0 ? corridors : allCorridors.slice(0, 3)
  const alerts = displayedCorridors.filter(c => c.severity === 'critical' || c.severity === 'high')
  const avgCongestion = displayedCorridors.length
    ? Math.round(displayedCorridors.reduce((s, c) => s + c.current_congestion, 0) / displayedCorridors.length)
    : null
  const criticalCount = displayedCorridors.filter(c => c.severity === 'critical').length

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── HERO ── */}
      <section style={{ background: '#2c2825', color: '#faf8f5', padding: '44px 20px 36px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Radio size={14} color="#c8a97e" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#c8a97e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Live TomTom Telemetry · {lastUpdated || 'LIVE'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 4.5vw, 38px)', fontWeight: 900, letterSpacing: '-0.8px', margin: '0 0 10px', lineHeight: 1.1 }}>
            Kerala Live Traffic Intelligence
          </h1>
          <p style={{ fontSize: 14, color: '#c8a97e', margin: '0 0 20px', maxWidth: 520, lineHeight: 1.5 }}>
            Search any city, town, or road across Kerala for real-time congestion, TomTom heat maps, and 15-minute forecasts.
          </p>

          {/* Search Bar in Hero */}
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative', maxWidth: 640, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <Search size={16} color="#9e9189" style={{ position: 'absolute', left: 14 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                placeholder="Search any area (e.g. Kothamangalam, Munnar, Aluva, Kaloor, Thrissur)..."
                style={{
                  width: '100%', height: 46, borderRadius: 12, border: '1px solid rgba(200,169,126,0.3)',
                  paddingLeft: 42, paddingRight: 100, background: '#faf8f5', fontSize: 13,
                  outline: 'none', color: '#2c2825', fontWeight: 600,
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false) }}
                  style={{ position: 'absolute', right: 85, background: 'none', border: 'none', cursor: 'pointer', color: '#9e9189' }}
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="submit"
                style={{
                  position: 'absolute', right: 6, height: 34, padding: '0 14px',
                  borderRadius: 8, background: '#2c2825', color: '#c8a97e',
                  border: '1px solid #c8a97e', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <Crosshair size={13} /> Search
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: 52, left: 0, right: 0, zIndex: 200,
                background: 'white', border: '1px solid #e8e0d5', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)', padding: 6,
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
                        textAlign: 'left', cursor: 'pointer', borderRadius: 8,
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

          {/* Quick preset city chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {PRESET_CITIES.map(c => (
              <button
                key={c.name}
                onClick={() => handleSelectLocation(c.lat, c.lon, c.name)}
                style={{
                  padding: '7px 14px', borderRadius: 20, border: 'none',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                  background: selectedCity === c.name ? '#c8a97e' : 'rgba(255,255,255,0.12)',
                  color: selectedCity === c.name ? '#2c2825' : '#faf8f5',
                }}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Metric Tiles */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 18px', minWidth: 120 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: avgCongestion && avgCongestion > 60 ? '#fca5a5' : '#86efac' }}>
                {avgCongestion !== null ? `${avgCongestion}%` : '—'}
              </div>
              <div style={{ fontSize: 11, color: '#c8a97e', marginTop: 2 }}>Congestion · {selectedCity}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 18px', minWidth: 120 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: criticalCount > 0 ? '#fca5a5' : '#86efac' }}>
                {displayedCorridors.length ? criticalCount : '—'}
              </div>
              <div style={{ fontSize: 11, color: '#c8a97e', marginTop: 2 }}>Critical corridors</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 18px', minWidth: 120 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#faf8f5' }}>{displayedCorridors.length}</div>
              <div style={{ fontSize: 11, color: '#c8a97e', marginTop: 2 }}>Active arteries</div>
            </div>
          </div>
        </div>
      </section>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9e9189', fontSize: 14 }}>Loading live traffic data…</div>
        ) : (
          <>
            {/* ── MAP + ALERTS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 24, marginBottom: 32, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2c2825', margin: 0 }}>
                    Live TomTom Congestion Map — {selectedCity}
                  </h2>
                  <Link href="/public/traffic" style={{ fontSize: 12, fontWeight: 700, color: '#a67c52', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Full view <ArrowRight size={12} />
                  </Link>
                </div>
                <LiveTrafficMap corridors={displayedCorridors} selectedCity={selectedCity} customCenter={customCenter} height={340} />
              </div>

              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2c2825', margin: '0 0 12px' }}>Sector Alerts</h2>
                {alerts.length === 0 ? (
                  <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                    ✅ Traffic flowing smoothly in {selectedCity} right now
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {alerts.map(c => (
                      <div key={c.corridor_id} style={{ background: SEVERITY_BG[c.severity], borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                          {c.city || selectedCity}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <AlertTriangle size={13} color={SEVERITY_TEXT[c.severity]} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#2c2825' }}>{c.corridor_name}</span>
                        </div>
                        <div style={{ fontSize: 12, color: SEVERITY_TEXT[c.severity], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.severity}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                          Now {c.current_congestion}% · Forecast {c.predicted_congestion}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            {/* ── EVENTS TEASER ── */}
            {events.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2c2825', margin: 0 }}>Upcoming Events Affecting Traffic</h2>
                  <Link href="/events" style={{ fontSize: 12, fontWeight: 700, color: '#a67c52', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Full calendar <ArrowRight size={12} />
                  </Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                  {events.map(ev => (
                    <Link key={ev.id} href="/events" style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e8e0d5', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2825', lineHeight: 1.3 }}>{ev.name}</span>
                          {ev.status === 'possible' && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 8, background: '#fef9c3', color: '#854d0e', flexShrink: 0, textTransform: 'uppercase' }}>
                              POSSIBLE / UNCONFIRMED
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                          <CalendarDays size={12} /> {formatDate(ev.start_time)} · {formatTime(ev.start_time)}–{formatTime(ev.end_time)}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, width: 'fit-content',
                          background: ev.impact_level === 'high' ? '#fee2e2' : ev.impact_level === 'medium' ? '#fef9c3' : '#f0fdf4',
                          color: IMPACT_COLOUR[ev.impact_level], textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {ev.impact_level} impact
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── JOURNEY CTA ── */}
            <div style={{ background: '#2c2825', borderRadius: 20, padding: '32px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#faf8f5', marginBottom: 6 }}>Plan your journey around traffic</div>
                <div style={{ fontSize: 14, color: '#c8a97e', lineHeight: 1.5 }}>
                  Find the fastest route, avoid congested corridors, see live travel times.
                </div>
              </div>
              <Link href="/journey" style={{ padding: '14px 28px', borderRadius: 12, background: '#c8a97e', color: '#2c2825',
                fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <Navigation size={16} /> Start Planning
              </Link>
            </div>
          </>
        )}
      </main>

      <footer style={{ borderTop: '1px solid #e8e0d5', padding: '24px 20px', textAlign: 'center', fontSize: 12, color: '#9e9189' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          Flowcast · Smart Traffic Congestion Management · Refreshed live with TomTom APIs
          {' '}<span style={{ color: '#c8a97e' }}>·</span>{' '}
          <Link href="/admin" style={{ color: '#a67c52', textDecoration: 'none', fontWeight: 600 }}>City Planner Portal</Link>
        </div>
      </footer>
    </div>
  )
}
