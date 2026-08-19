'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Nav } from '@/components/shared/nav'
import { AlertTriangle, CheckCircle, ArrowRight, Map } from 'lucide-react'

const FREE_FLOW = 48

// Module-level cache — persists across all client-side navigations within the session
// This is the most reliable way to persist state in Next.js without a global store
let _cachedParams: { fromLat: string, fromLon: string, toLat: string, toLon: string, fromName: string, toName: string } | null = null

const BOTTLENECK_LOCATIONS = [
  { name: 'MC Road Junction (Kothamangalam)', lat: 10.0601, lon: 76.6214, delay: 14, severity: 'Severe' },
  { name: 'Aluva-Munnar Highway (NH 85)', lat: 10.0650, lon: 76.6280, delay: 9, severity: 'Heavy' },
  { name: 'Market Feeder & College Road', lat: 10.0620, lon: 76.6220, delay: 6, severity: 'Moderate' },
]

function getHotspotsForRoute(route: any) {
  const points = route?.legs?.[0]?.points || []
  const sections = route?.sections || route?.legs?.[0]?.sections || []
  const hotspots: { name: string; delay: number; severity: string }[] = []

  // Check TomTom sections
  sections.forEach((sec: any) => {
    if (sec.sectionType === 'TRAFFIC' || sec.simpleCategory === 'JAM' || sec.delayInSeconds > 60) {
      const delayMin = Math.round((sec.delayInSeconds || 120) / 60)
      hotspots.push({
        name: sec.simpleCategory ? `Traffic Jam (${sec.simpleCategory})` : 'Congested Road Segment',
        delay: delayMin,
        severity: delayMin > 8 ? 'Severe' : 'Moderate',
      })
    }
  })

  // Match against known monitored junction bottlenecks along route points
  if (points.length > 0) {
    BOTTLENECK_LOCATIONS.forEach((bn) => {
      const passesNear = points.some((p: any) => {
        const dLat = Math.abs(p.latitude - bn.lat)
        const dLon = Math.abs(p.longitude - bn.lon)
        return dLat < 0.03 && dLon < 0.03
      })
      if (passesNear && !hotspots.some((h) => h.name.includes(bn.name))) {
        hotspots.push({ name: bn.name, delay: bn.delay, severity: bn.severity })
      }
    })
  }

  return hotspots
}

function CongestionBadge({ speed, delay }: { speed: number; delay?: number }) {
  if (delay && delay >= 8) {
    return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}><AlertTriangle size={11} style={{ marginRight: 4, display: 'inline' }} />Severe Traffic (+{delay}m)</span>
  }
  if (delay && delay >= 2) {
    return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef9c3', color: '#854d0e' }}><AlertTriangle size={11} style={{ marginRight: 4, display: 'inline' }} />Moderate Delay (+{delay}m)</span>
  }
  const ratio = speed / FREE_FLOW
  if (ratio >= 0.85) return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}><CheckCircle size={11} style={{ marginRight: 4, display: 'inline' }} />Free Flow</span>
  if (ratio >= 0.6) return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef9c3', color: '#854d0e' }}><AlertTriangle size={11} style={{ marginRight: 4, display: 'inline' }} />Moderate Delay</span>
  return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}><AlertTriangle size={11} style={{ marginRight: 4, display: 'inline' }} />Severe Congestion</span>
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
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json?key=${KEY}&maxAlternatives=2&traffic=true&routeType=fastest&travelMode=car&sectionType=traffic`

    fetch(url)
      .then(r => r.json())
      .then(async data => {
        const rs = data.routes || []
        setRoutes(rs)
        const preds = await fetch('/data/traffic_predictions.json').then(r => r.json()).catch(() => null)
        setForecasts(rs.map((r: any, idx: number) => {
          const summary = r.summary || {}
          const travelTimeSec = summary.travelTimeInSeconds || 1
          const noTrafficSec = summary.noTrafficTravelTimeInSeconds || summary.historicTrafficTravelTimeInSeconds || travelTimeSec
          const trafficDelaySec = summary.trafficDelayInSeconds ?? Math.max(0, travelTimeSec - noTrafficSec)
          const distKm = (summary.lengthInMeters || 0) / 1000

          const liveDelayMins = Math.round(trafficDelaySec / 60)
          const hotspots = getHotspotsForRoute(r)
          const hotspotDelaySum = hotspots.reduce((acc, h) => acc + h.delay, 0)
          const fallbackDelay = preds?.forecast?.[idx]?.delay_mins || 0

          const finalDelay = Math.max(liveDelayMins, hotspotDelaySum, fallbackDelay)

          let speedKmh = 48
          if (distKm > 0 && travelTimeSec > 0) {
            const adjustedTimeSec = travelTimeSec + Math.max(0, finalDelay - liveDelayMins) * 60
            speedKmh = Math.max(14, Math.round(distKm / (adjustedTimeSec / 3600)))
          }

          return {
            predictedSpeed: speedKmh,
            delay: finalDelay,
            hotspots,
          }
        }))
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
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#2c2825' }}>{Math.round(fc?.predictedSpeed || FREE_FLOW)} km/h</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: '#2c2825' }}>Added Delay</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: (fc?.delay || 0) > 3 ? '#ef4444' : '#a67c52' }}>+{Math.round(fc?.delay || 0)} min</span>
                      </div>
                      <div style={{ marginTop: 4 }}><CongestionBadge speed={fc?.predictedSpeed || FREE_FLOW} delay={fc?.delay} /></div>
                    </div>

                    {/* Delay Locations & Hotspots Breakdown */}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e8e0d5' }}>
                      <div style={{ fontSize: 11, color: '#9e9189', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                        Delay Locations on Route
                      </div>
                      {fc?.hotspots && fc.hotspots.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {fc.hotspots.map((hs: any, hIdx: number) => (
                            <div key={hIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, background: 'white', padding: '6px 10px', borderRadius: 8, border: '1px solid #e8e0d5' }}>
                              <span style={{ fontWeight: 600, color: '#2c2825', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                                ⚠️ {hs.name}
                              </span>
                              <span style={{ fontWeight: 800, color: hs.severity === 'Severe' ? '#dc2626' : '#a67c52', flexShrink: 0 }}>
                                +{hs.delay} min
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> Clear of bottleneck hotspots
                        </div>
                      )}
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
