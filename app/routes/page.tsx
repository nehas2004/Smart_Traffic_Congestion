'use client'

import { useEffect, useState, useRef, Suspense, useCallback } from 'react'
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
  MapPin,
  Fuel,
  TrendingUp,
  Calendar,
  Compass,
  ChevronDown,
  X,
} from 'lucide-react'

const FREE_FLOW = 48

// Color-to-traffic-condition mapping utility
function getColorForCondition(condition: 'fast' | 'moderate' | 'slow' | 'heavy' | 'blocked' | string): string {
  switch (condition.toLowerCase()) {
    case 'fast':
    case 'free':
      return '#10b981' // Green
    case 'moderate':
      return '#eab308' // Yellow
    case 'slow':
      return '#f97316' // Orange
    case 'heavy':
      return '#ef4444' // Red
    case 'blocked':
    case 'severe':
      return '#991b1b' // Dark Red
    default:
      return '#10b981'
  }
}

let _cachedParams: {
  fromLat: string
  fromLon: string
  toLat: string
  toLon: string
  fromName: string
  toName: string
  departAt?: string
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

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function getHotspotsForRoute(route: any) {
  const points = route?.legs?.[0]?.points || []
  const sections = route?.sections || route?.legs?.[0]?.sections || []
  const hotspots: { name: string; delay: number; severity: string; lat: number; lon: number; intensity: number }[] = []

  // 1. Extract live traffic delay sections from TomTom route payload
  sections.forEach((sec: any) => {
    if (sec.sectionType === 'TRAFFIC' || sec.simpleCategory === 'JAM' || sec.delayInSeconds > 60) {
      const delayMin = Math.round((sec.delayInSeconds || 120) / 60)
      const startIdx = sec.startPointIndex || 0
      const endIdx = Math.min(points.length - 1, sec.endPointIndex || points.length - 1)
      const secPoints = points.slice(startIdx, endIdx + 1)
      const midPoint = secPoints[Math.floor(secPoints.length / 2)] || points[startIdx] || points[0]
      if (midPoint) {
        hotspots.push({
          name: sec.simpleCategory ? `Traffic Jam (${sec.simpleCategory})` : 'Congested Road Segment',
          delay: delayMin,
          severity: delayMin > 8 ? 'Severe' : 'Moderate',
          lat: midPoint.latitude,
          lon: midPoint.longitude,
          intensity: delayMin > 8 ? 0.92 : 0.65,
        })
      }
    }
  })

  // 2. Cross-reference known corridor junctions with strict 350m proximity
  if (points.length > 0) {
    BOTTLENECK_LOCATIONS.forEach((bn) => {
      let closestPt: { latitude: number; longitude: number } | null = null
      let minDistance = Infinity

      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        const dist = getDistanceMeters(p.latitude, p.longitude, bn.lat, bn.lon)
        if (dist < minDistance) {
          minDistance = dist
          closestPt = p
        }
      }

      // Strictly must pass within 350 meters of the bottleneck junction
      if (minDistance < 350 && closestPt) {
        if (!hotspots.some((h) => h.name.includes(bn.name))) {
          hotspots.push({
            name: bn.name,
            delay: bn.delay,
            severity: bn.severity,
            lat: closestPt.latitude,
            lon: closestPt.longitude,
            intensity: bn.intensity,
          })
        }
      }
    })
  }

  return hotspots
}

function CongestionBadge({ speed, delay, freeFlowSpeed }: { speed: number; delay?: number; freeFlowSpeed?: number }) {
  if (delay && delay >= 8) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
        <AlertTriangle size={12} className="text-rose-600" /> Severe Traffic (+{delay}m)
      </span>
    )
  }
  if (delay && delay >= 2) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
        <AlertTriangle size={12} className="text-amber-600" /> Moderate Delay (+{delay}m)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
      <CheckCircle size={12} className="text-emerald-600" /> Free Flow
    </span>
  )
}

