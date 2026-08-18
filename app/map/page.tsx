'use client'
import { useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Nav } from '@/components/shared/nav'
import { ArrowLeft } from 'lucide-react'

const KEY = '9IjAeUzCf9waJ3H1O3F3e7OprPPecCot'

function MapContent() {
  const params = useSearchParams()
  const router = useRouter()
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fromName = params.get('fromName') || 'Origin'
  const toName = params.get('toName') || 'Destination'

  useEffect(() => {
    const loadMap = () => {
      if (typeof window === 'undefined' || !(window as any).tt || !containerRef.current) return
      
      try {
        const tt = (window as any).tt
        const map = tt.map({
          key: KEY,
          container: containerRef.current,
          center: [76.6214, 10.0601],
          zoom: 13,
          style: 'tomtom://vector/1/basic-main'
        })
        mapRef.current = map

        map.on('load', () => {
          // Add traffic incident layer (Traffic flow layer is sometimes finicky in v6 without services)
          map.addTier(new tt.TrafficIncidentTilesTier({ key: KEY, style: 'tomtom://vector/1/s0' }))

          // Read points from sessionStorage
          const stored = sessionStorage.getItem('selected_route_points')
          if (stored) {
            const pts = JSON.parse(stored)
            if (pts.length > 1) {
              map.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', geometry: { type: 'LineString', coordinates: pts } }
              })
              map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': '#2c2825', 'line-width': 6 }
              })
              map.addLayer({
                id: 'route-line-inner',
                type: 'line',
                source: 'route',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': '#a67c52', 'line-width': 3 }
              })

              const lngs = pts.map((p: number[]) => p[0])
              const lats = pts.map((p: number[]) => p[1])
              map.fitBounds(
                [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
                { padding: 60 }
              )
            }
          }
        })
      } catch (err) {
        console.error('Error loading TomTom map:', err)
      }
    }

    if ((window as any).tt) {
      loadMap()
    } else {
      const script = document.createElement('script')
      script.src = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.23.0/maps/maps-web.min.js'
      script.onload = loadMap
      document.head.appendChild(script)

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.23.0/maps/maps.css'
      document.head.appendChild(link)
    }

    return () => { mapRef.current?.remove?.() }
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#faf8f5', display:'flex', flexDirection:'column' }}>
      <Nav />
      <div style={{ background:'white', borderBottom:'1px solid #e8e0d5', padding:'14px 24px', display:'flex', alignItems:'center', gap:16, zIndex:10 }}>
        <button onClick={() => router.back()} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'#9e9189', fontSize:13, fontWeight:600 }}>
          <ArrowLeft size={14} /> Back to routes
        </button>
        <div style={{ height:20, width:1, background:'#e8e0d5' }} />
        <div style={{ fontSize:13, color:'#2c2825', fontWeight:600 }}>{fromName} → {toName}</div>
      </div>
      <div ref={containerRef} style={{ flex:1, width:'100%' }} />
    </div>
  )
}

export default function MapPage() {
  return <Suspense fallback={<div style={{padding:80,textAlign:'center'}}>Loading map...</div>}><MapContent /></Suspense>
}
