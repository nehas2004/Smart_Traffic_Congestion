'use client'
import { useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Nav } from '@/components/shared/nav'
import { ArrowLeft } from 'lucide-react'

function MapContent() {
  const params = useSearchParams()
  const router = useRouter()
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fromName = params.get('fromName') || 'Origin'
  const toName = params.get('toName') || 'Destination'

  useEffect(() => {
    const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ''
    if (!containerRef.current) return

    const initMap = (L: any) => {
      if (mapRef.current || !containerRef.current) return

      try {
        if ((containerRef.current as any)._leaflet_id) {
          delete (containerRef.current as any)._leaflet_id
        }

        const map = L.map(containerRef.current, {
          center: [10.0601, 76.6214],
          zoom: 13,
          zoomControl: true,
        })
        mapRef.current = map

        // TomTom raster tile API (uses your API key)
        L.tileLayer(
          `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${KEY}&tileSize=256`,
          {
            attribution: '© <a href="https://www.tomtom.com">TomTom</a>',
            maxZoom: 22,
            tileSize: 256,
          }
        ).addTo(map)

        // TomTom traffic flow overlay (uses your API key)
        L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${KEY}`,
          { opacity: 0.7, maxZoom: 22 }
        ).addTo(map)

        // Draw route line — try localStorage then sessionStorage
        const stored = (() => {
          try { return localStorage.getItem('flowcast_route_points') || sessionStorage.getItem('selected_route_points') } catch (_) { return null }
        })()
        if (stored) {
          try {
            const pts: number[][] = JSON.parse(stored)
            if (pts.length > 1) {
              const latLngs = pts.map((p) => [p[1], p[0]] as [number, number])
              L.polyline(latLngs, { color: '#2c2825', weight: 8, opacity: 0.9 }).addTo(map)
              L.polyline(latLngs, { color: '#c8a97e', weight: 4, opacity: 1 }).addTo(map)

              const startIcon = L.divIcon({
                html: `<div style="background:#4caf7d;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
                className: '', iconAnchor: [7, 7],
              })
              const endIcon = L.divIcon({
                html: `<div style="background:#c8a97e;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
                className: '', iconAnchor: [7, 7],
              })
              L.marker(latLngs[0], { icon: startIcon }).bindPopup(`<b>Start</b><br/>${fromName}`).addTo(map)
              L.marker(latLngs[latLngs.length - 1], { icon: endIcon }).bindPopup(`<b>End</b><br/>${toName}`).addTo(map)
              map.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60] })
            }
          } catch (_) {}
        }
      } catch (err) {
        console.warn('MapPage initMap error:', err)
      }
    }

    const load = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      if ((window as any).L) {
        initMap((window as any).L)
      } else {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => initMap((window as any).L)
        document.head.appendChild(script)
      }
    }

    load()
    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove() } catch (_) {}
        mapRef.current = null
      }
      if (containerRef.current && (containerRef.current as any)._leaflet_id) {
        delete (containerRef.current as any)._leaflet_id
      }
    }
  }, [fromName, toName])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#faf8f5' }}>
      <Nav />
      <div style={{ background: 'white', borderBottom: '1px solid #e8e0d5', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#9e9189', fontSize: 13, fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to routes
        </button>
        <div style={{ height: 20, width: 1, background: '#e8e0d5' }} />
        <div style={{ fontSize: 13, color: '#2c2825', fontWeight: 600 }}>{fromName} → {toName}</div>
      </div>
      <div ref={containerRef} style={{ flex: 1, width: '100%', minHeight: 0 }} />
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}>Loading map...</div>}>
      <MapContent />
    </Suspense>
  )
}