function RoutesContent() {
  const params = useSearchParams()
  const router = useRouter()

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  const urlFromLat = params.get('fromLat')
  const urlToLat = params.get('toLat')
  const urlDepartAt = params.get('departAt')

  if (urlFromLat && urlToLat) {
    _cachedParams = {
      fromLat: urlFromLat,
      fromLon: params.get('fromLon') || '',
      toLat: urlToLat,
      toLon: params.get('toLon') || '',
      fromName: params.get('fromName') || 'Origin',
      toName: params.get('toName') || 'Destination',
      departAt: urlDepartAt || undefined,
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
          // Default initial route: Kothamangalam to Muvattupuzha
          return {
            fromLat: '10.0601',
            fromLon: '76.6214',
            toLat: '9.9894',
            toLon: '76.5837',
            fromName: 'Kothamangalam, Kerala',
            toName: 'Muvattupuzha, Kerala',
          }
        })()

  const fromName = activeParams?.fromName || 'Kothamangalam, Kerala'
  const toName = activeParams?.toName || 'Muvattupuzha, Kerala'

  // Top search bar local state & suggestions
  const [searchFrom, setSearchFrom] = useState(fromName)
  const [searchTo, setSearchTo] = useState(toName)

  // Explicit typing flags (Only show dropdown menu when user actively types)
  const [isTypingFrom, setIsTypingFrom] = useState(false)
  const [isTypingTo, setIsTypingTo] = useState(false)

  // Departure Date & Time state
  const now = new Date()
  const defaultDateStr = now.toISOString().split('T')[0]
  const defaultTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const [departureMode, setDepartureMode] = useState<'now' | 'depart_at' | 'arrive_by'>(
    urlDepartAt ? 'depart_at' : 'now'
  )
  const [customDate, setCustomDate] = useState<string>(
    urlDepartAt ? urlDepartAt.split('T')[0] : defaultDateStr
  )
  const [customTime, setCustomTime] = useState<string>(
    urlDepartAt && urlDepartAt.includes('T') ? urlDepartAt.split('T')[1].substring(0, 5) : defaultTimeStr
  )
  const [departureLabel, setDepartureLabel] = useState<string>(
    urlDepartAt ? `Depart ${urlDepartAt.replace('T', ' ')}` : 'Leave now'
  )
  const [showDeparturePopover, setShowDeparturePopover] = useState(false)

  const [fromSuggestions, setFromSuggestions] = useState<any[]>([])
  const [toSuggestions, setToSuggestions] = useState<any[]>([])
  const [selectedFromPos, setSelectedFromPos] = useState<{ lat: number; lon: number } | null>(
    activeParams ? { lat: parseFloat(activeParams.fromLat), lon: parseFloat(activeParams.fromLon) } : null
  )
  const [selectedToPos, setSelectedToPos] = useState<{ lat: number; lon: number } | null>(
    activeParams ? { lat: parseFloat(activeParams.toLat), lon: parseFloat(activeParams.toLon) } : null
  )

  const fromContainerRef = useRef<HTMLDivElement>(null)
  const toContainerRef = useRef<HTMLDivElement>(null)
  const departurePopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeParams?.fromName) setSearchFrom(activeParams.fromName)
    if (activeParams?.toName) setSearchTo(activeParams.toName)
  }, [activeParams?.fromName, activeParams?.toName])

  // Format human-friendly label for departure
  const formatDepartureLabel = (mode: 'now' | 'depart_at' | 'arrive_by', dStr: string, tStr: string) => {
    if (mode === 'now') return 'Leave now'
    try {
      const d = new Date(`${dStr}T${tStr}:00`)
      const isToday = new Date().toDateString() === d.toDateString()
      const timeFormatted = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      const prefix = mode === 'arrive_by' ? 'Arrive by' : 'Depart'
      if (isToday) {
        return `${prefix} Today at ${timeFormatted}`
      }
      const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `${prefix} ${dateFormatted}, ${timeFormatted}`
    } catch (_) {
      return 'Scheduled departure'
    }
  }

  // Geocode suggestions fetcher
  const geocodePlaces = async (query: string) => {
    if (!query || query.trim().length < 2) return []
    try {
      const res = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(query.trim())}.json?key=${KEY}&countrySet=IN&limit=6`
      )
      const data = await res.json()
      return data.results || []
    } catch (_) {
      return []
    }
  }

  // Handle "From" autocomplete debouncing ONLY when actively typing
  useEffect(() => {
    if (!isTypingFrom) {
      setFromSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      if (searchFrom && searchFrom.trim().length >= 2) {
        const results = await geocodePlaces(searchFrom)
        setFromSuggestions(results)
      } else {
        setFromSuggestions([])
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [searchFrom, isTypingFrom])

  // Handle "To" autocomplete debouncing ONLY when actively typing
  useEffect(() => {
    if (!isTypingTo) {
      setToSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      if (searchTo && searchTo.trim().length >= 2) {
        const results = await geocodePlaces(searchTo)
        setToSuggestions(results)
      } else {
        setToSuggestions([])
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [searchTo, isTypingTo])

  // Click outside listener to dismiss suggestions & departure popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fromContainerRef.current && !fromContainerRef.current.contains(e.target as Node)) {
        setIsTypingFrom(false)
        setFromSuggestions([])
      }
      if (toContainerRef.current && !toContainerRef.current.contains(e.target as Node)) {
        setIsTypingTo(false)
        setToSuggestions([])
      }
      if (departurePopoverRef.current && !departurePopoverRef.current.contains(e.target as Node)) {
        setShowDeparturePopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [routes, setRoutes] = useState<any[]>([])
  const [forecasts, setForecasts] = useState<any[]>([])
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0)
  const [loading, setLoading] = useState(true)
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

  // Fetch routes from TomTom Routing API with comprehensive multi-route alternatives
  useEffect(() => {
    if (!activeParams?.fromLat || !activeParams?.toLat) return
    if (!KEY) {
      setError('TomTom API key not configured.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const { fromLat, fromLon, toLat, toLon, departAt } = activeParams

    const fetchAllSuggestedRoutes = async () => {
      try {
        const departParam = departAt ? `&departAt=${encodeURIComponent(departAt)}` : ''
        const urlFastest = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json?key=${KEY}&maxAlternatives=5&traffic=true&routeType=fastest&travelMode=car&sectionType=traffic&instructionsType=tagged&computeTravelTimeFor=all${departParam}`
        const urlShortest = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json?key=${KEY}&traffic=true&routeType=short&travelMode=car&sectionType=traffic&instructionsType=tagged${departParam}`
        const urlEco = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json?key=${KEY}&traffic=true&routeType=eco&travelMode=car&sectionType=traffic&instructionsType=tagged${departParam}`
        const urlThrilling = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${toLat},${toLon}/json?key=${KEY}&traffic=true&routeType=thrilling&hilliness=normal&windingness=normal&travelMode=car&sectionType=traffic${departParam}`

        const [fastestRes, shortestRes, ecoRes, thrillingRes] = await Promise.allSettled([
          fetch(urlFastest).then((r) => r.json()),
          fetch(urlShortest).then((r) => r.json()),
          fetch(urlEco).then((r) => r.json()),
          fetch(urlThrilling).then((r) => r.json()),
        ])

        const combinedRoutes: any[] = []
        const seenSignatures = new Set<string>()

        const addUniqueRoutes = (rList?: any[]) => {
          if (!rList || !Array.isArray(rList)) return
          rList.forEach((r) => {
            const length = r.summary?.lengthInMeters || 0
            const time = r.summary?.travelTimeInSeconds || 0
            const sig = `${Math.round(length / 200)}_${Math.round(time / 45)}`
            if (!seenSignatures.has(sig)) {
              seenSignatures.add(sig)
              combinedRoutes.push(r)
            }
          })
        }

        if (fastestRes.status === 'fulfilled' && fastestRes.value?.routes) {
          addUniqueRoutes(fastestRes.value.routes)
        }
        if (shortestRes.status === 'fulfilled' && shortestRes.value?.routes) {
          addUniqueRoutes(shortestRes.value.routes)
        }
        if (ecoRes.status === 'fulfilled' && ecoRes.value?.routes) {
          addUniqueRoutes(ecoRes.value.routes)
        }
        if (thrillingRes.status === 'fulfilled' && thrillingRes.value?.routes) {
          addUniqueRoutes(thrillingRes.value.routes)
        }

        // If fewer than 3 corridors found, query via perpendicular offset waypoint
        if (combinedRoutes.length < 3) {
          const lat1 = parseFloat(fromLat)
          const lon1 = parseFloat(fromLon)
          const lat2 = parseFloat(toLat)
          const lon2 = parseFloat(toLon)

          const midLat = (lat1 + lat2) / 2 + (lon2 - lon1) * 0.25
          const midLon = (lon1 + lon2) / 2 - (lat2 - lat1) * 0.25

          try {
            const viaUrl = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLon}:${midLat.toFixed(5)},${midLon.toFixed(5)}:${toLat},${toLon}/json?key=${KEY}&traffic=true&travelMode=car&sectionType=traffic${departParam}`
            const viaRes = await fetch(viaUrl).then((r) => r.json()).catch(() => null)
            if (viaRes?.routes) addUniqueRoutes(viaRes.routes)
          } catch (_) {}
        }

        const rs = combinedRoutes.length > 0 ? combinedRoutes.slice(0, 4) : []
        setRoutes(rs)

        // Query ML predictions (Linear Regression, Gradient Boosting, LSTM with Open-Meteo & TomTom 27 features)
        const mlForecasts = await Promise.all(
          rs.map(async (r: any) => {
            const rawPts = r.legs?.[0]?.points || []
            const midPt = rawPts[Math.floor(rawPts.length / 2)] || { latitude: parseFloat(fromLat), longitude: parseFloat(fromLon) }
            try {
              const mlRes = await fetch(`/api/predict?lat=${midPt.latitude}&lon=${midPt.longitude}`).then((res) => res.json())
              return mlRes
            } catch (_) {
              return null
            }
          })
        )

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
            
            const mlItem = mlForecasts[idx]
            const mlDelaySec = mlItem?.projected_delay_sec || 0
            const mlDelayMins = Math.round(mlDelaySec / 60)

            const finalDelay = Math.max(liveDelayMins, hotspotDelaySum, mlDelayMins)

            const freeFlowSpeed = noTrafficSec > 0 ? Math.round(distKm / (noTrafficSec / 3600)) : 45
            let speedKmh = travelTimeSec > 0 ? Math.round(distKm / (travelTimeSec / 3600)) : freeFlowSpeed
            if (speedKmh <= 0) speedKmh = freeFlowSpeed

            // Synthesize segment breakdown
            let fastP = 85
            let modP = 15
            let slowP = 0
            let heavyP = 0

            if (finalDelay >= 12) {
              fastP = 35
              modP = 25
              slowP = 20
              heavyP = 20
            } else if (finalDelay >= 6) {
              fastP = 50
              modP = 30
              slowP = 20
              heavyP = 0
            } else if (finalDelay >= 2) {
              fastP = 70
              modP = 25
              slowP = 5
              heavyP = 0
            } else {
              fastP = 95
              modP = 5
              slowP = 0
              heavyP = 0
            }

            return {
              predictedSpeed: speedKmh,
              freeFlowSpeed,
              delay: finalDelay,
              hotspots,
              mlModel: mlItem?.predictions_15min_ahead,
              segmentProportions: { fast: fastP, moderate: modP, slow: slowP, heavy: heavyP },
            }
          })
        )
        setLoading(false)
      } catch (err) {
        setError('Failed to load routes. Check your connection or API key.')
        setLoading(false)
      }
    }

    fetchAllSuggestedRoutes()
  }, [activeParams?.fromLat, activeParams?.toLat, activeParams?.departAt, KEY])

  // Render ALL Routes with Color-Coded Segments, Heatmap, and Markers
  const renderMapLayers = useCallback(
    (L: any, map: any) => {
      if (!L || !map) return

      // Invalidate size in case container rendered or resized
      try {
        map.invalidateSize()
      } catch (_) {}

      // Clear previous layers
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
      const allRouteLatLngs: [number, number][] = []

      // In Heatmap mode, display ONLY the Recommended Route (Route 1 / idx 0)
      // In Hybrid / Live Flow modes, display ALL suggested routes
      const targetIndices =
        mapLayerMode === 'heatmap'
          ? routes.length > 0
            ? [0]
            : []
          : routes.map((_, idx) => idx)

      // Draw Routes (Unselected routes first, Selected active route on top)
      const sortedIndices = targetIndices.sort((a, b) => {
        if (a === selectedRouteIdx) return 1
        if (b === selectedRouteIdx) return -1
        return 0
      })

      sortedIndices.forEach((idx) => {
        const route = routes[idx]
        const isSelected = idx === selectedRouteIdx
        const rawPoints = route?.legs?.[0]?.points || []
        if (rawPoints.length < 2) return

        const pts = rawPoints.map((p: any) => [p.latitude, p.longitude] as [number, number])
        pts.forEach((pt) => allRouteLatLngs.push(pt))

        const fc = forecasts[idx]
        const delay = fc?.delay || 0
        const sections = route.sections || route.legs?.[0]?.sections || []

        // Background glow / base polyline
        if (isSelected) {
          const glow = L.polyline(pts, {
            color: '#6366f1',
            weight: 16,
            opacity: 0.45,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map)
          polylinesRef.current.push(glow)
        } else {
          const altBase = L.polyline(pts, {
            color: '#0f172a',
            weight: 8,
            opacity: 0.65,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map)
          polylinesRef.current.push(altBase)
        }

        // Render color-coded segments for the route
        if (sections.length > 0) {
          let lastEndIndex = 0

          sections.forEach((sec: any) => {
            const startIndex = Math.max(0, sec.startPointIndex || 0)
            const endIndex = Math.min(pts.length - 1, sec.endPointIndex || pts.length - 1)

            // 1. Fast green segment
            if (startIndex > lastEndIndex) {
              const greenChunk = pts.slice(lastEndIndex, startIndex + 1)
              if (greenChunk.length >= 2) {
                const segLine = L.polyline(greenChunk, {
                  color: getColorForCondition('fast'),
                  weight: isSelected ? 8 : 5,
                  opacity: isSelected ? 1.0 : 0.9,
                  dashArray: isSelected ? undefined : '7, 7',
                  lineCap: 'round',
                }).addTo(map)

                segLine.on('click', () => setSelectedRouteIdx(idx))
                polylinesRef.current.push(segLine)
              }
            }

            // 2. Slowed traffic segment
            if (endIndex > startIndex) {
              const trafficChunk = pts.slice(startIndex, endIndex + 1)
              if (trafficChunk.length >= 2) {
                const delaySec = sec.delayInSeconds || 0
                let segColor = getColorForCondition('moderate')
                if (delaySec > 300 || sec.simpleCategory === 'JAM') {
                  segColor = getColorForCondition('heavy')
                } else if (delaySec > 120 || sec.magnitudeOfDelay >= 2) {
                  segColor = getColorForCondition('slow')
                }

                const segLine = L.polyline(trafficChunk, {
                  color: segColor,
                  weight: isSelected ? 9 : 5.5,
                  opacity: isSelected ? 1.0 : 0.95,
                  dashArray: isSelected ? undefined : '7, 7',
                  lineCap: 'round',
                }).addTo(map)

                segLine.on('click', () => setSelectedRouteIdx(idx))
                polylinesRef.current.push(segLine)
              }
            }

            lastEndIndex = endIndex
          })

          // Trailing fast segment
          if (lastEndIndex < pts.length - 1) {
            const trailingChunk = pts.slice(lastEndIndex)
            if (trailingChunk.length >= 2) {
              const segLine = L.polyline(trailingChunk, {
                color: getColorForCondition('fast'),
                weight: isSelected ? 8 : 5,
                opacity: isSelected ? 1.0 : 0.9,
                dashArray: isSelected ? undefined : '7, 7',
                lineCap: 'round',
              }).addTo(map)

              segLine.on('click', () => setSelectedRouteIdx(idx))
              polylinesRef.current.push(segLine)
            }
          }
        } else {
          // Fallback segment division (Green fast outer, moderate/slow middle based on delay)
          const chunkLen = Math.floor(pts.length / 3)
          const part1 = pts.slice(0, chunkLen + 1)
          const part2 = pts.slice(chunkLen, chunkLen * 2 + 1)
          const part3 = pts.slice(chunkLen * 2)

          const midColor =
            delay > 8
              ? getColorForCondition('heavy')
              : delay > 3
              ? getColorForCondition('slow')
              : delay > 1
              ? getColorForCondition('moderate')
              : getColorForCondition('fast')

          const chunks = [
            { pts: part1, color: getColorForCondition('fast') },
            { pts: part2, color: midColor },
            { pts: part3, color: getColorForCondition('fast') },
          ]

          chunks.forEach((chk) => {
            if (chk.pts.length >= 2) {
              const segLine = L.polyline(chk.pts, {
                color: chk.color,
                weight: isSelected ? 8 : 5,
                opacity: isSelected ? 1.0 : 0.9,
                dashArray: isSelected ? undefined : '7, 7',
                lineCap: 'round',
              }).addTo(map)
              segLine.on('click', () => setSelectedRouteIdx(idx))
              polylinesRef.current.push(segLine)
            }
          })
        }

        // Invisible broader hover/click polyline across full route
        const interactiveCover = L.polyline(pts, {
          color: 'transparent',
          weight: 24,
          opacity: 0,
        }).addTo(map)

        interactiveCover.on('click', () => setSelectedRouteIdx(idx))
        interactiveCover.bindTooltip(
          `<div style="font-family:system-ui; padding:3px;">
            <strong style="color:#0f172a;">Route ${idx + 1} ${idx === 0 ? '(Recommended)' : '(Alternate Corridor)'}</strong><br/>
            <span style="font-size:12px; color:#475569;">Duration: ${Math.round((route.summary?.travelTimeInSeconds || 0) / 60)} min · ${((route.summary?.lengthInMeters || 0) / 1000).toFixed(1)} km</span><br/>
            <span style="font-size:11px; color:#6366f1; font-weight:700;">${isSelected ? '✓ Active Route' : '👉 Click to switch to this route'}</span>
          </div>`,
          { sticky: true }
        )
        polylinesRef.current.push(interactiveCover)

        // Route label badge distributed along route to prevent overlapping
        if (pts.length > 10 && (mapLayerMode !== 'heatmap' || isSelected)) {
          const badgeFractions = [0.35, 0.65, 0.5, 0.8]
          const badgeFrac = badgeFractions[idx % badgeFractions.length]
          const badgeIdx = Math.min(pts.length - 1, Math.max(0, Math.floor(pts.length * badgeFrac)))
          const badgePt = pts[badgeIdx]
          const isRec = idx === 0
          const routePillIcon = L.divIcon({
            html: `
              <div style="
                background: ${isSelected ? '#4f46e5' : '#ffffff'};
                color: ${isSelected ? '#ffffff' : '#0f172a'};
                font-size: 11px; font-weight: 800;
                padding: 3px 8px; border-radius: 999px;
                border: 2px solid ${isSelected ? '#ffffff' : '#94a3b8'};
                box-shadow: 0 4px 10px rgba(0,0,0,0.2); white-space: nowrap; cursor: pointer;
              ">
                Route ${idx + 1} ${isRec ? '★' : ''} (${Math.round((route.summary?.travelTimeInSeconds || 0) / 60)}m)
              </div>
            `,
            className: '',
            iconAnchor: [35, 12],
          })
          const routeLabelMarker = L.marker(badgePt, { icon: routePillIcon }).addTo(map)
          routeLabelMarker.on('click', () => setSelectedRouteIdx(idx))
          markersRef.current.push(routeLabelMarker)
        }

        // Sample route coordinates for Heatmap calculation strictly when delay is present
        if (delay >= 2) {
          const step = Math.max(3, Math.floor(pts.length / 25))
          const baseIntensity = Math.min(0.85, Math.max(0.3, delay / 12))

          for (let i = 0; i < pts.length; i += step) {
            const pt = pts[i]
            heatPoints.push([pt[0], pt[1], baseIntensity])
          }
        }
      })

      // 2. Hotspots & Bottleneck Markers
      const currentForecast = forecasts[mapLayerMode === 'heatmap' ? 0 : selectedRouteIdx]
      const hotspots = currentForecast?.hotspots || []

      hotspots.forEach((hs: any) => {
        if (hs.lat && hs.lon) {
          heatPoints.push([hs.lat, hs.lon, hs.intensity || 0.95])
          heatPoints.push([hs.lat + 0.001, hs.lon + 0.001, hs.intensity ? hs.intensity * 0.8 : 0.75])
          heatPoints.push([hs.lat - 0.001, hs.lon - 0.001, hs.intensity ? hs.intensity * 0.8 : 0.75])

          const isBlock = hs.severity === 'Severe' || hs.delay > 10
          const warningIcon = L.divIcon({
            html: `
              <div style="
                width: 28px; height: 28px; border-radius: 50%;
                background: ${isBlock ? '#991b1b' : '#ef4444'}; color: white;
                display: flex; align-items: center; justify-content: center;
                border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                cursor: pointer;
              ">
                <span style="font-size: 13px; font-weight: 900;">!</span>
              </div>
            `,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })

          const marker = L.marker([hs.lat, hs.lon], { icon: warningIcon }).addTo(map)
          marker.bindPopup(`
            <div style="font-family: system-ui; min-width: 175px; padding: 4px;">
              <div style="font-size: 10px; font-weight: 800; color: #ef4444; text-transform: uppercase; letter-spacing: 0.05em;">Traffic Bottleneck</div>
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-top: 2px;">${hs.name}</div>
              <div style="font-size: 12px; color: #ef4444; font-weight: 700; margin-top: 4px;">+${hs.delay} min delay</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Severity: ${hs.severity}</div>
            </div>
          `)
          markersRef.current.push(marker)
        }
      })

      // 3. Start & End Origin/Destination Markers
      const displayedRoute =
        mapLayerMode === 'heatmap' ? routes[0] : routes[selectedRouteIdx] || routes[0]
      const pts = displayedRoute?.legs?.[0]?.points || []
      if (pts.length > 1) {
        const startPt = [pts[0].latitude, pts[0].longitude] as [number, number]
        const endPt = [pts[pts.length - 1].latitude, pts[pts.length - 1].longitude] as [number, number]

        const startIcon = L.divIcon({
          html: `
            <div style="
              background: #10b981; width: 22px; height: 22px; border-radius: 50%;
              border: 3px solid white; box-shadow: 0 4px 12px rgba(16,185,129,0.5);
              display: flex; align-items: center; justify-content: center;
            ">
              <div style="width: 6px; height: 6px; border-radius: 50%; background: white;"></div>
            </div>
          `,
          className: '',
          iconAnchor: [11, 11],
        })

        const endIcon = L.divIcon({
          html: `
            <div style="
              background: #4f46e5; width: 22px; height: 22px; border-radius: 50%;
              border: 3px solid white; box-shadow: 0 4px 12px rgba(79,70,229,0.5);
              display: flex; align-items: center; justify-content: center;
            ">
              <div style="width: 6px; height: 6px; border-radius: 50%; background: white;"></div>
            </div>
          `,
          className: '',
          iconAnchor: [11, 11],
        })

        const startMarker = L.marker(startPt, { icon: startIcon }).bindPopup(`<b>Origin</b><br/>${fromName}`).addTo(map)
        const endMarker = L.marker(endPt, { icon: endIcon }).bindPopup(`<b>Destination</b><br/>${toName}`).addTo(map)
        markersRef.current.push(startMarker, endMarker)

        // Fit map bounds to displayed routes
        if (allRouteLatLngs.length > 0) {
          map.fitBounds(L.latLngBounds(allRouteLatLngs), { padding: [50, 50], maxZoom: 15 })
        }
      }

      // 4. Congestion Heatmap Layer
      if (L.heatLayer && heatPoints.length > 0 && showHeatmap) {
        const heat = L.heatLayer(heatPoints, {
          radius: 30,
          blur: 22,
          maxZoom: 16,
          max: 1.0,
          gradient: {
            0.2: '#10b981',
            0.4: '#eab308',
            0.6: '#f97316',
            0.8: '#ef4444',
            1.0: '#991b1b',
          },
        })
        heat.addTo(map)
        heatLayerRef.current = heat
      }
    },
    [routes, selectedRouteIdx, forecasts, showHeatmap, fromName, toName, mapLayerMode]
  )

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    const initMap = (L: any) => {
      if (mapRef.current) {
        renderMapLayers(L, mapRef.current)
        return
      }

      if (!mapContainerRef.current) return

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

        // CartoDB / OSM Base Raster Map (Reliable high-speed tiles)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap, © CARTO',
          maxZoom: 20,
          subdomains: 'abcd',
        }).addTo(map)

        // TomTom Live Traffic Flow Tile Layer
        if (KEY) {
          const flowTile = L.tileLayer(
            `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${KEY}`,
            { opacity: 0.85, maxZoom: 20 }
          )
          flowTile.addTo(map)
          flowTileRef.current = flowTile
        }

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
  }, [activeParams?.fromLat, activeParams?.fromLon, KEY, renderMapLayers])

  // Update map when routes, selection, or layer toggles change
  useEffect(() => {
    if (mapRef.current && (window as any).L) {
      renderMapLayers((window as any).L, mapRef.current)
    }
  }, [routes, selectedRouteIdx, showHeatmap, showFlow, forecasts, renderMapLayers])

  // Handle Layer Mode Switching
  const handleLayerModeChange = (mode: 'hybrid' | 'heatmap' | 'flow') => {
    setMapLayerMode(mode)
    const map = mapRef.current
    if (!map) return

    if (mode === 'hybrid') {
      setShowHeatmap(true)
      setShowFlow(true)
      if (flowTileRef.current) flowTileRef.current.addTo(map)
    } else if (mode === 'heatmap') {
      setSelectedRouteIdx(0)
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

  // Focus active route
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

  // View all routes in bounds
  const handleFitAllRoutes = () => {
    const map = mapRef.current
    const L = (window as any).L
    if (!map || !L || routes.length === 0) return
    const allPts: [number, number][] = []
    routes.forEach((r) => {
      const pts = r?.legs?.[0]?.points || []
      pts.forEach((p: any) => allPts.push([p.latitude, p.longitude]))
    })
    if (allPts.length > 0) {
      map.fitBounds(L.latLngBounds(allPts), { padding: [50, 50] })
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

  // Quick preset helper
  const handleQuickPreset = (minutesToAdd: number) => {
    if (minutesToAdd === 0) {
      setDepartureMode('now')
      setDepartureLabel('Leave now')
      setShowDeparturePopover(false)
      return
    }
    const target = new Date(Date.now() + minutesToAdd * 60 * 1000)
    const dStr = target.toISOString().split('T')[0]
    const tStr = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`
    setDepartureMode('depart_at')
    setCustomDate(dStr)
    setCustomTime(tStr)
    setDepartureLabel(formatDepartureLabel('depart_at', dStr, tStr))
    setShowDeparturePopover(false)
  }

  // Apply custom departure date & time
  const handleApplyCustomDeparture = () => {
    if (!customDate || !customTime) return
    setDepartureLabel(formatDepartureLabel(departureMode, customDate, customTime))
    setShowDeparturePopover(false)
  }

  // Top search bar submit handler
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsTypingFrom(false)
    setIsTypingTo(false)
    setFromSuggestions([])
    setToSuggestions([])
    setShowDeparturePopover(false)
    if (!searchFrom || !searchTo) return
    setLoading(true)

    try {
      let fp = selectedFromPos
      let tp = selectedToPos

      if (!fp || !tp) {
        const [fr, tr] = await Promise.all([
          !fp ? fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(searchFrom)}.json?key=${KEY}&limit=1`).then((r) => r.json()).catch(() => ({})) : null,
          !tp ? fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(searchTo)}.json?key=${KEY}&limit=1`).then((r) => r.json()).catch(() => ({})) : null,
        ])
        if (fr?.results?.[0]?.position) fp = fr.results[0].position
        if (tr?.results?.[0]?.position) tp = tr.results[0].position
      }

      if (!fp || !tp) {
        setLoading(false)
        alert('Could not resolve location coordinates. Please select from the dropdown suggestions.')
        return
      }

      const departAtParam =
        departureMode !== 'now' && customDate && customTime
          ? `&departAt=${encodeURIComponent(`${customDate}T${customTime}:00`)}`
          : ''

      router.push(
        `/routes?fromLat=${fp.lat}&fromLon=${fp.lon}&toLat=${tp.lat}&toLon=${tp.lon}&fromName=${encodeURIComponent(searchFrom)}&toName=${encodeURIComponent(searchTo)}${departAtParam}`
      )
    } catch (err) {
      setLoading(false)
      setError('Failed to search routes.')
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      <Nav />

      {/* Top Search Bar (From / To with Auto-Suggestions on Typing / Departure Picker / Find Best Route) */}
      <section className="bg-white border-b border-slate-200/80 sticky top-16 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap lg:flex-nowrap items-center gap-3">
            {/* Origin Input with Suggestions */}
            <div ref={fromContainerRef} className="flex-1 min-w-[220px] relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-white" />
              </div>
              <input
                type="text"
                value={searchFrom}
                onChange={(e) => {
                  setSelectedFromPos(null)
                  setSearchFrom(e.target.value)
                  setIsTypingFrom(true)
                }}
                placeholder="From: e.g. Kothamangalam"
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-100/90 border border-slate-200/70 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />

              {/* Suggestions Dropdown for Origin (Only shows when actively typing) */}
              {isTypingFrom && fromSuggestions.length > 0 && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="p-1.5 max-h-60 overflow-y-auto">
                    {fromSuggestions.map((item, i) => {
                      const title = item.poi?.name || item.address?.freeformAddress || item.address?.municipality
                      const subtitle = item.address?.freeformAddress !== title ? item.address?.freeformAddress : item.address?.countrySecondarySubdivision
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setIsTypingFrom(false)
                            setSearchFrom(title || searchFrom)
                            if (item.position) setSelectedFromPos(item.position)
                            setFromSuggestions([])
                          }}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-indigo-50/70 flex items-start gap-2.5 transition-colors cursor-pointer group"
                        >
                          <MapPin size={15} className="text-emerald-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate">{title}</div>
                            {subtitle && <div className="text-[11px] text-slate-400 truncate">{subtitle}</div>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Destination Input with Suggestions */}
            <div ref={toContainerRef} className="flex-1 min-w-[220px] relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
                <MapPin size={15} className="text-indigo-600" />
              </div>
              <input
                type="text"
                value={searchTo}
                onChange={(e) => {
                  setSelectedToPos(null)
                  setSearchTo(e.target.value)
                  setIsTypingTo(true)
                }}
                placeholder="To: Destination"
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-slate-100/90 border border-slate-200/70 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />

              {/* Suggestions Dropdown for Destination (Only shows when actively typing) */}
              {isTypingTo && toSuggestions.length > 0 && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="p-1.5 max-h-60 overflow-y-auto">
                    {toSuggestions.map((item, i) => {
                      const title = item.poi?.name || item.address?.freeformAddress || item.address?.municipality
                      const subtitle = item.address?.freeformAddress !== title ? item.address?.freeformAddress : item.address?.countrySecondarySubdivision
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setIsTypingTo(false)
                            setSearchTo(title || searchTo)
                            if (item.position) setSelectedToPos(item.position)
                            setToSuggestions([])
                          }}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-indigo-50/70 flex items-start gap-2.5 transition-colors cursor-pointer group"
                        >
                          <MapPin size={15} className="text-indigo-600 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate">{title}</div>
                            {subtitle && <div className="text-[11px] text-slate-400 truncate">{subtitle}</div>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Departure Date & Time Picker */}
            <div ref={departurePopoverRef} className="w-full sm:w-auto min-w-[190px] relative">
              <button
                type="button"
                onClick={() => setShowDeparturePopover((prev) => !prev)}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm font-semibold flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                  showDeparturePopover
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-700'
                    : departureMode !== 'now'
                    ? 'bg-indigo-50/80 border-indigo-200 text-indigo-700 font-bold'
                    : 'bg-slate-100/90 border-slate-200/70 text-slate-700 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Clock size={15} className={departureMode !== 'now' ? 'text-indigo-600' : 'text-slate-500'} />
                  <span className="truncate text-xs sm:text-sm">{departureLabel}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showDeparturePopover ? 'rotate-180' : ''}`} />
              </button>

              {/* Popover Card for Custom Date & Time Picker */}
              {showDeparturePopover && (
                <div className="absolute top-[calc(100%+6px)] right-0 w-[310px] sm:w-[330px] z-50 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4.5 animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-600" /> Select Departure
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDeparturePopover(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Mode Tabs: Depart At vs Arrive By */}
                  <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setDepartureMode('depart_at')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        departureMode === 'depart_at' || departureMode === 'now'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Depart At
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepartureMode('arrive_by')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        departureMode === 'arrive_by'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Arrive By
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(0)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        departureMode === 'now'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ⚡ Now
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(15)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      +15m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(30)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      +30m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(60)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      +1h
                    </button>
                  </div>

                  {/* Custom Date & Time Inputs */}
                  <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
                      <input
                        type="date"
                        min={defaultDateStr}
                        value={customDate}
                        onChange={(e) => {
                          setCustomDate(e.target.value)
                          if (departureMode === 'now') setDepartureMode('depart_at')
                        }}
                        className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time</label>
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => {
                          setCustomTime(e.target.value)
                          if (departureMode === 'now') setDepartureMode('depart_at')
                        }}
                        className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleQuickPreset(0)}
                      className="flex-1 h-9 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Reset Now
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyCustomDeparture}
                      className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      Set Departure
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Purple / Indigo Action Button */}
            <button
              type="submit"
              disabled={loading || !searchFrom || !searchTo}
              className="w-full sm:w-auto px-6 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search size={15} />
                  <span>Find Best Route</span>
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Main Viewport Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col">
        {error && (
          <div className="p-4 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          {/* LEFT COLUMN: ROUTE OPTION CARDS */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Suggested Routes ({routes.length})
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {departureMode !== 'now' ? departureLabel : 'All routes rendered on map · Click any route to switch'}
                </p>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                {routes.length} Active Corridors
              </span>
            </div>

            {loading && (
              <div className="text-center py-16 text-slate-500 bg-white rounded-3xl border border-slate-200/80 p-6">
                <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-800">Calculating all suggested routes & traffic conditions...</p>
                <p className="text-xs text-slate-400 mt-1">
                  {departureMode !== 'now'
                    ? `Evaluating historical ML models for departure: ${departureLabel}`
                    : 'Fetching alternative corridors, ML forecasts & real-time TomTom traffic'}
                </p>
              </div>
            )}

            {!loading && routes.length === 0 && (
              <div className="text-center py-16 text-slate-500 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
                <Compass size={28} className="text-indigo-600 mx-auto mb-3" />
                <h2 className="text-base font-bold text-slate-900 mb-1">No Routes Found</h2>
                <p className="text-xs text-slate-500 mb-4">Please try adjusting your origin or destination.</p>
              </div>
            )}

            {!loading &&
              routes.map((route, idx) => {
                const summary = route.summary || {}
                const etaMins = Math.round((summary.travelTimeInSeconds || 0) / 60)
                const distKm = ((summary.lengthInMeters || 0) / 1000).toFixed(1)
                const fuelEst = Math.max(25, Math.round(parseFloat(distKm) * 7.5))
                const fc = forecasts[idx]
                const isSelected = selectedRouteIdx === idx
                const isTopRoute = idx === 0
                const seg = fc?.segmentProportions || { fast: 70, moderate: 20, slow: 10, heavy: 0 }
                const delayVal = fc?.delay || 0

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedRouteIdx(idx)}
                    className={`bg-white rounded-2xl p-5 cursor-pointer transition-all duration-200 border relative ${
                      isSelected
                        ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Header with Title & Recommended / Alternate Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Route {idx + 1}
                        </span>
                        {isTopRoute ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Sparkles size={11} className="text-emerald-700" /> Recommended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">
                            Alternate Corridor
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-600 text-white shadow-xs">
                            Active
                          </span>
                        )}
                      </div>

                      <CongestionBadge speed={fc?.predictedSpeed || FREE_FLOW} delay={fc?.delay} freeFlowSpeed={fc?.freeFlowSpeed} />
                    </div>

                    {/* Large Duration Text & Distance / Fuel Details */}
                    <div className="mt-2.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                          {etaMins}
                        </span>
                        <span className="text-base font-bold text-slate-500">min</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                        <span>{distKm} km</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Fuel size={12} className="text-slate-400" /> ₹{fuelEst} est. fuel
                        </span>
                      </div>
                    </div>

                    {/* Color-Coded Traffic Condition Segment Bar */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Route Traffic Flow</span>
                        <span className="text-slate-500 font-semibold normal-case">
                          {Math.round(fc?.predictedSpeed || FREE_FLOW)} km/h avg
                        </span>
                      </div>

                      {/* Multi-segment condition bar (Green → Yellow → Orange → Red) */}
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex gap-0.5">
                        <div
                          style={{ width: `${seg.fast}%` }}
                          className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                          title={`Fast: ${seg.fast}%`}
                        />
                        <div
                          style={{ width: `${seg.moderate}%` }}
                          className="bg-amber-400 h-full transition-all duration-500"
                          title={`Moderate: ${seg.moderate}%`}
                        />
                        <div
                          style={{ width: `${seg.slow}%` }}
                          className="bg-orange-500 h-full transition-all duration-500"
                          title={`Slow: ${seg.slow}%`}
                        />
                        {seg.heavy > 0 && (
                          <div
                            style={{ width: `${seg.heavy}%` }}
                            className="bg-rose-600 h-full rounded-r-full transition-all duration-500"
                            title={`Heavy: ${seg.heavy}%`}
                          />
                        )}
                      </div>

                      {/* Small Delay Indicator Below Bar */}
                      <div className="flex items-center justify-between mt-1.5 text-xs">
                        {delayVal > 0 ? (
                          <span className="font-bold text-rose-600 flex items-center gap-1">
                            <TrendingUp size={12} /> ↑ {delayVal} min delay
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle size={12} /> On time · Minimal delay
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {fc?.hotspots?.length || 0} bottlenecks
                        </span>
                      </div>
                    </div>

                    {/* ML Congestion Forecast Breakdown */}
                    <div className="bg-slate-50 rounded-xl p-3 mt-3 border border-slate-100">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">Predicted Segment Speed</span>
                        <span className="font-bold text-slate-900">
                          {Math.round(fc?.predictedSpeed || FREE_FLOW)} km/h
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Traffic Bottleneck Delay</span>
                        <span className={`font-bold ${delayVal > 3 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          +{delayVal} min
                        </span>
                      </div>

                      {/* Bottlenecks List */}
                      {fc?.hotspots && fc.hotspots.length > 0 ? (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Bottlenecks on route ({fc.hotspots.length})
                          </span>
                          <div className="flex flex-col gap-1.5 mt-1.5">
                            {fc.hotspots.map((hs: any, hIdx: number) => (
                              <div
                                key={hIdx}
                                className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/70"
                              >
                                <span className="font-semibold text-slate-800 truncate max-w-[220px]">
                                  ⚠️ {hs.name}
                                </span>
                                <span className={`font-bold ${hs.severity === 'Severe' ? 'text-rose-600' : 'text-amber-600'}`}>
                                  +{hs.delay}m
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mt-2">
                          <CheckCircle size={12} /> Clear route with no major bottlenecks
                        </div>
                      )}
                    </div>

                    {/* Primary Action: Start Navigation */}
                    <div className="mt-3.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedRouteIdx(idx)
                          handleStartNav(route)
                        }}
                        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Navigation size={15} className="fill-white" />
                        <span>Start Navigation</span>
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* RIGHT COLUMN: INTERACTIVE MAP WITH ALL ROUTES DISPLAYED */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm flex flex-col relative min-h-[580px] lg:h-[calc(100vh-210px)] sticky top-36">
            {/* Floating Header Toolbar */}
            <div className="absolute top-3.5 inset-x-3.5 z-[1000] flex items-center justify-between gap-2 pointer-events-none flex-wrap">
              {/* Layer Mode Selector (Hybrid, Congestion Heatmap, Live Flow) */}
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl p-1 flex items-center gap-1 shadow-md pointer-events-auto">
                <button
                  type="button"
                  onClick={() => handleLayerModeChange('hybrid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mapLayerMode === 'hybrid'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Layers size={13} /> Hybrid
                </button>

                <button
                  type="button"
                  onClick={() => handleLayerModeChange('heatmap')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mapLayerMode === 'heatmap'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Flame size={13} className="text-amber-400" /> Heatmap
                </button>

                <button
                  type="button"
                  onClick={() => handleLayerModeChange('flow')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mapLayerMode === 'flow'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Gauge size={13} className="text-emerald-400" /> Live Flow
                </button>
              </div>

              {/* View Controls: View All Routes & Focus Active Route */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleFitAllRoutes}
                  className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs font-bold text-slate-800 shadow-md hover:bg-white transition-all cursor-pointer"
                >
                  <Layers size={13} className="text-indigo-600" />
                  <span>View All Routes</span>
                </button>

                <button
                  type="button"
                  onClick={handleFitRoute}
                  className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center gap-1.5 text-xs font-bold text-slate-800 shadow-md hover:bg-white transition-all cursor-pointer"
                >
                  <Maximize2 size={13} className="text-indigo-600" />
                  <span>Focus Active</span>
                </button>
              </div>
            </div>

            {/* Map Leaflet Container (Permanently mounted with full dimensions) */}
            <div
              ref={mapContainerRef}
              className="flex-1 w-full h-full min-h-[520px] bg-slate-100 relative z-10"
              style={{ minHeight: '520px' }}
            />

            {/* Bottom Traffic Condition Legend */}
            <div className="absolute bottom-3.5 inset-x-3.5 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3.5 shadow-lg flex items-center justify-between flex-wrap gap-3 pointer-events-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 mr-1">Traffic Condition:</span>
              </div>

              <div className="flex items-center gap-3.5 flex-wrap text-xs font-semibold text-slate-700">
                {/* Fast */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
                  <span>Fast</span>
                </div>

                {/* Moderate */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400 shadow-xs" />
                  <span>Moderate</span>
                </div>

                {/* Slow */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-orange-500 shadow-xs" />
                  <span>Slow</span>
                </div>

                {/* Heavy */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs" />
                  <span>Heavy</span>
                </div>

                {/* Road Block */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-900 shadow-xs" />
                  <span>Road Block</span>
                </div>
              </div>

              <div className="border-l border-slate-200 pl-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="w-3.5 h-1.5 rounded-xs bg-slate-500 inline-block" />
                <span>Click any path to switch route</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function RoutesPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-500 font-bold">Loading Route Intelligence...</div>}>
      <RoutesContent />
    </Suspense>
  )
}
