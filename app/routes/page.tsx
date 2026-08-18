'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Nav } from '@/components/shared/nav'
import { AlertTriangle, CheckCircle, ArrowRight, Map } from 'lucide-react'

const FREE_FLOW = 48

// Module-level cache — persists across all client-side navigations within the session
// This is the most reliable way to persist state in Next.js without a global store
let _cachedParams: { fromLat: string, fromLon: string, toLat: string, toLon: string, fromName: string, toName: string } | null = null

function CongestionBadge({ speed }: { speed: number }) {
  const ratio = speed / FREE_FLOW
  if (ratio >= 0.8) return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}><CheckCircle size={11} style={{ marginRight: 4, display: 'inline' }} />Free Flow</span>
  if (ratio >= 0.5) return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef9c3', color: '#854d0e' }}><AlertTriangle size={11} style={{ marginRight: 4, display: 'inline' }} />Moderate</span>
  return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}><AlertTriangle size={11} style={{ marginRight: 4, display: 'inline' }} />Likely Congested</span>
}

function RoutesContent() {
  const params = useSearchParams()
  const router = useRouter()

  // Resolve params: URL → module cache → localStorage
  const urlFromLat = params.get('fromLat')
  const urlToLat = params.get('toLat')

  if (urlFromLat && urlToLat) {
    // Save to cache whenever we have URL params
    _cachedParams = {
      fromLat: urlFromLat,
      fromLon: params.get('fromLon') || '',
      toLat: urlToLat,
      toLon: params.get('toLon') || '',
      fromName: params.get('fromName') || 'Origin',
      toName: params.get('toName') || 'Destination',
    }
    try { localStorage.setItem('flowcast_route', JSON.stringify(_cachedParams)) } catch (_) {}
  }

  // Use URL params, or fall back to module cache, or fall back to localStorage
  const activeParams = (urlFromLat && urlToLat)
    ? _cachedParams
    : _cachedParams || (() => {
        try {
          const s = localStorage.getItem('flowcast_route')
          if (s) { _cachedParams = JSON.parse(s); return _cachedParams }
        } catch (_) {}
        return null
      })()

  const fromName = activeParams?.fromName || 'Origin'
  const toName = activeParams?.toName || 'Destination'

  const [routes, setRoutes] = useState<any[]>([])
  const [forecasts, setForecasts] = useState<any[]>([])
  const [loading, setLoading] = useState(!!activeParams)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeParams?.fromLat || !activeParams?.toLat) return
    const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ''
    if (!KEY) { setError('TomTom API key not configured.'); setLoading(false); return }

    setLoading(true)
    setError('')
    const { fromLat, fromLon, toLat, toLon } = activeParams
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json?key=${KEY}&maxAlternatives=2&traffic=true&routeType=fastest&travelMode=car`

    fetch(url)
      .then(r => r.json())
      .then(async data => {
        const rs = data.routes || []
        setRoutes(rs)
        const preds = await fetch('/data/traffic_predictions.json').then(r => r.json()).catch(() => null)
        setForecasts(rs.map(() => ({
          predictedSpeed: preds?.forecast?.[0]?.predicted_speed || FREE_FLOW,
          delay: preds?.forecast?.[0]?.delay_mins || 0,
        })))
        setLoading(false)
      })
      .catch(() => { setError('Failed to load routes. Check your API key.'); setLoading(false) })
  // Only re-fetch when the actual lat/lon change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeParams?.fromLat, activeParams?.toLat])

  const handleViewMap = (idx: number) => {
    const route = routes[idx]
    const pts = (route?.legs?.[0]?.points || []).map((p: any) => [p.longitude, p.latitude])
    try { localStorage.setItem('flowcast_route_points', JSON.stringify(pts)) } catch (_) {}
    router.push(`/map?fromName=${encodeURIComponent(fromName)}&toName=${encodeURIComponent(toName)}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
      <Nav />
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9e9189', marginBottom: 12 }}>
            <span style={{ background: '#e8e0d5', borderRadius: 6, padding: '3px 8px', fontWeight: 600 }}>{fromName}</span>
            <ArrowRight size={12} />
            <span style={{ background: '#2c2825', color: '#c8a97e', borderRadius: 6, padding: '3px 8px', fontWeight: 600 }}>{toName}</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#2c2825', letterSpacing: '-0.5px' }}>Route Options</h1>
        </div>

        {!activeParams && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9e9189' }}>
            <p style={{ fontSize: 15, marginBottom: 16 }}>No route selected yet.</p>
            <button onClick={() => router.push('/search')} style={{ padding: '10px 24px', borderRadius: 10, background: '#2c2825', color: '#c8a97e', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              Plan a Route
            </button>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#9e9189' }}>Calculating routes...</div>}
        {error && <p style={{ color: '#ef4444', padding: 20 }}>{error}</p>}

        {!loading && routes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {routes.map((route, i) => {
              const summary = route.summary || {}
              const etaMins = Math.round((summary.travelTimeInSeconds || 0) / 60)
              const distKm = ((summary.lengthInMeters || 0) / 1000).toFixed(1)
              const fc = forecasts[i]
              return (
                <div key={i} style={{ background: 'white', borderRadius: 20, border: i === 0 ? '2px solid #a67c52' : '1px solid #e8e0d5', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#9e9189', fontWeight: 700, textTransform: 'uppercase' }}>Route {i + 1}{i === 0 ? ' · Recommended' : ' · Alternate'}</div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: '#2c2825', lineHeight: 1 }}>
                      {etaMins} <span style={{ fontSize: 16, fontWeight: 500, color: '#9e9189' }}>min</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#9e9189', marginTop: 6 }}>{distKm} km · TomTom live ETA</div>
                  </div>
                  <div style={{ background: '#f5f2ee', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: '#9e9189', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>ML Congestion Forecast</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: '#2c2825' }}>Predicted Speed</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#2c2825' }}>{Math.round(fc?.predictedSpeed || FREE_FLOW)} mph</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: '#2c2825' }}>Added Delay</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: (fc?.delay || 0) > 5 ? '#ef4444' : '#a67c52' }}>+{Math.round(fc?.delay || 0)} min</span>
                      </div>
                      <div style={{ marginTop: 4 }}><CongestionBadge speed={fc?.predictedSpeed || FREE_FLOW} /></div>
                    </div>
                  </div>
                  <button onClick={() => handleViewMap(i)} style={{ marginTop: 'auto', padding: '12px 16px', borderRadius: 12, background: '#2c2825', color: '#c8a97e', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Map size={14} /> View on Map
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default function RoutesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}>Loading...</div>}>
      <RoutesContent />
    </Suspense>
  )
}
