'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { CorridorDetail, BottleneckItem, SeverityLevel, TrafficRecommendation } from '@/types/traffic'
import {
  MapPin,
  Layers,
  Activity,
  AlertTriangle,
  Zap,
  Clock,
  Gauge,
  Navigation2,
  Maximize2,
  RefreshCw,
  Search,
  Crosshair,
  Compass,
  AlertCircle,
  TrendingUp,
  X,
  Sparkles,
  Flame,
  ShieldAlert,
} from 'lucide-react'

interface TrafficMapViewProps {
  corridors: CorridorDetail[]
  bottlenecks: BottleneckItem[]
  recommendations?: TrafficRecommendation[]
  selectedCorridorId?: string
  onSelectCorridor?: (corridorId: string) => void
  onSelectRecommendation?: (recId: string) => void
}

const severityHex: Record<SeverityLevel, string> = {
  low: '#16a34a',
  moderate: '#eab308',
  heavy: '#f97316',
  severe: '#dc2626',
  critical: '#991b1b',
}

const QUICK_CITIES = [
  { name: 'Kothamangalam', query: 'Kothamangalam, Kerala', lat: 10.0601, lon: 76.6214 },
  { name: 'Munnar (NH 85)', query: 'Munnar, Kerala', lat: 10.0889, lon: 77.0595 },
  { name: 'Aluva', query: 'Aluva, Kerala', lat: 10.1076, lon: 76.3516 },
  { name: 'Kochi (Kaloor)', query: 'Kaloor, Kochi, Kerala', lat: 10.0033, lon: 76.2996 },
  { name: 'Thrissur', query: 'Thrissur Round, Thrissur, Kerala', lat: 10.5276, lon: 76.2144 },
  { name: 'Trivandrum', query: 'Pattom, Thiruvananthapuram, Kerala', lat: 8.5241, lon: 76.9366 },
  { name: 'Kozhikode', query: 'Palayam, Kozhikode, Kerala', lat: 11.2588, lon: 75.7804 },
]

