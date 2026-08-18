'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Nav } from '@/components/shared/nav'
import { Clock, Gauge, AlertTriangle, CheckCircle, ArrowRight, Map } from 'lucide-react'

const FREE_FLOW = 48

function CongestionBadge({ speed }: { speed: number }) {
  const ratio = speed / FREE_FLOW
  if(ratio >= 0.8) return <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11,
    fontWeight:700, background:'#dcfce7', color:'#15803d' }}>
    <CheckCircle size={11} style={{ marginRight:4, display:'inline' }} />Free Flow
  </span>
  if(ratio >= 0.5) return <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11,
    fontWeight:700, background:'#fef9c3', color:'#854d0e' }}>
    <AlertTriangle size={11} style={{ marginRight:4, display:'inline' }} />Moderate
  </span>
  return <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11,
    fontWeight:700, background:'#fee2e2', color:'#991b1b' }}>
    <AlertTriangle size={11} style={{ marginRight:4, display:'inline' }} />Likely Congested
  </span>
}

function RoutesContent() {
  const params = useSearchParams()
  const router = useRouter()
  const fromLat = params.get('fromLat'), fromLon = params.get('fromLon')
  const toLat = params.get('toLat'), toLon = params.get('toLon')
  const fromName = params.get('fromName') || 'Origin'
  const toName = params.get('toName') || 'Destination'

  const [routes, setRoutes] = useState<any[]>([])
  const [forecasts, setForecasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // If no params, try to restore last route from sessionStorage
    if (!fromLat || !toLat) {
      const saved = sessionStorage.getItem('last_route_url')
      if (saved) {
        router.replace(saved)
      } else {
        setLoading(false)
        setError('No route selected. Go to Plan Route to search.')
      }
      return
    }
    const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ''
    if (!KEY) { setError('TomTom API key not configured.'); setLoading(false); return }
    setLoading(true)
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json?key=${KEY}&maxAlternatives=2&traffic=true&routeType=fastest&travelMode=car`
    fetch(url).then(r=>r.json()).then(async data => {
      const rs = data.routes || []
      setRoutes(rs)
      // Generic ML forecast logic: no sensor check needed.
      const preds = await fetch('/data/traffic_predictions.json').then(r=>r.json()).catch(()=>null)
      const fc = rs.map(() => {
        const forecast = preds?.forecast?.[0]
        const predictedSpeed = forecast?.predicted_speed || FREE_FLOW
        return { predictedSpeed, delay: forecast?.delay_mins || 0 }
      })
      setForecasts(fc)
      setLoading(false)
    }).catch(e => { setError('Failed to load routes. Check your API key.'); setLoading(false) })
  }, [fromLat, toLat])

  const handleViewMap = (idx: number) => {
    const route = routes[idx]
    const pts = (route?.legs?.[0]?.points || []).map((p:any) => [p.longitude, p.latitude])
    // Use sessionStorage instead of URL to avoid URL length limits
    sessionStorage.setItem('selected_route_points', JSON.stringify(pts))
    router.push(`/map?fromName=${encodeURIComponent(fromName)}&toName=${encodeURIComponent(toName)}`)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#faf8f5' }}>
      <Nav />
      <main style={{ maxWidth:880, margin:'0 auto', padding:'48px 24px 80px' }}>
        <div style={{ marginBottom:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13,
            color:'#9e9189', marginBottom:12 }}>
            <span style={{ background:'#e8e0d5', borderRadius:6, padding:'3px 8px', fontWeight:600 }}>{fromName}</span>
            <ArrowRight size={12} />
            <span style={{ background:'#2c2825', color:'#c8a97e', borderRadius:6, padding:'3px 8px', fontWeight:600 }}>{toName}</span>
          </div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#2c2825', letterSpacing:'-0.5px' }}>
            Route Options
          </h1>
        </div>

        {loading && <div style={{textAlign:'center', padding:40}}>Calculating routes...</div>}
        {error && <p style={{ color:'#ef4444', padding:20 }}>{error}</p>}

        {!loading && routes.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {routes.map((route, i) => {
              const summary = route.summary || {}
              const etaMins = Math.round((summary.travelTimeInSeconds || 0) / 60)
              const distKm = ((summary.lengthInMeters || 0) / 1000).toFixed(1)
              const fc = forecasts[i]

              return (
                <div key={i} style={{ background:'white', borderRadius:20, border: i===0 ? '2px solid #a67c52' : '1px solid #e8e0d5', padding:24, display:'flex', flexDirection:'column', gap:20 }}>
                  <div>
                    <div style={{ fontSize:12, color:'#9e9189', fontWeight:700, textTransform:'uppercase' }}>Route {i+1}</div>
                    <div style={{ fontSize:36, fontWeight:900, color:'#2c2825', lineHeight:1 }}>
                      {etaMins} <span style={{ fontSize:16, fontWeight:500, color:'#9e9189' }}>min</span>
                    </div>
                    <div style={{ fontSize:13, color:'#9e9189', marginTop:6 }}>{distKm} km · TomTom live ETA</div>
                  </div>

                  <div style={{ background:'#f5f2ee', borderRadius:12, padding:16 }}>
                    <div style={{ fontSize:11, color:'#9e9189', fontWeight:700, textTransform:'uppercase', marginBottom:10 }}>ML Congestion Forecast</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:13, color:'#2c2825' }}>Predicted Speed</span>
                        <span style={{ fontSize:15, fontWeight:800, color:'#2c2825' }}>{Math.round(fc.predictedSpeed)} mph</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:13, color:'#2c2825' }}>Added Delay</span>
                        <span style={{ fontSize:15, fontWeight:800, color: fc.delay > 5 ? '#ef4444' : '#a67c52' }}>+{Math.round(fc.delay)} min</span>
                      </div>
                      <div style={{ marginTop:4 }}><CongestionBadge speed={fc.predictedSpeed} /></div>
                    </div>
                  </div>

                  <button onClick={() => handleViewMap(i)} style={{ marginTop:'auto', padding:'12px 16px', borderRadius:12, background:'#2c2825', color:'#c8a97e', border:'none', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
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
  return <Suspense fallback={<div style={{padding:80,textAlign:'center'}}>Loading...</div>}><RoutesContent /></Suspense>
}
