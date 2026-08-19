'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, Navigation, ArrowRight, Zap, Radio, ChevronDown } from 'lucide-react'
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

const CITIES = ['All Cities', 'Kochi', 'Thrissur', 'Thiruvananthapuram', 'Kozhikode', 'Kollam']

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
  const [selectedCity, setSelectedCity] = useState('All Cities')
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [trafficRes, eventsRes] = await Promise.all([
          fetch(MOCK_CURRENT_URL).then(r => r.json()),
          fetch(MOCK_EVENTS_URL).then(r => r.json()).catch(() => []),
        ])
        // Accept only public-safe frozen fields
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

  // Filter by selected city
  const corridors = selectedCity === 'All Cities'
    ? allCorridors
    : allCorridors.filter(c => c.city === selectedCity)

  const alerts = corridors.filter(c => c.severity === 'critical' || c.severity === 'high')
  const avgCongestion = corridors.length
    ? Math.round(corridors.reduce((s, c) => s + c.current_congestion, 0) / corridors.length)
    : null
  const criticalCount = corridors.filter(c => c.severity === 'critical').length

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── HERO ── */}
      <section style={{ background: '#2c2825', color: '#faf8f5', padding: '48px 20px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Radio size={14} color="#c8a97e" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#c8a97e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Live · Updated {lastUpdated || '—'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, letterSpacing: '-0.8px', margin: '0 0 10px', lineHeight: 1.1 }}>
            Kerala Traffic Intelligence
          </h1>
          <p style={{ fontSize: 15, color: '#c8a97e', margin: '0 0 28px', maxWidth: 480, lineHeight: 1.5 }}>
            Real-time congestion, 15-minute forecasts, and event alerts — choose your city and plan your travel.
          </p>

          {/* ── City Selector ── */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
            {CITIES.map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                style={{
                  padding: '8px 16px', borderRadius: 20, border: 'none',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  background: selectedCity === city ? '#c8a97e' : 'rgba(255,255,255,0.10)',
                  color: selectedCity === city ? '#2c2825' : '#faf8f5',
                }}
              >
                {city}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 20px', minWidth: 120 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: avgCongestion && avgCongestion > 60 ? '#fca5a5' : '#86efac' }}>
                {avgCongestion !== null ? `${avgCongestion}%` : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#c8a97e', marginTop: 2 }}>Avg congestion · {selectedCity}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 20px', minWidth: 120 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: criticalCount > 0 ? '#fca5a5' : '#86efac' }}>
                {corridors.length ? criticalCount : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#c8a97e', marginTop: 2 }}>Critical corridors</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 20px', minWidth: 120 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#faf8f5' }}>{corridors.length}</div>
              <div style={{ fontSize: 12, color: '#c8a97e', marginTop: 2 }}>Corridors monitored</div>
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
                    Live Congestion Map {selectedCity !== 'All Cities' && `— ${selectedCity}`}
                  </h2>
                  <Link href="/public/traffic" style={{ fontSize: 12, fontWeight: 700, color: '#a67c52', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Full view <ArrowRight size={12} />
                  </Link>
                </div>
                <LiveTrafficMap corridors={corridors} selectedCity={selectedCity} height={320} />
              </div>

              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2c2825', margin: '0 0 12px' }}>Top Alerts</h2>
                {alerts.length === 0 ? (
                  <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                    ✅ No major congestion alerts
                    {selectedCity !== 'All Cities' ? ` in ${selectedCity}` : ''} right now
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {alerts.map(c => (
                      <div key={c.corridor_id} style={{ background: SEVERITY_BG[c.severity], borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                          {c.city}
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

            {/* ── FORECAST ── */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2c2825', margin: 0 }}>15-Minute Forecast</h2>
                <Link href="/public/forecast" style={{ fontSize: 12, fontWeight: 700, color: '#a67c52', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Full forecast <ArrowRight size={12} />
                </Link>
              </div>
              {corridors.length === 0 ? (
                <div style={{ padding: 20, background: '#f5f2ee', borderRadius: 12, fontSize: 14, color: '#9e9189', textAlign: 'center' }}>
                  No data for {selectedCity}. Try selecting a different city.
                </div>
              ) : (
                <ForecastSummary corridors={corridors} variant="compact" />
              )}
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
          Flowcast · Smart Traffic Congestion Management · Public data only · Refreshed every 5 minutes
          {' '}<span style={{ color: '#c8a97e' }}>·</span>{' '}
          <Link href="/admin" style={{ color: '#a67c52', textDecoration: 'none', fontWeight: 600 }}>City Planner Portal</Link>
        </div>
      </footer>
    </div>
  )
}