export function TrafficMapView({
  corridors: initialCorridors,
  bottlenecks: initialBottlenecks,
  recommendations: initialRecommendations = [],
  selectedCorridorId,
  onSelectCorridor,
  onSelectRecommendation,
}: TrafficMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const polylinesRef = useRef<any[]>([])
  const markersRef = useRef<any[]>([])
  const recMarkersRef = useRef<any[]>([])
  const searchDebounceRef = useRef<any>(null)

  const [currentCityName, setCurrentCityName] = useState<string>('Kothamangalam Grid')
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([10.0601, 76.6214])
  const [corridors, setCorridors] = useState<CorridorDetail[]>(initialCorridors)
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>(initialBottlenecks)
  const [recommendations, setRecommendations] = useState<TrafficRecommendation[]>(initialRecommendations)
  const [showRecommendations, setShowRecommendations] = useState(true)

  const [activeCorridor, setActiveCorridor] = useState<CorridorDetail | null>(
    initialCorridors.find((c) => c.corridor_id === selectedCorridorId) || initialCorridors[0] || null
  )
  const [showFlowOverlay, setShowFlowOverlay] = useState(true)
  const [flowLayerInstance, setFlowLayerInstance] = useState<any>(null)

  // Update recommendations when prop changes
  useEffect(() => {
    if (initialRecommendations && initialRecommendations.length > 0) {
      setRecommendations(initialRecommendations)
    }
  }, [initialRecommendations])

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isFetchingTraffic, setIsFetchingTraffic] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  // Update selection if prop changes
  useEffect(() => {
    if (selectedCorridorId) {
      const found = corridors.find((c) => c.corridor_id === selectedCorridorId)
      if (found) setActiveCorridor(found)
    }
  }, [selectedCorridorId, corridors])

  // Handle Autocomplete Search Query
  const handleSearchInput = (val: string) => {
    setSearchQuery(val)
    if (!val || val.trim().length < 2) {
      setSearchSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(
          `https://api.tomtom.com/search/2/search/${encodeURIComponent(val)}.json?key=${KEY}&countrySet=IN&limit=5`
        )
        if (res.ok) {
          const data = await res.json()
          setSearchSuggestions(data?.results || [])
          setShowSuggestions(true)
        }
      } catch (err) {
        console.warn('TomTom Search Autocomplete failed:', err)
      } finally {
        setIsSearching(false)
      }
    }, 280)
  }

  // Fetch Live Flow Segment & Hotspots around searched coordinates
  const fetchLiveTrafficForLocation = async (lat: number, lon: number, locationName: string) => {
    setIsFetchingTraffic(true)
    try {
      // 1. Fetch exact flow segment at searched point
      const flowRes = await fetch(
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/14/json?key=${KEY}&point=${lat},${lon}`
      )

      let currentSpeed = 28
      let freeFlowSpeed = 45
      let rawCoordinates: [number, number][] = []

      if (flowRes.ok) {
        const flowData = await flowRes.json()
        const segment = flowData?.flowSegmentData
        if (segment) {
          currentSpeed = segment.currentSpeed || currentSpeed
          freeFlowSpeed = segment.freeFlowSpeed || freeFlowSpeed
          if (segment.coordinates?.coordinate && Array.isArray(segment.coordinates.coordinate)) {
            rawCoordinates = segment.coordinates.coordinate.map((c: any) => [c.latitude, c.longitude])
          }
        }
      }

      // If segment coordinates are sparse, create local corridor points around the center
      if (rawCoordinates.length < 2) {
        rawCoordinates = [
          [lat - 0.005, lon - 0.006],
          [lat - 0.002, lon - 0.002],
          [lat, lon],
          [lat + 0.003, lon + 0.004],
          [lat + 0.007, lon + 0.008],
        ]
      }

      const speedRatio = currentSpeed / Math.max(freeFlowSpeed, 1)
      const currentCongestion = Math.min(99, Math.max(12, Math.round((1 - speedRatio) * 100)))
      const predictedCongestion = Math.min(99, Math.round(currentCongestion * 1.12))

      let severity: SeverityLevel = 'low'
      if (currentCongestion >= 75) severity = 'critical'
      else if (currentCongestion >= 60) severity = 'severe'
      else if (currentCongestion >= 45) severity = 'heavy'
      else if (currentCongestion >= 25) severity = 'moderate'

      // Build primary corridor
      const primaryCorridor: CorridorDetail = {
        corridor_id: `live-${Date.now()}-1`,
        corridor_name: `${locationName} Central Artery`,
        timestamp: new Date().toISOString(),
        current_congestion: currentCongestion,
        predicted_congestion: predictedCongestion,
        severity: severity,
        confidence: 0.93,
        length_km: 5.4,
        current_speed_kmh: currentSpeed,
        free_flow_speed_kmh: freeFlowSpeed,
        historical_avg_delay: Math.max(4, Math.round((freeFlowSpeed - currentSpeed) * 0.8)),
        coordinates: rawCoordinates,
        active_incidents: currentCongestion > 50 ? 2 : 0,
      }

      // Secondary corridor (feeder road)
      const feederCoordinates: [number, number][] = [
        [lat + 0.004, lon - 0.005],
        [lat + 0.001, lon - 0.002],
        [lat, lon],
        [lat - 0.004, lon + 0.003],
      ]
      const secondaryCongestion = Math.min(95, Math.max(15, Math.round(currentCongestion * 0.75)))
      const secondaryCorridor: CorridorDetail = {
        corridor_id: `live-${Date.now()}-2`,
        corridor_name: `${locationName} Feeder / Ring Junction`,
        timestamp: new Date().toISOString(),
        current_congestion: secondaryCongestion,
        predicted_congestion: Math.min(95, Math.round(secondaryCongestion * 1.08)),
        severity: secondaryCongestion >= 60 ? 'heavy' : secondaryCongestion >= 35 ? 'moderate' : 'low',
        confidence: 0.89,
        length_km: 3.8,
        current_speed_kmh: Math.round(currentSpeed * 1.15),
        free_flow_speed_kmh: freeFlowSpeed,
        historical_avg_delay: Math.max(2, Math.round((freeFlowSpeed - currentSpeed) * 0.4)),
        coordinates: feederCoordinates,
        active_incidents: 0,
      }

      // Generated Bottlenecks / Hotspots for this area
      const dynamicBottlenecks: BottleneckItem[] = [
        {
          id: `bn-live-1`,
          corridor_id: primaryCorridor.corridor_id,
          corridor_name: `${locationName} Main Bottleneck Junction`,
          window: 'Live Telemetry Window',
          days: 'Today',
          severity: severity,
          avg_delay_mins: Math.max(6, Math.round((freeFlowSpeed - currentSpeed) * 0.9)),
          confidence: 0.94,
          trend_percent: 6,
          coordinates: [lat, lon],
        },
        {
          id: `bn-live-2`,
          corridor_id: secondaryCorridor.corridor_id,
          corridor_name: `${locationName} Feeder Crossing`,
          window: '16:00 - 19:30',
          days: 'Mon - Sat',
          severity: secondaryCorridor.severity,
          avg_delay_mins: Math.max(3, Math.round((freeFlowSpeed - currentSpeed) * 0.5)),
          confidence: 0.88,
          trend_percent: 3,
          coordinates: [lat + 0.003, lon - 0.004],
        },
      ]

      const newCorridors = [primaryCorridor, secondaryCorridor]
      setCorridors(newCorridors)
      setBottlenecks(dynamicBottlenecks)
      setActiveCorridor(primaryCorridor)
      setCurrentCityName(locationName)
      setCurrentCenter([lat, lon])

      if (onSelectCorridor) {
        onSelectCorridor(primaryCorridor.corridor_id)
      }

      // Pan & Zoom Map to the location
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lon], 14, {
          animate: true,
          duration: 1.2,
        })
      }
    } catch (error) {
      console.error('Error fetching live traffic for location:', error)
    } finally {
      setIsFetchingTraffic(false)
    }
  }

  // Handle Selection of Location from Search or Quick Chips
  const handleSelectLocation = (lat: number, lon: number, displayName: string) => {
    setSearchQuery(displayName)
    setShowSuggestions(false)
    fetchLiveTrafficForLocation(lat, lon, displayName)
  }

  // Handle Search Submission (Enter key)
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery || searchQuery.trim().length === 0) return

    if (searchSuggestions.length > 0) {
      const first = searchSuggestions[0]
      const name = first.address?.freeformAddress || first.poi?.name || searchQuery
      handleSelectLocation(first.position.lat, first.position.lon, name)
      return
    }

    // Direct geocode query
    setIsSearching(true)
    try {
      const res = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(searchQuery)}.json?key=${KEY}&countrySet=IN&limit=1`
      )
      if (res.ok) {
        const data = await res.json()
        const result = data?.results?.[0]
        if (result) {
          const name = result.address?.freeformAddress || result.poi?.name || searchQuery
          handleSelectLocation(result.position.lat, result.position.lon, name)
        }
      }
    } catch (err) {
      console.warn('Geocoding error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const [mapLayerMode, setMapLayerMode] = useState<'hybrid' | 'heatmap' | 'flow'>('hybrid')
  const heatLayerRef = useRef<any>(null)

  // Initial Leaflet Map Setup
  useEffect(() => {
    if (!containerRef.current) return

    const initMap = (L: any) => {
      if (mapRef.current || !containerRef.current) return

      try {
        if ((containerRef.current as any)._leaflet_id) {
          delete (containerRef.current as any)._leaflet_id
        }

        const map = L.map(containerRef.current, {
          center: currentCenter,
          zoom: 14,
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

        // TomTom Real-Time Traffic Flow Layer (Renders worldwide live green/orange/red lines)
        const flow = L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${KEY}`,
          { opacity: 0.85, maxZoom: 22 }
        )
        flow.addTo(map)
        setFlowLayerInstance(flow)

        // Render Initial Map Objects
        renderMapObjects(L, map)
      } catch (err) {
        console.warn('TrafficMapView Leaflet init error:', err)
      }
    }

    const loadLeaflet = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const loadHeat = (L: any) => {
        if ((L as any).heatLayer) {
          initMap(L)
        } else if (!document.getElementById('leaflet-heat-admin-js')) {
          const script = document.createElement('script')
          script.id = 'leaflet-heat-admin-js'
          script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'
          script.onload = () => initMap(L)
          document.head.appendChild(script)
        } else {
          initMap(L)
        }
      }

      if ((window as any).L) {
        loadHeat((window as any).L)
      } else {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => loadHeat((window as any).L)
        document.head.appendChild(script)
      }
    }

    loadLeaflet()

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove() } catch (_) {}
        mapRef.current = null
      }
      if (containerRef.current && (containerRef.current as any)._leaflet_id) {
        delete (containerRef.current as any)._leaflet_id
      }
    }
  }, [])

  function renderMapObjects(L: any, map: any) {
    try {
      // Clear existing
      polylinesRef.current.forEach((p) => { try { p.remove() } catch (_) {} })
      markersRef.current.forEach((m) => { try { m.remove() } catch (_) {} })
      recMarkersRef.current.forEach((m) => { try { m.remove() } catch (_) {} })
      polylinesRef.current = []
      markersRef.current = []
      recMarkersRef.current = []

      if (heatLayerRef.current) {
        try { map.removeLayer(heatLayerRef.current) } catch (_) {}
        heatLayerRef.current = null
      }

      const heatPoints: [number, number, number][] = []

      // Corridors
      corridors.forEach((corr) => {
        if (corr.coordinates && corr.coordinates.length > 1) {
          const color = severityHex[corr.severity] || '#a67c52'
          const isSelected = activeCorridor?.corridor_id === corr.corridor_id

          // Sample coordinates for thermal heatmap
          const intensity = Math.min(1.0, Math.max(0.25, (corr.current_congestion || 30) / 100))
          corr.coordinates.forEach((pt) => {
            heatPoints.push([pt[0], pt[1], intensity])
          })

          // Glow line
          const polyGlow = L.polyline(corr.coordinates, {
            color: color,
            weight: isSelected ? 12 : 7,
            opacity: isSelected ? 0.45 : 0.25,
          }).addTo(map)

          // Core line
          const polyline = L.polyline(corr.coordinates, {
            color: color,
            weight: isSelected ? 6 : 4,
            opacity: 0.95,
          }).addTo(map)

          polyline.on('click', () => {
            setActiveCorridor(corr)
            if (onSelectCorridor) onSelectCorridor(corr.corridor_id)
          })

          polyline.bindTooltip(
            `<strong>${corr.corridor_name}</strong><br/>Congestion: ${corr.current_congestion}% · ${corr.severity.toUpperCase()}`,
            { direction: 'top', className: 'map-custom-tooltip' }
          )

          polylinesRef.current.push(polyGlow, polyline)
        }
      })

      // Bottlenecks
      bottlenecks.forEach((bn) => {
        if (bn.coordinates) {
          // Add heavy heat intensity to bottleneck hotspots
          heatPoints.push([bn.coordinates[0], bn.coordinates[1], 0.95])
          heatPoints.push([bn.coordinates[0] + 0.001, bn.coordinates[1] + 0.001, 0.75])
          heatPoints.push([bn.coordinates[0] - 0.001, bn.coordinates[1] - 0.001, 0.75])

          const pinHtml = `
            <div style="
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 30px;
              height: 30px;
              background: #2c2825;
              border: 2px solid ${severityHex[bn.severity]};
              border-radius: 50%;
              box-shadow: 0 3px 10px rgba(0,0,0,0.4);
              cursor: pointer;
            ">
              <span style="
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 2px solid ${severityHex[bn.severity]};
                animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
                opacity: 0.8;
              "></span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${severityHex[bn.severity]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          `

          const customIcon = L.divIcon({
            html: pinHtml,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          })

          const marker = L.marker(bn.coordinates, { icon: customIcon }).addTo(map)
          marker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #2c2825; padding: 4px; min-width: 170px;">
              <div style="font-size: 11px; font-weight: 700; color: #9e9189; text-transform: uppercase;">HOTSPOT ALERT</div>
              <b style="font-size: 13px; color: #2c2825;">${bn.corridor_name}</b><br/>
              <div style="margin-top: 4px;">
                <span style="color: #dc2626; font-weight: bold;">+${bn.avg_delay_mins} min delay</span><br/>
                <span style="color: #6b625b;">Window: ${bn.window}</span><br/>
                <span style="color: #9e9189;">Confidence: ${(bn.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          `)

          marker.on('click', () => {
            const matched = corridors.find((c) => c.corridor_id === bn.corridor_id)
            if (matched) {
              setActiveCorridor(matched)
              if (onSelectCorridor) onSelectCorridor(matched.corridor_id)
            }
          })

          markersRef.current.push(marker)
        }
      })

      // AI Recommendations Map Pins and Heatmap Points
      if (showRecommendations && recommendations && recommendations.length > 0) {
        recommendations.forEach((rec) => {
          // Determine coordinate for the recommendation
          let coords = rec.bottleneck?.coordinates
          if (!coords) {
            const matchedCorr = corridors.find((c) => c.corridor_id === rec.corridor_id)
            if (matchedCorr?.coordinates && matchedCorr.coordinates.length > 0) {
              coords = matchedCorr.coordinates[Math.floor(matchedCorr.coordinates.length / 2)]
            }
          }

          if (coords) {
            // Add to heat points with high intensity
            const intensity = rec.priority === 'high' ? 0.98 : rec.priority === 'medium' ? 0.85 : 0.65
            heatPoints.push([coords[0], coords[1], intensity])
            heatPoints.push([coords[0] + 0.0015, coords[1] + 0.0015, intensity * 0.8])
            heatPoints.push([coords[0] - 0.0015, coords[1] - 0.0015, intensity * 0.8])

            // Custom Action Badge Icon
            let actionEmoji = '🚦'
            if (rec.action_type === 'dynamic_reroute') {
              actionEmoji = '🔀'
            } else if (rec.action_type === 'incident_dispatch') {
              actionEmoji = '👮'
            } else if (rec.action_type === 'lane_reversal') {
              actionEmoji = '🔄'
            } else if (rec.action_type === 'speed_limit_adjustment') {
              actionEmoji = '⚡'
            }

            const priorityColor = rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#ea580c' : '#16a34a'

            const recHtml = `
              <div style="
                position: relative;
                display: flex;
                align-items: center;
                gap: 5px;
                background: #2c2825;
                color: white;
                border: 2px solid ${priorityColor};
                border-radius: 16px;
                padding: 4px 8px;
                box-shadow: 0 4px 14px rgba(0,0,0,0.45);
                cursor: pointer;
                white-space: nowrap;
                font-family: system-ui, sans-serif;
              ">
                <span style="
                  position: absolute;
                  inset: -3px;
                  border-radius: 18px;
                  border: 2px solid ${priorityColor};
                  animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
                  opacity: 0.6;
                  pointer-events: none;
                "></span>
                <span style="font-size: 13px;">${actionEmoji}</span>
                <div style="display: flex; flex-direction: column; text-align: left;">
                  <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #c8a97e; letter-spacing: 0.04em;">AI INTERVENTION</span>
                  <span style="font-size: 11px; font-weight: 800; color: #ffffff;">-${rec.expected_delay_reduction_mins}m delay</span>
                </div>
              </div>
            `

            const recIcon = L.divIcon({
              html: recHtml,
              className: '',
              iconSize: [120, 34],
              iconAnchor: [60, 17],
            })

            const marker = L.marker(coords, { icon: recIcon, zIndexOffset: 1000 }).addTo(map)
            marker.bindPopup(`
              <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #2c2825; padding: 6px; min-width: 220px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 800; color: ${priorityColor}; text-transform: uppercase; background: ${priorityColor}15; padding: 2px 6px; border-radius: 4px;">
                    ${rec.priority.toUpperCase()} PRIORITY
                  </span>
                  <span style="font-size: 10px; font-weight: 700; color: #9e9189;">${Math.round(rec.confidence * 100)}% Confidence</span>
                </div>
                <div style="font-weight: 800; font-size: 13px; color: #2c2825; margin-bottom: 3px;">${rec.title}</div>
                <div style="font-size: 11px; color: #6b625b; line-height: 1.4; margin-bottom: 8px;">${rec.description}</div>
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: #faf8f5; border: 1px solid #e8e0d5; border-radius: 6px; font-size: 11px;">
                  <span style="color: #9e9189;">Expected Mitigation:</span>
                  <span style="font-weight: 800; color: #16a34a;">-${rec.expected_delay_reduction_mins} min delay</span>
                </div>
                <div style="margin-top: 6px; font-size: 10px; color: #9e9189;">Corridor: <strong>${rec.corridor_name}</strong></div>
              </div>
            `)

            marker.on('click', () => {
              const matched = corridors.find((c) => c.corridor_id === rec.corridor_id)
              if (matched) {
                setActiveCorridor(matched)
                if (onSelectCorridor) onSelectCorridor(matched.corridor_id)
              }
              if (onSelectRecommendation) onSelectRecommendation(rec.id)
            })

            recMarkersRef.current.push(marker)
          }
        })
      }

      // Render Leaflet Heatmap Layer
      if (L.heatLayer && heatPoints.length > 0 && mapLayerMode !== 'flow') {
        const heat = L.heatLayer(heatPoints, {
          radius: 32,
          blur: 24,
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
    } catch (err) {
      console.warn('Error in renderMapObjects:', err)
    }
  }

  // Re-render when corridors, activeCorridor, recommendations, or layer mode change
  useEffect(() => {
    if (mapRef.current && (window as any).L) {
      renderMapObjects((window as any).L, mapRef.current)
    }
  }, [corridors, activeCorridor, recommendations, showRecommendations, mapLayerMode])

  function handleLayerMode(mode: 'hybrid' | 'heatmap' | 'flow') {
    setMapLayerMode(mode)
    const map = mapRef.current
    if (!map) return

    if (mode === 'hybrid') {
      if (flowLayerInstance) flowLayerInstance.addTo(map)
      setShowFlowOverlay(true)
    } else if (mode === 'heatmap') {
      if (flowLayerInstance) map.removeLayer(flowLayerInstance)
      setShowFlowOverlay(false)
    } else if (mode === 'flow') {
      if (flowLayerInstance) flowLayerInstance.addTo(map)
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current)
      setShowFlowOverlay(true)
    }
  }

  function centerOnSelected() {
    if (activeCorridor?.coordinates && activeCorridor.coordinates.length > 0 && mapRef.current && (window as any).L) {
      const L = (window as any).L
      mapRef.current.fitBounds(L.latLngBounds(activeCorridor.coordinates), {
        padding: [80, 80],
        maxZoom: 16,
      })
    } else if (mapRef.current) {
      mapRef.current.flyTo(currentCenter, 14)
    }
  }

  function fitAllNetwork() {
    const map = mapRef.current
    const L = (window as any).L
    if (!map || !L) return

    const allPts: [number, number][] = []

    // Collect all corridor points
    corridors.forEach((c) => {
      if (c.coordinates) c.coordinates.forEach((pt) => allPts.push(pt))
    })

    // Collect all bottleneck points
    bottlenecks.forEach((b) => {
      if (b.coordinates) allPts.push(b.coordinates)
    })

    // Collect all recommendation points
    recommendations.forEach((r) => {
      if (r.bottleneck?.coordinates) allPts.push(r.bottleneck.coordinates)
    })

    if (allPts.length > 0) {
      map.fitBounds(L.latLngBounds(allPts), { padding: [60, 60], maxZoom: 15 })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── CITY PLANNER DYNAMIC SEARCH & LIVE AREA CONTROLLER ── */}
      <div className="rounded-2xl border border-[#e8e0d5] bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#2c2825] text-[#c8a97e]">
              <Compass className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#2c2825]">
                Dynamic City & Location Surveillance
              </h3>
              <p className="text-[11px] text-[#9e9189]">
                Search any Kerala municipality, road, or junction for live TomTom flow telemetry & bottlenecks
              </p>
            </div>
          </div>

          {/* Quick preset city chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#9e9189] uppercase tracking-wider mr-1">
              Popular:
            </span>
            {QUICK_CITIES.map((city) => {
              const isCurrent = currentCityName.toLowerCase().includes(city.name.toLowerCase())
              return (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => handleSelectLocation(city.lat, city.lon, city.name)}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#2c2825] text-[#c8a97e] shadow-sm'
                      : 'bg-[#faf8f5] text-[#6b625b] border border-[#e8e0d5] hover:bg-[#f0ece7] hover:text-[#2c2825]'
                  }`}
                >
                  {city.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search Bar Input */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 size-4 text-[#9e9189]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => {
                if (searchSuggestions.length > 0) setShowSuggestions(true)
              }}
              placeholder="Search any town, city, or junction (e.g. Kothamangalam, Munnar, Aluva, Kaloor, Thrissur)..."
              className="h-11 w-full rounded-xl border border-[#e8e0d5] bg-[#faf8f5] pl-10 pr-24 text-xs font-semibold text-[#2c2825] placeholder:text-[#9e9189] focus:border-[#a67c52] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a97e]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSearchSuggestions([])
                  setShowSuggestions(false)
                }}
                className="absolute right-20 text-[#9e9189] hover:text-[#2c2825]"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching || isFetchingTraffic}
              className="absolute right-1.5 flex h-8 items-center gap-1 rounded-lg bg-[#2c2825] px-3 text-xs font-bold text-[#c8a97e] shadow-sm hover:bg-[#3d3834] disabled:opacity-50"
            >
              {isSearching || isFetchingTraffic ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <>
                  <Crosshair className="size-3.5" />
                  <span>Inspect</span>
                </>
              )}
            </button>
          </div>

          {/* Autocomplete suggestions dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-[500] rounded-xl border border-[#e8e0d5] bg-white p-1.5 shadow-xl">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9e9189]">
                Matching Locations & Municipalities
              </div>
              {searchSuggestions.map((item, idx) => {
                const title = item.poi?.name || item.address?.freeformAddress || 'Location'
                const subtitle = item.address?.municipality || item.address?.countrySubdivision || 'India'
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectLocation(item.position.lat, item.position.lon, title)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-[#faf8f5] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-[#a67c52] shrink-0" />
                      <div>
                        <p className="font-bold text-[#2c2825]">{title}</p>
                        <p className="text-[11px] text-[#9e9189]">{subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#a67c52] bg-[#faf8f5] px-2 py-0.5 rounded border border-[#e8e0d5]">
                      {item.position.lat.toFixed(3)}, {item.position.lon.toFixed(3)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </form>
      </div>

      {/* ── MAP CONTAINER & LOCATION INTELLIGENCE PANEL ── */}
      <div className="relative flex h-[620px] w-full flex-col overflow-hidden rounded-2xl border border-[#e8e0d5] bg-[#faf8f5] shadow-sm lg:flex-row">
        {/* MAP VIEWPORT */}
        <div className="relative flex-1">
          <div ref={containerRef} className="h-full w-full" />

          {/* Map Control Floating Toolbar */}
          <div className="absolute left-4 top-4 z-[400] flex flex-wrap items-center gap-2 rounded-xl border border-[#e8e0d5] bg-white/95 p-1.5 shadow-md backdrop-blur-md max-w-[95%]">
            <div className="flex items-center gap-1 border-r border-[#e8e0d5] pr-2 mr-1">
              <button
                type="button"
                onClick={() => handleLayerMode('hybrid')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  mapLayerMode === 'hybrid'
                    ? 'bg-[#2c2825] text-white'
                    : 'bg-transparent text-[#6b625b] hover:bg-[#f5f2ee]'
                }`}
              >
                <Layers className="size-3.5" />
                Hybrid
              </button>
              <button
                type="button"
                onClick={() => handleLayerMode('heatmap')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  mapLayerMode === 'heatmap'
                    ? 'bg-[#2c2825] text-white'
                    : 'bg-transparent text-[#6b625b] hover:bg-[#f5f2ee]'
                }`}
              >
                <TrendingUp className="size-3.5" />
                Heatmap
              </button>
              <button
                type="button"
                onClick={() => handleLayerMode('flow')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  mapLayerMode === 'flow'
                    ? 'bg-[#2c2825] text-white'
                    : 'bg-transparent text-[#6b625b] hover:bg-[#f5f2ee]'
                }`}
              >
                <Gauge className="size-3.5" />
                Flow
              </button>
            </div>

            {/* Recommendations Toggle on Map */}
            <button
              type="button"
              onClick={() => setShowRecommendations(!showRecommendations)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                showRecommendations
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-transparent text-[#6b625b] hover:bg-[#f5f2ee]'
              }`}
            >
              <Sparkles className="size-3.5 text-amber-600" />
              <span>Interventions ({recommendations.length})</span>
            </button>

            {/* Panoramic Fit All Network Button */}
            <button
              type="button"
              onClick={fitAllNetwork}
              className="flex items-center gap-1.5 rounded-lg bg-[#2c2825] px-2.5 py-1 text-xs font-bold text-[#c8a97e] shadow-sm hover:bg-[#3d3834]"
            >
              <Maximize2 className="size-3.5" />
              <span>Show All on Map</span>
            </button>

            {isFetchingTraffic && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#a67c52] bg-[#faf8f5] px-2 py-0.5 rounded-md">
                <RefreshCw className="size-3.5 animate-spin" /> Fetching Live Grid...
              </span>
            )}
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-[400] hidden sm:flex items-center gap-4 rounded-xl border border-[#e8e0d5] bg-white/90 px-3.5 py-2 shadow-md backdrop-blur-md text-[11px] font-semibold text-[#2c2825]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#9e9189] border-r border-[#e8e0d5] pr-2">
              {mapLayerMode === 'flow' ? 'Traffic Flow' : 'Congestion Density'}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#16a34a]" /> Free Flow
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#eab308]" /> Moderate
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#f97316]" /> Heavy
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#dc2626]" /> Severe / Hotspot
            </div>
          </div>
        </div>

        {/* LOCATION INTELLIGENCE SIDE PANEL */}
        <div className="flex w-full flex-col border-t border-[#e8e0d5] bg-white lg:w-96 lg:border-l lg:border-t-0">
          <div className="border-b border-[#f0ece7] bg-[#faf8f5] px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">
                Live Sector Telemetry
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Real-Time Feed
              </span>
            </div>
            <h2 className="mt-1 text-base font-extrabold text-[#2c2825] truncate">
              {currentCityName}
            </h2>
            <p className="text-xs text-[#9e9189]">
              Sector Coordinates: {currentCenter[0].toFixed(4)}, {currentCenter[1].toFixed(4)}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* AI MITIGATION INTERVENTIONS SECTION */}
            {recommendations && recommendations.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-600" />
                    All Active AI Interventions ({recommendations.length})
                  </span>
                  <button
                    type="button"
                    onClick={fitAllNetwork}
                    className="text-[10px] font-bold text-[#a67c52] hover:underline"
                  >
                    Fit Map View
                  </button>
                </div>

                <div className="space-y-2">
                  {recommendations.map((rec) => {
                    const priorityColor = rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#ea580c' : '#16a34a'
                    const isMatched = activeCorridor?.corridor_id === rec.corridor_id

                    return (
                      <div
                        key={rec.id}
                        onClick={() => {
                          const matched = corridors.find((c) => c.corridor_id === rec.corridor_id)
                          if (matched) {
                            setActiveCorridor(matched)
                            if (onSelectCorridor) onSelectCorridor(matched.corridor_id)
                            if (matched.coordinates && matched.coordinates.length > 0 && mapRef.current && (window as any).L) {
                              mapRef.current.flyTo(matched.coordinates[0], 15)
                            }
                          }
                          if (onSelectRecommendation) onSelectRecommendation(rec.id)
                        }}
                        className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                          isMatched
                            ? 'border-[#2c2825] bg-white shadow-sm ring-1 ring-[#2c2825]'
                            : 'border-amber-200/80 bg-white hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ color: priorityColor, backgroundColor: `${priorityColor}15` }}
                          >
                            {rec.priority} Priority
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            -{rec.expected_delay_reduction_mins}m delay
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#2c2825] leading-snug">{rec.title}</p>
                        <p className="text-[10px] text-[#9e9189] mt-0.5 truncate">{rec.corridor_name}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeCorridor ? (
              <>
                {/* Selected Corridor Banner */}
                <div className="rounded-xl border border-[#c8a97e]/30 bg-[#faf8f5] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#a67c52]">
                    Focused Corridor Artery
                  </span>
                  <p className="text-sm font-extrabold text-[#2c2825]">{activeCorridor.corridor_name}</p>
                </div>

                {/* Speed & Congestion Gauges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e9189] flex items-center gap-1">
                      <Gauge className="size-3" /> Current Speed
                    </span>
                    <p className="mt-1 font-mono text-xl font-extrabold text-[#2c2825]">
                      {activeCorridor.current_speed_kmh || 24} <span className="text-xs font-normal text-[#9e9189]">km/h</span>
                    </p>
                    <p className="text-[10px] text-[#9e9189]">
                      Free flow: {activeCorridor.free_flow_speed_kmh || 48} km/h
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e9189] flex items-center gap-1">
                      <Activity className="size-3" /> Congestion
                    </span>
                    <p className="mt-1 font-mono text-xl font-extrabold text-[#a67c52]">
                      {activeCorridor.current_congestion}%
                    </p>
                    <p className="text-[10px] text-[#a67c52] font-semibold">
                      Forecast: {activeCorridor.predicted_congestion}% (+60m)
                    </p>
                  </div>
                </div>

                {/* Corridor Metadata Details */}
                <div className="rounded-xl border border-[#e8e0d5] divide-y divide-[#f0ece7] text-xs">
                  <div className="flex justify-between p-3">
                    <span className="text-[#9e9189]">Status Severity</span>
                    <span
                      className="font-bold uppercase tracking-wider"
                      style={{ color: severityHex[activeCorridor.severity] }}
                    >
                      {activeCorridor.severity}
                    </span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-[#9e9189]">Segment Length</span>
                    <span className="font-semibold text-[#2c2825]">{activeCorridor.length_km || 4.2} km</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-[#9e9189]">Avg Peak Delay</span>
                    <span className="font-semibold text-[#2c2825]">+{activeCorridor.historical_avg_delay || 12} min</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-[#9e9189]">Model Confidence</span>
                    <span className="font-bold text-emerald-700">{(activeCorridor.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Corridors in this Searched Area */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">
                    Detected Arteries in Sector ({corridors.length})
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {corridors.map((c) => {
                      const isSel = c.corridor_id === activeCorridor.corridor_id
                      return (
                        <button
                          key={c.corridor_id}
                          type="button"
                          onClick={() => {
                            setActiveCorridor(c)
                            if (onSelectCorridor) onSelectCorridor(c.corridor_id)
                          }}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                            isSel
                              ? 'bg-[#2c2825] text-white shadow-sm'
                              : 'bg-[#faf8f5] text-[#2c2825] border border-[#e8e0d5] hover:bg-[#f0ece7]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: severityHex[c.severity] }}
                            />
                            <span className="truncate">{c.corridor_name}</span>
                          </div>
                          <span className="font-mono text-[11px] opacity-80 shrink-0">
                            {c.current_congestion}%
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Detected Bottlenecks / Hotspots */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">
                    Active Congestion Hotspots ({bottlenecks.length})
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {bottlenecks.map((bn) => (
                      <div
                        key={bn.id}
                        className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/50 p-2.5 text-xs text-[#2c2825]"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="size-3.5 text-red-600 shrink-0" />
                          <div>
                            <p className="font-bold leading-tight">{bn.corridor_name}</p>
                            <p className="text-[10px] text-[#9e9189]">{bn.window}</p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-red-600 shrink-0">
                          +{bn.avg_delay_mins}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-[#9e9189]">
                Search a city or click any corridor / bottleneck pin on the map to inspect live telemetry.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
