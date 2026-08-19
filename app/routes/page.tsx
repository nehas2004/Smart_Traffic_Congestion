'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Nav } from '@/components/shared/nav'
import {
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Map as MapIcon,
  Layers,
  Flame,
  Gauge,
  Clock,
  Navigation,
  Sparkles,
  Maximize2,
  RefreshCw,
  Search,
} from 'lucide-react'

const FREE_FLOW = 48

let _cachedParams: {
  fromLat: string
  fromLon: string
  toLat: string
  toLon: string
  fromName: string
  toName: string
} | null = null

const BOTTLENECK_LOCATIONS = [
  { name: 'MC Road Junction (Kothamangalam)', lat: 10.0601, lon: 76.6214, delay: 14, severity: 'Severe', intensity: 0.95 },
  { name: 'Aluva-Munnar Highway (NH 85)', lat: 10.0650, lon: 76.6280, delay: 9, severity: 'Heavy', intensity: 0.8 },
  { name: 'Market Feeder & College Road', lat: 10.0620, lon: 76.6220, delay: 6, severity: 'Moderate', intensity: 0.6 },
  { name: 'Kaloor Junction', lat: 10.0126, lon: 76.3084, delay: 12, severity: 'Severe', intensity: 0.92 },
  { name: 'Edapally Toll', lat: 10.0228, lon: 76.3083, delay: 8, severity: 'Heavy', intensity: 0.75 },
  { name: 'Vyttila Mobility Hub', lat: 9.9717, lon: 76.3106, delay: 5, severity: 'Moderate', intensity: 0.55 },
  { name: 'Thrissur Round', lat: 10.5248, lon: 76.2130, delay: 15, severity: 'Severe', intensity: 0.98 },
  { name: 'Pattom Junction', lat: 8.5245, lon: 76.9360, delay: 11, severity: 'Severe', intensity: 0.88 },
]

function getHotspotsForRoute(route: any) {
  const points = route?.legs?.[0]?.points || []
  const sections = route?.sections || route?.legs?.[0]?.sections || []
  const hotspots: { name: string; delay: number; severity: string; lat?: number; lon?: number; intensity: number }[] = []

  sections.forEach((sec: any) => {
    if (sec.sectionType === 'TRAFFIC' || sec.simpleCategory === 'JAM' || sec.delayInSeconds > 60) {
      const delayMin = Math.round((sec.delayInSeconds || 120) / 60)
      const secPoints = points.slice(sec.startPointIndex || 0, (sec.endPointIndex || points.length) + 1)
      const midPoint = secPoints[Math.floor(secPoints.length / 2)] || points[0]
      hotspots.push({
        name: sec.simpleCategory ? `Traffic Jam (${sec.simpleCategory})` : 'Congested Road Segment',
        delay: delayMin,
        severity: delayMin > 8 ? 'Severe' : 'Moderate',
        lat: midPoint?.latitude,
        lon: midPoint?.longitude,
        intensity: delayMin > 8 ? 0.92 : 0.65,
      })
    }
  })

  if (points.length > 0) {
    BOTTLENECK_LOCATIONS.forEach((bn) => {
      const passesNear = points.some((p: any) => {
        const dLat = Math.abs(p.latitude - bn.lat)
        const dLon = Math.abs(p.longitude - bn.lon)
        return dLat < 0.035 && dLon < 0.035
      })
      if (passesNear && !hotspots.some((h) => h.name.includes(bn.name))) {
        hotspots.push({
          name: bn.name,
          delay: bn.delay,
          severity: bn.severity,
          lat: bn.lat,
          lon: bn.lon,
          intensity: bn.intensity,
        })
      }
    })
  }

  return hotspots
}

function CongestionBadge({ speed, delay }: { speed: number; delay?: number }) {
  if (delay && delay >= 8) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>
        <AlertTriangle size={11} /> Severe Traffic (+{delay}m)
      </span>
    )
  }
  if (delay && delay >= 2) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef9c3', color: '#854d0e' }}>
        <AlertTriangle size={11} /> Moderate Delay (+{delay}m)
      </span>
    )
  }
  const ratio = speed / FREE_FLOW
  if (ratio >= 0.85) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
        <CheckCircle size={11} /> Free Flow
      </span>
    )
  }
  if (ratio >= 0.6) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef9c3', color: '#854d0e' }}>
        <AlertTriangle size={11} /> Moderate Delay
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>
      <AlertTriangle size={11} /> Severe Congestion
    </span>
  )
}

