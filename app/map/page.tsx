'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Nav } from '@/components/shared/nav'
import {
  ArrowLeft,
  Layers,
  TrendingUp,
  Gauge,
  Maximize2,
  RefreshCw,
  Navigation,
} from 'lucide-react'
import { useNavigation } from '@/lib/useNavigation'
import { NavigationHUD } from '@/components/navigation/NavigationHUD'

function MapContent() {
  const params = useSearchParams()
  const router = useRouter()
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const polylinesRef = useRef<any[]>([])
  const markersRef = useRef<any[]>([])
  const heatLayerRef = useRef<any>(null)
  const flowTileRef = useRef<any>(null)
  const vehicleMarkerRef = useRef<any>(null)

  const fromName = params.get('fromName') || 'Origin'
  const toName = params.get('toName') || 'Destination'
  const fromLat = params.get('fromLat')
  const fromLon = params.get('fromLon')
  const toLat = params.get('toLat')
  const toLon = params.get('toLon')
  const autoStart = params.get('nav') === 'true'

  const [mapLayerMode, setMapLayerMode] = useState<'hybrid' | 'heatmap' | 'flow'>('hybrid')
  const [routeData, setRouteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  // Turn-by-Turn Driving Navigation Engine
  const { navState, startNavigation, stopNavigation } = useNavigation(KEY)

  // Fetch / restore active route
  useEffect(() => {
    // Check if route was passed in storage
    let storedRoute: any = null
    try {
      const s = localStorage.getItem('active_nav_route')
      if (s) storedRoute = JSON.parse(s)
    } catch (_) {}

    if (storedRoute && storedRoute.legs) {
      setRouteData(storedRoute)
      setLoading(false)
      if (autoStart) {
        const dest = {
          lat: toLat ? parseFloat(toLat) : storedRoute.legs[0].points.slice(-1)[0].latitude,
          lon: toLon ? parseFloat(toLon) : storedRoute.legs[0].points.slice(-1)[0].longitude,
          name: toName,
        }
        startNavigation(storedRoute, dest, false)
      }
      return
    }

    // Otherwise calculate fresh route via TomTom API
    if (fromLat && toLat && fromLon && toLon) {
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json?key=${KEY}&maxAlternatives=1&traffic=true&routeType=fastest&travelMode=car&sectionType=traffic&instructionsType=tagged&computeTravelTimeFor=all`

      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.routes?.[0]) {
            setRouteData(data.routes[0])
            if (autoStart) {
              startNavigation(
                data.routes[0],
                { lat: parseFloat(toLat), lon: parseFloat(toLon), name: toName },
                false
              )
            }
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fromLat, fromLon, toLat, toLon, KEY, autoStart, toName, startNavigation])

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return

    const initMap = (L: any) => {
      if (mapRef.current || !containerRef.current) return

      try {
        if ((containerRef.current as any)._leaflet_id) {
          delete (containerRef.current as any)._leaflet_id
        }

        const centerLat = fromLat ? parseFloat(fromLat) : 10.0601
        const centerLon = fromLon ? parseFloat(fromLon) : 76.6214

        const map = L.map(containerRef.current, {
          center: [centerLat, centerLon],
          zoom: 13,
          zoomControl: false,
        })
        mapRef.current = map

        L.control.zoom({ position: 'bottomright' }).addTo(map)

        // TomTom Base Raster Map
        L.tileLayer(
          `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${KEY}&tileSize=256`,
          {
            attribution: '© <a href="https://www.tomtom.com">TomTom</a>',
            maxZoom: 22,
            tileSize: 256,
          }
        ).addTo(map)

        // TomTom Live Traffic Flow Overlay
        const flowTile = L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${KEY}`,
          { opacity: 0.85, maxZoom: 22 }
        )
        flowTile.addTo(map)
        flowTileRef.current = flowTile

        renderLayers(L, map)
      } catch (err) {
        console.warn('Map initialization error:', err)
      }
    }

    const loadScripts = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const loadHeatPlugin = (L: any) => {
        if ((L as any).heatLayer) {
          initMap(L)
        } else if (!document.getElementById('leaflet-heat-js')) {
          const heatScript = document.createElement('script')
          heatScript.id = 'leaflet-heat-js'
          heatScript.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'
          heatScript.onload = () => initMap(L)
          document.head.appendChild(heatScript)
        } else {
          initMap(L)
        }
      }

      if ((window as any).L) {
        loadHeatPlugin((window as any).L)
      } else {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => loadHeatPlugin((window as any).L)
        document.head.appendChild(script)
      }
    }

    loadScripts()

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch (_) {}
        mapRef.current = null
      }
      if (containerRef.current && (containerRef.current as any)._leaflet_id) {
        delete (containerRef.current as any)._leaflet_id
      }
    }
  }, [fromLat, fromLon, KEY])

  // Render Route and Heatmap Layer
  const renderLayers = (L: any, map: any) => {
    if (!L || !map) return

    // Clear polylines and markers
    polylinesRef.current.forEach((p) => { try { p.remove() } catch (_) {} })
    markersRef.current.forEach((m) => { try { m.remove() } catch (_) {} })
    polylinesRef.current = []
    markersRef.current = []

    if (heatLayerRef.current) {
      try { map.removeLayer(heatLayerRef.current) } catch (_) {}
      heatLayerRef.current = null
    }

    const pts: [number, number][] =
      routeData?.legs?.[0]?.points?.map((p: any) => [p.latitude, p.longitude] as [number, number]) || []

    if (pts.length > 1) {
      // Background Glow
      const glow = L.polyline(pts, {
        color: '#2563eb',
        weight: 12,
        opacity: 0.45,
        lineCap: 'round',
      }).addTo(map)

      // Solid Navigation Highway Line
      const polyline = L.polyline(pts, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.95,
      }).addTo(map)

      polylinesRef.current.push(glow, polyline)

      // Start & End Pins
      const startIcon = L.divIcon({
        html: `<div style="background:#16a34a;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
        className: '',
        iconAnchor: [9, 9],
      })
      const endIcon = L.divIcon({
        html: `<div style="background:#2c2825;width:20px;height:20px;border-radius:50%;border:3px solid #c8a97e;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;border-radius:50%;background:#c8a97e;"></div></div>`,
        className: '',
        iconAnchor: [10, 10],
      })

      const startMarker = L.marker(pts[0], { icon: startIcon }).bindPopup(`<b>Start</b><br/>${fromName}`).addTo(map)
      const endMarker = L.marker(pts[pts.length - 1], { icon: endIcon }).bindPopup(`<b>Destination</b><br/>${toName}`).addTo(map)
      markersRef.current.push(startMarker, endMarker)

      if (!navState.isNavigating) {
        map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 })
      }

      // Sample Heatmap points along the route
      const heatPoints: [number, number, number][] = []
      const step = Math.max(1, Math.floor(pts.length / 40))
      for (let i = 0; i < pts.length; i += step) {
        heatPoints.push([pts[i][0], pts[i][1], 0.65])
      }

      // Fetch and overlay reported local incidents (Temple fest, accident, concert, etc.)
      fetch('/api/incidents')
        .then((r) => r.json())
        .then((incidents: any[]) => {
          if (!Array.isArray(incidents)) return
          incidents.forEach((inc) => {
            if (inc.lat && inc.lon && inc.active) {
              heatPoints.push([inc.lat, inc.lon, 1.0])
              heatPoints.push([inc.lat + 0.002, inc.lon + 0.002, 0.85])
              heatPoints.push([inc.lat - 0.002, inc.lon - 0.002, 0.85])

              let emoji = '⚠️'
              if (inc.category === 'temple_fest') emoji = '🎪'
              else if (inc.category === 'accident') emoji = '💥'
              else if (inc.category === 'concert') emoji = '🎸'
              else if (inc.category === 'construction') emoji = '🚧'
              else if (inc.category === 'weather_hazard') emoji = '⛈️'
              else if (inc.category === 'procession') emoji = '🚩'

              const icon = L.divIcon({
                html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#991b1b;color:white;border:2.5px solid white;border-radius:50%;box-shadow:0 3px 14px rgba(0,0,0,0.5);font-size:18px;">${emoji}</div>`,
                className: '',
                iconSize: [36, 36],
                iconAnchor: [18, 18],
              })

              const m = L.marker([inc.lat, inc.lon], { icon, zIndexOffset: 2000 }).addTo(map)
              m.bindPopup(`
                <div style="font-family:system-ui;min-width:180px">
                  <div style="font-size:10px;font-weight:800;color:#dc2626;text-transform:uppercase;">${emoji} ${inc.title}</div>
                  <div style="color:#b91c1c;font-size:11px;font-weight:800;margin-top:2px;">+${inc.expected_delay_mins} min delay</div>
                  <div style="font-size:11px;color:#4b5563;margin-top:2px;">${inc.description || ''}</div>
                </div>
              `)
              markersRef.current.push(m)
            }
          })
        })
        .catch(() => {})

      if (L.heatLayer && heatPoints.length > 0 && mapLayerMode !== 'flow') {
        const heat = L.heatLayer(heatPoints, {
          radius: 30,
          blur: 22,
          maxZoom: 16,
          max: 1.0,
          gradient: {
            0.2: '#10b981',
            0.4: '#eab308',
            0.6: '#f97316',
            0.8: '#dc2626',
            1.0: '#7f1d1d',
          },
        })
        heat.addTo(map)
        heatLayerRef.current = heat
      }
    }
  }

  // Re-render when route or layer mode changes
  useEffect(() => {
    if (mapRef.current && (window as any).L) {
      renderLayers((window as any).L, mapRef.current)
    }
  }, [routeData, mapLayerMode])

  // Live Location Vehicle Marker & Camera Follow Effect
  useEffect(() => {
    const map = mapRef.current
    const L = (window as any).L
    if (!map || !L) return

    if (!navState.isNavigating || !navState.currentPosition) {
      if (vehicleMarkerRef.current) {
        try {
          vehicleMarkerRef.current.remove()
        } catch (_) {}
        vehicleMarkerRef.current = null
      }
      return
    }

    const { lat, lon, heading } = navState.currentPosition

    const vehicleIconHtml = `
      <div style="
        transform: rotate(${Math.round(heading)}deg);
        width: 48px; height: 48px;
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <div style="
          width: 38px; height: 38px; border-radius: 50%;
          background: #2563eb; border: 3px solid #ffffff;
          box-shadow: 0 0 24px rgba(37,99,235,1), 0 4px 14px rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `

    const vehicleIcon = L.divIcon({
      html: vehicleIconHtml,
      className: '',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    })

    if (!vehicleMarkerRef.current) {
      const marker = L.marker([lat, lon], { icon: vehicleIcon, zIndexOffset: 3000 }).addTo(map)
      vehicleMarkerRef.current = marker
    } else {
      vehicleMarkerRef.current.setLatLng([lat, lon])
      vehicleMarkerRef.current.setIcon(vehicleIcon)
    }

    // Camera follow user vehicle
    map.panTo([lat, lon], { animate: true, duration: 0.8 })
  }, [navState.currentPosition, navState.isNavigating])

  const handleStartNav = () => {
    if (!routeData) return
    const pts = routeData?.legs?.[0]?.points || []
    const dest = {
      lat: toLat ? parseFloat(toLat) : pts[pts.length - 1]?.latitude || 10.0601,
      lon: toLon ? parseFloat(toLon) : pts[pts.length - 1]?.longitude || 76.6214,
      name: toName,
    }
    startNavigation(routeData, dest, false)
  }

  const handleStopNav = () => {
    stopNavigation()
    if (vehicleMarkerRef.current) {
      try { vehicleMarkerRef.current.remove() } catch (_) {}
      vehicleMarkerRef.current = null
    }
    if (mapRef.current && (window as any).L && routeData) {
      const pts = routeData?.legs?.[0]?.points?.map((p: any) => [p.latitude, p.longitude]) || []
      if (pts.length > 0) {
        mapRef.current.fitBounds((window as any).L.latLngBounds(pts), { padding: [60, 60] })
      }
    }
  }

  const handleReroute = () => {
    if (!navState.currentPosition || !toLat || !toLon) return
    const { lat, lon } = navState.currentPosition
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${lat},${lon}:${toLat},${toLon}/json?key=${KEY}&maxAlternatives=1&traffic=true&routeType=fastest&travelMode=car&sectionType=traffic&instructionsType=tagged`

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.[0]) {
          setRouteData(data.routes[0])
          startNavigation(
            data.routes[0],
            { lat: parseFloat(toLat), lon: parseFloat(toLon), name: toName },
            false
          )
        }
      })
  }

  const handleLayerMode = (mode: 'hybrid' | 'heatmap' | 'flow') => {
    setMapLayerMode(mode)
    const map = mapRef.current
    if (!map) return

    if (mode === 'hybrid') {
      if (flowTileRef.current) flowTileRef.current.addTo(map)
    } else if (mode === 'heatmap') {
      if (flowTileRef.current) map.removeLayer(flowTileRef.current)
    } else if (mode === 'flow') {
      if (flowTileRef.current) flowTileRef.current.addTo(map)
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#faf8f5' }}>
      <Nav />

      {/* Top Header Bar */}
      <div
        style={{
          background: 'white',
          borderBottom: '1px solid #e8e0d5',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#9e9189',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <ArrowLeft size={15} /> Back to Routes
          </button>
          <div style={{ height: 20, width: 1, background: '#e8e0d5' }} />
          <div style={{ fontSize: 13, color: '#2c2825', fontWeight: 800 }}>
            {fromName} → <span style={{ color: '#a67c52' }}>{toName}</span>
          </div>
        </div>

        {/* Start / Stop Navigation Top Trigger */}
        {!navState.isNavigating ? (
          <button
            type="button"
            onClick={handleStartNav}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 12,
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            }}
          >
            <Navigation size={15} fill="white" />
            <span>Start Live Navigation</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6, background: '#dcfce7', padding: '4px 10px', borderRadius: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', animation: 'pulse 1.5s infinite' }} />
              Live GPS Tracking Active
            </span>
          </div>
        )}
      </div>

      {/* Fullscreen Map Viewport with HUD Overlay */}
      <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* GOOGLE MAPS NAVIGATION HUD COCKPIT */}
        <NavigationHUD
          navState={navState}
          destinationName={toName}
          onStop={handleStopNav}
          onReroute={handleReroute}
        />

        {/* Floating Layer Controls (visible when not in full active nav or on hover) */}
        {!navState.isNavigating && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 500,
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e8e0d5',
              borderRadius: 12,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <button
              type="button"
              onClick={() => handleLayerMode('hybrid')}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: 'none',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                background: mapLayerMode === 'hybrid' ? '#2c2825' : 'transparent',
                color: mapLayerMode === 'hybrid' ? '#c8a97e' : '#6b625b',
              }}
            >
              Hybrid
            </button>
            <button
              type="button"
              onClick={() => handleLayerMode('heatmap')}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: 'none',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                background: mapLayerMode === 'heatmap' ? '#2c2825' : 'transparent',
                color: mapLayerMode === 'heatmap' ? '#c8a97e' : '#6b625b',
              }}
            >
              Heatmap
            </button>
            <button
              type="button"
              onClick={() => handleLayerMode('flow')}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: 'none',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                background: mapLayerMode === 'flow' ? '#2c2825' : 'transparent',
                color: mapLayerMode === 'flow' ? '#c8a97e' : '#6b625b',
              }}
            >
              Flow
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}>Loading live navigation map...</div>}>
      <MapContent />
    </Suspense>
  )
}
