'use client'
import Link from 'next/link'
import { Nav } from '@/components/shared/nav'
import { CalendarDays, ArrowLeft, Clock, MapPin } from 'lucide-react'

// Public-safe event shape — same frozen contract as the public module
const MOCK_EVENTS = [
  {
    id: 1,
    name: 'Kochi Music Festival',
    type: 'Concert',
    status: 'confirmed' as const,
    start_time: '2026-08-20T17:00:00',
    end_time: '2026-08-20T22:00:00',
    location: 'Marine Drive, Kochi',
    impact_level: 'high' as const,
    description: 'Large-scale open-air music event. Expect heavy congestion on Marine Drive and nearby routes after 16:30.',
  },
  {
    id: 2,
    name: 'Town Hall Regional Conference',
    type: 'Conference',
    status: 'confirmed' as const,
    start_time: '2026-08-20T09:00:00',
    end_time: '2026-08-20T18:00:00',
    location: 'Ernakulam Town Hall',
    impact_level: 'medium' as const,
    description: 'Day-long government conference. Moderate parking pressure around MG Road throughout the day.',
  },
  {
    id: 3,
    name: 'Ernakulam Road Marathon',
    type: 'Sport',
    status: 'possible' as const,
    start_time: '2026-08-21T06:00:00',
    end_time: '2026-08-21T10:00:00',
    location: 'Kaloor – JLN Stadium',
    impact_level: 'high' as const,
    description: 'Marathon route may close several key roads. POSSIBLE event — final approval pending from city authority.',
  },
  {
    id: 4,
    name: 'Aluva Sivarathri Festival',
    type: 'Religious',
    status: 'confirmed' as const,
    start_time: '2026-08-22T18:00:00',
    end_time: '2026-08-23T06:00:00',
    location: 'Aluva Manappuram',
    impact_level: 'high' as const,
    description: 'Annual festival drawing large crowds. Aluva bridge and NH-85 access roads will be heavily congested overnight.',
  },
  {
    id: 5,
    name: 'Vyttila Trade Expo',
    type: 'Exhibition',
    status: 'confirmed' as const,
    start_time: '2026-08-23T10:00:00',
    end_time: '2026-08-25T20:00:00',
    location: 'Vyttila Mobility Hub',
    impact_level: 'medium' as const,
    description: '3-day trade exhibition. Increased bus and auto traffic around Vyttila interchange.',
  },
  {
    id: 6,
    name: 'Edapally IT Summit',
    type: 'Conference',
    status: 'possible' as const,
    start_time: '2026-08-26T09:00:00',
    end_time: '2026-08-26T18:00:00',
    location: 'Edapally Junction Area',
    impact_level: 'low' as const,
    description: 'Tech summit at a nearby convention centre. Low expected traffic impact. POSSIBLE — not yet confirmed.',
  },
]

const IMPACT_BG: Record<string, string> = { high: '#fee2e2', medium: '#fef9c3', low: '#f0fdf4' }
const IMPACT_TEXT: Record<string, string> = { high: '#991b1b', medium: '#854d0e', low: '#15803d' }

function formatDate(ts: string) {
  try { return new Date(ts).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) }
  catch { return ts }
}
function formatTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
  catch { return ts }
}

export default function EventsPage() {
  const confirmed = MOCK_EVENTS.filter(e => e.status === 'confirmed')
  const possible  = MOCK_EVENTS.filter(e => e.status === 'possible')

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '36px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <CalendarDays size={22} color="#c8a97e" />
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: '#2c2825', margin: 0, letterSpacing: '-0.5px' }}>
            Events Affecting Traffic
          </h1>
        </div>

        <p style={{ fontSize: 14, color: '#9e9189', marginBottom: 32, lineHeight: 1.6 }}>
          Upcoming events that may cause congestion or route disruptions. Check before you travel.
        </p>

        {/* Confirmed events */}
        <h2 style={{ fontSize: 14, fontWeight: 800, color: '#2c2825', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Confirmed Events
        </h2>
        <div style={{ display: 'grid', gap: 14, marginBottom: 36 }}>
          {confirmed.map(ev => (
            <div key={ev.id} style={{
              background: 'white', borderRadius: 16, border: '1px solid #e8e0d5',
              padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#2c2825', marginBottom: 4 }}>{ev.name}</div>
                  <div style={{ fontSize: 12, color: '#9e9189', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ev.type}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  background: IMPACT_BG[ev.impact_level], color: IMPACT_TEXT[ev.impact_level],
                  textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                }}>
                  {ev.impact_level} impact
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                  <CalendarDays size={13} /> {formatDate(ev.start_time)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                  <Clock size={13} /> {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                  <MapPin size={13} /> {ev.location}
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, margin: 0 }}>{ev.description}</p>
            </div>
          ))}
        </div>

        {/* Possible / Unconfirmed events */}
        {possible.length > 0 && (
          <>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#854d0e', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ⚠ Possible / Unconfirmed Events
            </h2>
            <div style={{ display: 'grid', gap: 14 }}>
              {possible.map(ev => (
                <div key={ev.id} style={{
                  background: '#fffbeb', borderRadius: 16, border: '1px solid #fde68a',
                  padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#2c2825', marginBottom: 4 }}>{ev.name}</div>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: '#fde68a', color: '#854d0e' }}>
                        POSSIBLE / UNCONFIRMED
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                      background: IMPACT_BG[ev.impact_level], color: IMPACT_TEXT[ev.impact_level],
                      textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                    }}>
                      {ev.impact_level} impact
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                      <CalendarDays size={13} /> {formatDate(ev.start_time)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                      <Clock size={13} /> {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                      <MapPin size={13} /> {ev.location}
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, margin: 0 }}>{ev.description}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
