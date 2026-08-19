'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, MapPin, Navigation, ArrowRight, Zap, Radio } from 'lucide-react'
import dynamic from 'next/dynamic'
import { ForecastSummary, TrafficCorridor } from '@/components/public/ForecastSummary'

// Dynamically import map to avoid SSR issues with Leaflet
const LiveTrafficMap = dynamic(
  () => import('@/components/public/LiveTrafficMap').then((m) => m.LiveTrafficMap),
  { ssr: false, loading: () => <div style={{ height: 320, background: '#f5f2ee', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9e9189', fontSize: 14 }}>Loading map…</div> }
)

// ── Public-safe Event object — FROZEN SHAPE per SHARED_CONTRACT.md ────────────
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

const IMPACT_COLOUR: Record<string, string> = { high: '#dc2626', medium: '#ca8a04', low: '#16a34a' }

const SEVERITY_BG: Record<string, string> = {
  critical: '#fee2e2', high: '#fff7ed', medium: '#fefce8', low: '#f0fdf4',
}
const SEVERITY_TEXT: Record<string, string> = {
  critical: '#991b1b', high: '#9a3412', medium: '#854d0e', low: '#15803d',
}

/** Fetch wrapper — one-line swap to real API: change MOCK_URL to Shadeed's /traffic/current */
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
  const [corridors, setCorridors] = useState<TrafficCorridor[]>([])
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    async function load() {
      try {
        // ONE-LINE SWAP: replace MOCK_CURRENT_URL with '/traffic/current' when Shadeed's API is ready
        const [trafficRes, eventsRes] = await Promise.all([
          fetch(MOCK_CURRENT_URL).then(r => r.json()),
          fetch(MOCK_EVENTS_URL).then(r => r.json()).catch(() => []),
        ])

        // Guard: only accept fields from the frozen public-safe shape
        const safeCorridors: TrafficCorridor[] = (Array.isArray(trafficRes) ? trafficRes : []).map((c: any) => ({
          corridor_id:        c.corridor_id,
          corridor_name:      c.corridor_name,
          timestamp:          c.timestamp,
          current_congestion: c.current_congestion,
          predicted_congestion: c.predicted_congestion,
          severity:           c.severity,
          confidence:         c.confidence,
        }))

        // Guard: only accept fields from the frozen public-safe event shape
        const safeEvents: PublicEvent[] = (Array.isArray(eventsRes) ? eventsRes : []).map((e: any) => ({
          id:           e.id,
          name:         e.name,
          type:         e.type,
          status:       e.status === 'possible' ? 'possible' : 'confirmed',
          start_time:   e.start_time,
          end_time:     e.end_time,
          latitude:     e.latitude,
          longitude:    e.longitude,
          impact_level: e.impact_level,
        }))

        setCorridors(safeCorridors)
        setEvents(safeEvents.slice(0, 2)) // teaser: max 2 events
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
      } catch {
        // Data fetch failed silently — empty state handles gracefully
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Derive top alerts from corridors with severity critical/high
  const alerts = corridors.filter(c => c.severity === 'critical' || c.severity === 'high')

  // Overall city congestion summary
  const avgCongestion = corridors.length
    ? Math.round(corridors.reduce((s, c) => s + c.current_congestion, 0) / corridors.length)
    : null
  const criticalCount = corridors.filter(c => c.severity === 'critical').length

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,248,245,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8e0d5',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#2c2825',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={15} color="#c8a97e" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#2c2825', letterSpacing: '-0.3px' }}>Flowcast</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <Link href="/public/traffic" style={{ padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#2c2825', textDecoration: 'none' }}>Live Traffic</Link>
            <Link href="/public/forecast" style={{ padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#9e9189', textDecoration: 'none' }}>Forecast</Link>
            <Link href="/events" style={{ padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#9e9189', textDecoration: 'none' }}>Events</Link>
            <Link href="/journey" style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              textDecoration: 'none', background: '#2c2825', color: '#c8a97e',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Navigation size={13} /> Plan Journey
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ background: '#2c2825', color: '#faf8f5', padding: '48px 20px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Radio size={14} color="#c8a97e" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#c8a97e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Live · Updated {lastUpdated || '—'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, letterSpacing: '-0.8px', margin: '0 0 10px', lineHeight: 1.1 }}>
            Kochi City Traffic<br />Intelligence
          </h1>
          <p style={{ fontSize: 15, color: '#c8a97e', margin: '0 0 28px', maxWidth: 480, lineHeight: 1.5 }}>
            Real-time congestion, 15-minute forecasts, and event alerts — so you can choose when and how to travel.
          </p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 20px', minWidth: 120 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: avgCongestion && avgCongestion > 60 ? '#fca5a5' : '#86efac' }}>
                {avgCongestion !== null ? `${avgCongestion}%` : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#c8a97e', marginTop: 2 }}>Avg city congestion</div>
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
          <div style={{ textAlign: 'center', padding: 60, color: '#9e9189', fontSize: 14 }}>
            Loading live traffic data…
          </div>
        ) : (
          <>
            {/* ── MAP + ALERTS ────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 24, marginBottom: 32, alignItems: 'start' }}>

              {/* Map */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2c2825', margin: 0 }}>Live Congestion Map</h2>
                  <Link href="/public/traffic" style={{ fontSize: 12, fontWeight: 700, color: '#a67c52', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Full view <ArrowRight size={12} />
                  </Link>
                </div>
                <LiveTrafficMap corridors={corridors} height={320} />
              </div>

              {/* Alerts sidebar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2c2825', margin: 0 }}>Top Alerts</h2>
                </div>
                {alerts.length === 0 ? (
                  <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '16px', fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                    ✅ No major congestion alerts right now
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {alerts.map(c => (
                      <div key={c.corridor_id} style={{
                        background: SEVERITY_BG[c.severity], borderRadius: 12,
                        padding: '12px 14px',
                      }}>
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

            {/* ── FORECAST SUMMARY ────────────────────────────────────── */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#2c2825', margin: 0 }}>15-Minute Traffic Forecast</h2>
                <Link href="/public/forecast" style={{ fontSize: 12, fontWeight: 700, color: '#a67c52', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Full forecast <ArrowRight size={12} />
                </Link>
              </div>
              <ForecastSummary corridors={corridors} variant="compact" />
            </div>

            {/* ── EVENTS TEASER ────────────────────────────────────────── */}
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
                      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e8e0d5', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, transition: 'box-shadow 0.15s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2825', lineHeight: 1.3 }}>{ev.name}</span>
                          {/* POSSIBLE / UNCONFIRMED label — required per Section 4 */}
                          {ev.status === 'possible' && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 8, background: '#fef9c3', color: '#854d0e', flexShrink: 0, textTransform: 'uppercase' }}>
                              POSSIBLE / UNCONFIRMED
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                          <CalendarDays size={12} />
                          {formatDate(ev.start_time)} · {formatTime(ev.start_time)}–{formatTime(ev.end_time)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                            background: ev.impact_level === 'high' ? '#fee2e2' : ev.impact_level === 'medium' ? '#fef9c3' : '#f0fdf4',
                            color: IMPACT_COLOUR[ev.impact_level] || '#6b7280',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            {ev.impact_level} impact
                          </span>
                          <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{ev.type}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── JOURNEY PLANNER CTA ──────────────────────────────────── */}
            <div style={{
              background: '#2c2825', borderRadius: 20, padding: '32px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 20,
            }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#faf8f5', marginBottom: 6 }}>Plan your journey around traffic</div>
                <div style={{ fontSize: 14, color: '#c8a97e', lineHeight: 1.5 }}>
                  Find the fastest route, avoid congested corridors, and see live travel times.
                </div>
              </div>
              <Link href="/journey" style={{
                padding: '14px 28px', borderRadius: 12, background: '#c8a97e', color: '#2c2825',
                fontWeight: 800, fontSize: 14, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              }}>
                <Navigation size={16} /> Start Planning
              </Link>
            </div>
          </>
        )}
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #e8e0d5', padding: '24px 20px', textAlign: 'center', fontSize: 12, color: '#9e9189' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          Flowcast · Smart Traffic Congestion Management · Public data only · Data refreshed every 5 minutes
          {' '}<span style={{ color: '#c8a97e' }}>·</span>{' '}
          <Link href="/admin" style={{ color: '#a67c52', textDecoration: 'none', fontWeight: 600 }}>City Planner Portal</Link>
        </div>
      </footer>
    </div>
  )
}