function RoutesContent() {
  const params = useSearchParams()
  const router = useRouter()

  const urlFromLat = params.get('fromLat')
  const urlToLat = params.get('toLat')

  if (urlFromLat && urlToLat) {
    _cachedParams = {
      fromLat: urlFromLat,
      fromLon: params.get('fromLon') || '',
      toLat: urlToLat,
      toLon: params.get('toLon') || '',
      fromName: params.get('fromName') || 'Origin',
      toName: params.get('toName') || 'Destination',
    }
    try {
      localStorage.setItem('flowcast_route', JSON.stringify(_cachedParams))
    } catch (_) {}
  }

  const activeParams =
    urlFromLat && urlToLat
      ? _cachedParams
      : _cachedParams ||
        (() => {
          try {
            const s = localStorage.getItem('flowcast_route')
            if (s) {
              _cachedParams = JSON.parse(s)
              return _cachedParams
            }
          } catch (_) {}
          return null
        })()

  const fromName = activeParams?.fromName || 'Origin'
  const toName = activeParams?.toName || 'Destination'

  const [routes, setRoutes] = useState<any[]>([])
  const [forecasts, setForecasts] = useState<any[]>([])
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0)
  const [loading, setLoading] = useState(!!activeParams)
  const [error, setError] = useState('')

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const polylinesRef = useRef<any[]>([])
  const markersRef = useRef<any[]>([])
  const heatLayerRef = useRef<any>(null)
  const flowTileRef = useRef<any>(null)

  const [mapLayerMode, setMapLayerMode] = useState<'hybrid' | 'heatmap' | 'flow'>('hybrid')
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showFlow, setShowFlow] = useState(true)

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  // Fetch routes from TomTom Routing API with turn-by-turn maneuvers
  useEffect(() => {
    if (!activeParams?.fromLat || !activeParams?.toLat) return
    if (!KEY) {
      setError('TomTom API key not configured.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const { fromLat, fromLon, toLat, toLon } = activeParams
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json?key=${KEY}&maxAlternatives=2&traffic=true&routeType=fastest&travelMode=car&sectionType=traffic&instructionsType=tagged&computeTravelTimeFor=all`

    fetch(url)
      .then((r) => r.json())
      .then(async (data) => {
        const rs = data.routes || []
        setRoutes(rs)
        const [preds, incidents] = await Promise.all([
          fetch('/data/traffic_predictions.json').then((r) => r.json()).catch(() => null),
          fetch('/api/incidents').then((r) => r.json()).catch(() => []),
        ])

        setForecasts(
          rs.map((r: any, idx: number) => {
            const summary = r.summary || {}
            const travelTimeSec = summary.travelTimeInSeconds || 1
            const noTrafficSec =
              summary.noTrafficTravelTimeInSeconds ||
              summary.historicTrafficTravelTimeInSeconds ||
              travelTimeSec
            const trafficDelaySec =
              summary.trafficDelayInSeconds ?? Math.max(0, travelTimeSec - noTrafficSec)
            const distKm = (summary.lengthInMeters || 0) / 1000

            const liveDelayMins = Math.round(trafficDelaySec / 60)
            const hotspots = getHotspotsForRoute(r)
            const hotspotDelaySum = hotspots.reduce((acc, h) => acc + h.delay, 0)
            const fallbackDelay = preds?.forecast?.[idx]?.delay_mins || 0

            // Check if any reported local incidents (Temple Fest, Accident, Concert, etc.) lie near route points
            const pts = (r?.legs?.[0]?.points || []).map((p: any) => [p.latitude, p.longitude])
            const matchingIncidents: any[] = []
            let incidentDelaySum = 0

            if (Array.isArray(incidents)) {
              incidents.forEach((inc: any) => {
                if (!inc.active || !inc.lat || !inc.lon) return
                const isNear = pts.some((pt: any) => {
                  const dLat = Math.abs(pt[0] - inc.lat)
                  const dLon = Math.abs(pt[1] - inc.lon)
                  return dLat < 0.015 && dLon < 0.015 // ~1.5km
                })
                if (isNear) {
                  matchingIncidents.push(inc)
                  incidentDelaySum += inc.expected_delay_mins || 15
                }
              })
            }

            const finalDelay = Math.max(liveDelayMins + incidentDelaySum, hotspotDelaySum, fallbackDelay)

            let speedKmh = 48
            if (distKm > 0 && travelTimeSec > 0) {
              const adjustedTimeSec = travelTimeSec + Math.max(0, finalDelay - liveDelayMins) * 60
              speedKmh = Math.max(14, Math.round(distKm / (adjustedTimeSec / 3600)))
            }

            return {
              predictedSpeed: speedKmh,
              delay: finalDelay,
              hotspots,
              reportedIncidents: matchingIncidents,
            }
          })
        )
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load routes. Check your connection or API key.')
        setLoading(false)
      })
  }, [activeParams?.fromLat, activeParams?.toLat, KEY])

  // Initialize Leaflet + Leaflet.heat map
  useEffect(() => {
    if (!mapContainerRef.current) return

    const initMap = (L: any) => {
      if (mapRef.current || !mapContainerRef.current) return

      try {
        if ((mapContainerRef.current as any)._leaflet_id) {
          delete (mapContainerRef.current as any)._leaflet_id
        }

        const centerLat = activeParams ? parseFloat(activeParams.fromLat) : 10.0601
        const centerLon = activeParams ? parseFloat(activeParams.fromLon) : 76.6214

        const map = L.map(mapContainerRef.current, {
          center: [centerLat, centerLon],
          zoom: 12,
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

        // TomTom Live Traffic Flow Tile Layer
        const flowTile = L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${KEY}`,
          { opacity: 0.85, maxZoom: 22 }
        )
        flowTile.addTo(map)
        flowTileRef.current = flowTile

        renderMapLayers(L, map)
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
      if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id
      }
    }
  }, [activeParams, KEY])

  // Render Routes, Heatmap, and Markers
  const renderMapLayers = (L: any, map: any) => {
    if (!L || !map) return

    // Clear polylines and markers
    polylinesRef.current.forEach((p) => {
      try {
        p.remove()
      } catch (_) {}
    })
    markersRef.current.forEach((m) => {
      try {
        m.remove()
      } catch (_) {}
    })
    polylinesRef.current = []
    markersRef.current = []

    if (heatLayerRef.current) {
      try {
        map.removeLayer(heatLayerRef.current)
      } catch (_) {}
      heatLayerRef.current = null
    }

    if (!routes || routes.length === 0) return

    const heatPoints: [number, number, number][] = []

    // 1. Draw Routes
    routes.forEach((route, idx) => {
      const isSelected = idx === selectedRouteIdx
      const pts = (route?.legs?.[0]?.points || []).map((p: any) => [p.latitude, p.longitude] as [number, number])
      if (pts.length < 2) return

      const fc = forecasts[idx]
      const delay = fc?.delay || 0
      const routeColor = isSelected
        ? delay > 8
          ? '#dc2626'
          : delay > 3
          ? '#ea580c'
          : '#2c2825'
        : '#9e9189'

      // Background glow for selected route
      if (isSelected) {
        const glow = L.polyline(pts, {
          color: '#c8a97e',
          weight: 12,
          opacity: 0.5,
          lineCap: 'round',
        }).addTo(map)
        polylinesRef.current.push(glow)
      }

      // Core route line
      const polyline = L.polyline(pts, {
        color: routeColor,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 1 : 0.6,
        dashArray: isSelected ? undefined : '6, 6',
      }).addTo(map)

      polyline.on('click', () => {
        setSelectedRouteIdx(idx)
      })

      polyline.bindTooltip(
        `<strong>Route ${idx + 1} (${isSelected ? 'Selected' : 'Alternate'})</strong><br/>` +
          `ETA: ${Math.round((route.summary?.travelTimeInSeconds || 0) / 60)} min · ${((route.summary?.lengthInMeters || 0) / 1000).toFixed(1)} km`,
        { sticky: true }
      )

      polylinesRef.current.push(polyline)

      // Sample route coordinates for Heatmap calculation
      if (isSelected || routes.length === 1) {
        const step = Math.max(1, Math.floor(pts.length / 50))
        const baseIntensity = Math.min(0.9, Math.max(0.2, (delay / 15)))

        for (let i = 0; i < pts.length; i += step) {
          const pt = pts[i]
          heatPoints.push([pt[0], pt[1], baseIntensity])
        }
      }
    })

    // 2. Add Hotspots & Bottlenecks to Heatmap & Markers
    const currentForecast = forecasts[selectedRouteIdx]
    const hotspots = currentForecast?.hotspots || []

    hotspots.forEach((hs: any) => {
      if (hs.lat && hs.lon) {
        // High thermal weight for bottleneck locations
        heatPoints.push([hs.lat, hs.lon, hs.intensity || 0.95])
        heatPoints.push([hs.lat + 0.001, hs.lon + 0.001, hs.intensity ? hs.intensity * 0.8 : 0.75])
        heatPoints.push([hs.lat - 0.001, hs.lon - 0.001, hs.intensity ? hs.intensity * 0.8 : 0.75])

        // Hotspot warning marker
        const warningIcon = L.divIcon({
          html: `
            <div style="
              width: 28px; height: 28px; border-radius: 50%;
              background: #dc2626; color: white;
              display: flex; align-items: center; justify-content: center;
              border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              cursor: pointer;
            ">
              <span style="font-size: 14px; font-weight: 900;">!</span>
            </div>
          `,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const marker = L.marker([hs.lat, hs.lon], { icon: warningIcon }).addTo(map)
        marker.bindPopup(`
          <div style="font-family: system-ui; min-width: 170px; padding: 2px;">
            <div style="font-size: 10px; font-weight: 700; color: #dc2626; text-transform: uppercase;">Traffic Bottleneck</div>
            <div style="font-weight: 800; font-size: 13px; color: #2c2825; margin-top: 2px;">${hs.name}</div>
            <div style="font-size: 12px; color: #dc2626; font-weight: 700; margin-top: 4px;">+${hs.delay} min delay</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Severity: ${hs.severity}</div>
          </div>
        `)
        markersRef.current.push(marker)
      }
    })

    // 3. Render Reported Local Event Incidents (Temple Fest, Accident, Concert, etc.)
    const reportedIncidents = currentForecast?.reportedIncidents || []
    reportedIncidents.forEach((inc: any) => {
      if (inc.lat && inc.lon) {
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

        const incIcon = L.divIcon({
          html: `
            <div style="
              width: 36px; height: 36px; border-radius: 50%;
              background: #991b1b; color: white;
              display: flex; align-items: center; justify-content: center;
              border: 2.5px solid white; box-shadow: 0 4px 14px rgba(220,38,38,0.6);
              cursor: pointer; font-size: 18px; position: relative;
            ">
              <span style="
                position: absolute; inset: -3px; border-radius: 50%;
                border: 2px solid #ef4444; animation: ping 1.2s cubic-bezier(0,0,0.2,1) infinite;
                opacity: 0.85; pointer-events: none;
              "></span>
              <span>${emoji}</span>
            </div>
          `,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })

        const marker = L.marker([inc.lat, inc.lon], { icon: incIcon, zIndexOffset: 2000 }).addTo(map)
        marker.bindPopup(`
          <div style="font-family: system-ui; min-width: 190px; padding: 2px;">
            <div style="font-size: 10px; font-weight: 800; color: #dc2626; text-transform: uppercase;">${emoji} REPORTED EVENT DISRUPTION</div>
            <b style="font-size: 13px; color: #2c2825; display: block; margin-top: 2px;">${inc.title}</b>
            <div style="color: #b91c1c; font-size: 11px; font-weight: 800; margin-top: 4px;">Expected Delay: +${inc.expected_delay_mins} mins</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${inc.description || ''}</div>
          </div>
        `)
        markersRef.current.push(marker)
      }
    })

    // 3. Start & End Origin/Destination Markers
    const selectedRoute = routes[selectedRouteIdx]
    const pts = selectedRoute?.legs?.[0]?.points || []
    if (pts.length > 1) {
      const startPt = [pts[0].latitude, pts[0].longitude] as [number, number]
      const endPt = [pts[pts.length - 1].latitude, pts[pts.length - 1].longitude] as [number, number]

      const startIcon = L.divIcon({
        html: `
          <div style="
            background: #16a34a; width: 18px; height: 18px; border-radius: 50%;
            border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          "></div>
        `,
        className: '',
        iconAnchor: [9, 9],
      })

      const endIcon = L.divIcon({
        html: `
          <div style="
            background: #2c2825; width: 20px; height: 20px; border-radius: 50%;
            border: 3px solid #c8a97e; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex; align-items: center; justify-content: center;
          ">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #c8a97e;"></div>
          </div>
        `,
        className: '',
        iconAnchor: [10, 10],
      })

      const startMarker = L.marker(startPt, { icon: startIcon }).bindPopup(`<b>Origin</b><br/>${fromName}`).addTo(map)
      const endMarker = L.marker(endPt, { icon: endIcon }).bindPopup(`<b>Destination</b><br/>${toName}`).addTo(map)
      markersRef.current.push(startMarker, endMarker)

      // Fit map bounds to the active route
      const latLngs = pts.map((p: any) => [p.latitude, p.longitude])
      map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50], maxZoom: 15 })
    }

    // 4. Render Congestion Heatmap Layer (if heatLayer available)
    if (L.heatLayer && heatPoints.length > 0 && showHeatmap) {
      const heat = L.heatLayer(heatPoints, {
        radius: 28,
        blur: 20,
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

  // Update map whenever routes, selection, or heatmap toggles change
  useEffect(() => {
    if (mapRef.current && (window as any).L) {
      renderMapLayers((window as any).L, mapRef.current)
    }
  }, [routes, selectedRouteIdx, showHeatmap, showFlow, forecasts])

  // Handle Layer Mode Switching (Hybrid, Heatmap Only, Flow Only)
  const handleLayerModeChange = (mode: 'hybrid' | 'heatmap' | 'flow') => {
    setMapLayerMode(mode)
    const map = mapRef.current
    if (!map) return

    if (mode === 'hybrid') {
      setShowHeatmap(true)
      setShowFlow(true)
      if (flowTileRef.current) flowTileRef.current.addTo(map)
    } else if (mode === 'heatmap') {
      setShowHeatmap(true)
      setShowFlow(false)
      if (flowTileRef.current) map.removeLayer(flowTileRef.current)
    } else if (mode === 'flow') {
      setShowHeatmap(false)
      setShowFlow(true)
      if (flowTileRef.current) flowTileRef.current.addTo(map)
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current)
    }
  }

  const handleFitRoute = () => {
    const map = mapRef.current
    const L = (window as any).L
    if (!map || !L || !routes[selectedRouteIdx]) return
    const pts = routes[selectedRouteIdx]?.legs?.[0]?.points || []
    if (pts.length > 0) {
      const latLngs = pts.map((p: any) => [p.latitude, p.longitude])
      map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] })
    }
  }

  // Start Turn-by-Turn Navigation on Live Map
  const handleStartNav = (route: any) => {
    if (!activeParams) return
    const { fromLat, fromLon, toLat, toLon } = activeParams
    try {
      localStorage.setItem('active_nav_route', JSON.stringify(route))
      const pts = route?.legs?.[0]?.points?.map((p: any) => [p.longitude, p.latitude]) || []
      localStorage.setItem('flowcast_route_points', JSON.stringify(pts))
    } catch (_) {}

    router.push(
      `/map?fromLat=${fromLat}&fromLon=${fromLon}&toLat=${toLat}&toLon=${toLon}&fromName=${encodeURIComponent(fromName)}&toName=${encodeURIComponent(toName)}&nav=true`
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      {/* Subheader / Route Information Banner */}
      <header
        style={{
          background: 'white',
          borderBottom: '1px solid #e8e0d5',
          padding: '14px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => router.push('/search')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #e8e0d5',
                background: '#faf8f5',
                color: '#2c2825',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Search size={13} color="#a67c52" /> Edit Route
            </button>

            <div style={{ height: 20, width: 1, background: '#e8e0d5' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span style={{ background: '#f5f2ee', borderRadius: 6, padding: '3px 9px', fontWeight: 700, color: '#2c2825' }}>
                {fromName}
              </span>
              <ArrowRight size={13} color="#a67c52" />
              <span style={{ background: '#2c2825', color: '#c8a97e', borderRadius: 6, padding: '3px 9px', fontWeight: 700 }}>
                {toName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#9e9189', fontWeight: 600 }}>
              {routes.length > 0 ? `${routes.length} Route Options Generated` : 'Calculating...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Side-by-Side Viewport */}
      <main
        style={{
          maxWidth: 1600,
          width: '100%',
          margin: '0 auto',
          padding: '20px 24px 40px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!activeParams && (
          <div style={{ textAlign: 'center', padding: 80, color: '#9e9189' }}>
            <Navigation size={36} color="#c8a97e" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#2c2825', marginBottom: 8 }}>No Route Selected</h2>
            <p style={{ fontSize: 14, marginBottom: 20 }}>Select an origin and destination to calculate routes and live heatmaps.</p>
            <button
              onClick={() => router.push('/search')}
              style={{
                padding: '12px 28px',
                borderRadius: 12,
                background: '#2c2825',
                color: '#c8a97e',
                border: 'none',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Plan a Route
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9e9189' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#a67c52' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#2c2825' }}>Calculating live routes & congestion heatmaps...</p>
          </div>
        )}

        {error && <p style={{ color: '#ef4444', padding: 20, textAlign: 'center' }}>{error}</p>}

        {!loading && routes.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(380px, 460px) 1fr',
              gap: 24,
              alignItems: 'stretch',
              flex: 1,
              minHeight: 'calc(100vh - 160px)',
            }}
          >
            {/* LEFT COLUMN: ROUTE OPTIONS & ML FORECAST CARDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: '#2c2825', margin: 0 }}>
                  Available Routes
                </h1>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#a67c52', background: '#f5f2ee', padding: '3px 8px', borderRadius: 6 }}>
                  TomTom Real-Time Routing
                </span>
              </div>

              {routes.map((route, idx) => {
                const summary = route.summary || {}
                const etaMins = Math.round((summary.travelTimeInSeconds || 0) / 60)
                const distKm = ((summary.lengthInMeters || 0) / 1000).toFixed(1)
                const fc = forecasts[idx]
                const isSelected = selectedRouteIdx === idx

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedRouteIdx(idx)}
                    style={{
                      background: 'white',
                      borderRadius: 18,
                      border: isSelected ? '2px solid #a67c52' : '1px solid #e8e0d5',
                      padding: 20,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 8px 24px rgba(166,124,82,0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: isSelected ? '#a67c52' : '#9e9189',
                              letterSpacing: '0.05em',
                            }}
                          >
                            Route {idx + 1} {idx === 0 ? '· Recommended' : '· Alternate'}
                          </span>
                          {isSelected && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                background: '#2c2825',
                                color: '#c8a97e',
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              ACTIVE ON MAP
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 32, fontWeight: 900, color: '#2c2825', lineHeight: 1 }}>{etaMins}</span>
                          <span style={{ fontSize: 15, fontWeight: 600, color: '#9e9189' }}>min</span>
                          <span style={{ color: '#e8e0d5', margin: '0 4px' }}>·</span>
                          <span style={{ fontSize: 13, color: '#6b625b', fontWeight: 600 }}>{distKm} km</span>
                        </div>
                      </div>

                      <CongestionBadge speed={fc?.predictedSpeed || FREE_FLOW} delay={fc?.delay} />
                    </div>

                    {/* ML Congestion Forecast Details */}
                    <div
                      style={{
                        background: '#faf8f5',
                        borderRadius: 12,
                        border: '1px solid #f0ece7',
                        padding: 12,
                        marginTop: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: '#9e9189', fontWeight: 600 }}>Predicted Segment Speed</span>
                        <span style={{ fontWeight: 800, color: '#2c2825' }}>
                          {Math.round(fc?.predictedSpeed || FREE_FLOW)} km/h
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#9e9189', fontWeight: 600 }}>Traffic Bottleneck Delay</span>
                        <span style={{ fontWeight: 800, color: (fc?.delay || 0) > 3 ? '#dc2626' : '#16a34a' }}>
                          +{(fc?.delay || 0)} min
                        </span>
                      </div>

                      {/* Hotspots & Delay Breakdown */}
                      {fc?.hotspots && fc.hotspots.length > 0 ? (
                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e8e0d5' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#9e9189' }}>
                            Bottlenecks On Route ({fc.hotspots.length})
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                            {fc.hotspots.map((hs: any, hIdx: number) => (
                              <div
                                key={hIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: 11,
                                  background: 'white',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #e8e0d5',
                                }}
                              >
                                <span style={{ fontWeight: 600, color: '#2c2825', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                  ⚠️ {hs.name}
                                </span>
                                <span style={{ fontWeight: 800, color: hs.severity === 'Severe' ? '#dc2626' : '#ea580c' }}>
                                  +{hs.delay}m
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                          <CheckCircle size={12} /> Clear route with minimal delay
                        </div>
                      )}

                      {/* Active Local Event / Disruption Warning Banner */}
                      {fc?.reportedIncidents && fc.reportedIncidents.length > 0 && (
                        <div
                          style={{
                            marginTop: 10,
                            background: '#fef2f2',
                            border: '1.5px solid #fca5a5',
                            borderRadius: 12,
                            padding: '10px 12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#dc2626' }}>
                            <span>🚨 REPORTED EVENT / DISRUPTION ON THIS ROUTE</span>
                          </div>
                          {fc.reportedIncidents.map((inc: any, i: number) => {
                            let emoji = '⚠️'
                            if (inc.category === 'temple_fest') emoji = '🎪'
                            else if (inc.category === 'accident') emoji = '💥'
                            else if (inc.category === 'concert') emoji = '🎸'
                            else if (inc.category === 'construction') emoji = '🚧'
                            else if (inc.category === 'weather_hazard') emoji = '⛈️'
                            else if (inc.category === 'procession') emoji = '🚩'

                            return (
                              <div key={i} style={{ marginTop: 6, fontSize: 12 }}>
                                <div style={{ fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span>{emoji}</span>
                                  <span>{inc.title}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 2, fontWeight: 600 }}>
                                  +{inc.expected_delay_mins} min delay expected · {inc.description}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Google Maps Style "Start Turn-by-Turn Navigation" */}
                    <div style={{ marginTop: 14 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedRouteIdx(idx)
                          handleStartNav(route)
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '14px 18px',
                          borderRadius: 14,
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 14,
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Navigation size={16} fill="white" />
                        <span>Start Navigation</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* RIGHT COLUMN: INTERACTIVE TOMTOM MAP WITH HEATMAPS & CONTROLS */}
            <div
              style={{
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                border: '1px solid #e8e0d5',
                background: 'white',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                minHeight: 520,
              }}
            >
              {/* Map Floating Header Toolbar */}
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  right: 14,
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  pointerEvents: 'none',
                }}
              >
                {/* Layer Mode Selector */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #e8e0d5',
                    borderRadius: 12,
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    pointerEvents: 'auto',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleLayerModeChange('hybrid')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
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
                    <Layers size={13} /> Hybrid
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLayerModeChange('heatmap')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
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
                    <Flame size={13} /> Congestion Heatmap
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLayerModeChange('flow')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
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
                    <Gauge size={13} /> Live Flow
                  </button>
                </div>

                {/* Focus Route Bounds Button */}
                <button
                  type="button"
                  onClick={handleFitRoute}
                  style={{
                    background: 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #e8e0d5',
                    borderRadius: 10,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#2c2825',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                >
                  <Maximize2 size={13} /> Focus Route
                </button>
              </div>

              {/* Map Leaflet Container */}
              <div ref={mapContainerRef} style={{ flex: 1, width: '100%', minHeight: 480 }} />

              {/* Heatmap Legend Bar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  zIndex: 1000,
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid #e8e0d5',
                  borderRadius: 10,
                  padding: '8px 12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: '#9e9189', textTransform: 'uppercase', marginBottom: 4 }}>
                  Congestion Thermal Index
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#15803d' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Free Flow
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#854d0e' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} /> Moderate
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#c2410c' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} /> Heavy
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#991b1b' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} /> Severe Gridlock
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function RoutesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center', color: '#9e9189' }}>Loading Route Intelligence...</div>}>
      <RoutesContent />
    </Suspense>
  )
}

