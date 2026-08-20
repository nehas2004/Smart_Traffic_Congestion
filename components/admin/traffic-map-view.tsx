'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { CorridorDetail, BottleneckItem, SeverityLevel, TrafficRecommendation, ReportedIncident } from '@/types/traffic'
import {
  Layers,
  Activity,
  AlertTriangle,
  Zap,
  Clock,
  Gauge,
  Maximize2,
  RefreshCw,
  Compass,
  AlertCircle,
  TrendingUp,
  X,
  Sparkles,
  Flame,
  ShieldAlert,
  Building2,
} from 'lucide-react'

interface TrafficMapViewProps {
  corridors: CorridorDetail[]
  bottlenecks: BottleneckItem[]
  recommendations?: TrafficRecommendation[]
  selectedCorridorId?: string
  activeCityName?: string
  activeCoords?: { lat: number; lon: number }
  isLoading?: boolean
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

const PRESET_CITIES = [
  { name: 'Kozhikode', lat: 11.2588, lon: 75.7804 },
  { name: 'Kochi (Ernakulam)', lat: 10.0033, lon: 76.2996 },
  { name: 'Thrissur', lat: 10.5276, lon: 76.2144 },
  { name: 'Trivandrum', lat: 8.5241, lon: 76.9366 },
  { name: 'Kothamangalam', lat: 10.0601, lon: 76.6214 },
  { name: 'Aluva', lat: 10.1076, lon: 76.3516 },
  { name: 'Munnar', lat: 10.0889, lon: 77.0595 },
]

export function TrafficMapView({
  corridors,
  bottlenecks,
  recommendations = [],
  selectedCorridorId,
  activeCityName: propCityName,
  activeCoords: propCoords,
  isLoading = false,
  onSelectCorridor,
  onSelectRecommendation,
}: TrafficMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const polylinesRef = useRef<any[]>([])
  const markersRef = useRef<any[]>([])
  const recMarkersRef = useRef<any[]>([])
  const incidentMarkersRef = useRef<any[]>([])
  const radiusCircleRef = useRef<any>(null)
  const heatLayerRef = useRef<any>(null)

  // Determine active city & coordinates (Single Source of Truth)
  const [currentCityName, setCurrentCityName] = useState<string>(propCityName || 'Kochi (Ernakulam)')
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(
    propCoords ? [propCoords.lat, propCoords.lon] : [10.0033, 76.2996]
  )

  const [incidents, setIncidents] = useState<ReportedIncident[]>([])
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [activeCorridor, setActiveCorridor] = useState<CorridorDetail | null>(null)
  const [showFlowOverlay, setShowFlowOverlay] = useState(true)
  const [flowLayerInstance, setFlowLayerInstance] = useState<any>(null)
  const [mapLayerMode, setMapLayerMode] = useState<'hybrid' | 'heatmap' | 'flow'>('hybrid')

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  // Sync with props when parent updates
  useEffect(() => {
    if (propCityName) setCurrentCityName(propCityName)
    if (propCoords && (propCoords.lat !== currentCenter[0] || propCoords.lon !== currentCenter[1])) {
      setCurrentCenter([propCoords.lat, propCoords.lon])
      if (mapRef.current) {
        mapRef.current.flyTo([propCoords.lat, propCoords.lon], 13, { duration: 1.0 })
      }
    }
  }, [propCityName, propCoords])

  // Sync active corridor selection
  useEffect(() => {
    if (selectedCorridorId && corridors.length > 0) {
      const found = corridors.find((c) => c.corridor_id === selectedCorridorId)
      if (found) setActiveCorridor(found)
    } else if (corridors.length > 0 && !activeCorridor) {
      setActiveCorridor(corridors[0])
    }
  }, [selectedCorridorId, corridors, activeCorridor])

  // Fetch active incidents for active location
  const loadIncidents = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/incidents?lat=${lat}&lon=${lon}&radiusKm=20`)
      if (res.ok) {
        const data = await res.json()
        setIncidents(data || [])
      }
    } catch (_) {}
  }, [])

  // Listen to planner city changed events from sidebar or other tabs
  useEffect(() => {
    // Initial read from localStorage
    try {
      const saved = localStorage.getItem('planner_active_city')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.lat && parsed.lon) {
          const name = parsed.cityName || parsed.name || 'Selected City'
          setCurrentCityName(name)
          setCurrentCenter([parsed.lat, parsed.lon])
          if (mapRef.current) {
            mapRef.current.flyTo([parsed.lat, parsed.lon], 13, { duration: 0.8 })
          }
        }
      }
    } catch (_) {}

    const onCityChange = (e: any) => {
      if (e.detail && e.detail.lat && e.detail.lon) {
        const { lat, lon, name, cityName } = e.detail
        const displayName = cityName || name || 'Selected Sector'
        setCurrentCityName(displayName)
        setCurrentCenter([lat, lon])
        loadIncidents(lat, lon)
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lon], 13, { duration: 1.0 })
        }
      }
    }

    const onIncidentReported = (e: any) => {
      if (e.detail) {
        setIncidents((prev) => [e.detail, ...prev.filter((i) => i.id !== e.detail.id)])
      }
    }

    const onIncidentResolved = (e: any) => {
      if (e.detail?.id) {
        setIncidents((prev) => prev.filter((i) => i.id !== e.detail.id))
      }
    }

    window.addEventListener('planner_city_changed', onCityChange)
    window.addEventListener('incident_reported', onIncidentReported)
    window.addEventListener('incident_resolved', onIncidentResolved)
    return () => {
      window.removeEventListener('planner_city_changed', onCityChange)
      window.removeEventListener('incident_reported', onIncidentReported)
      window.removeEventListener('incident_resolved', onIncidentResolved)
    }
  }, [loadIncidents])

  // Global helper for resolving reported incidents
  useEffect(() => {
    ;(window as any).__resolveIncident = async (id: string) => {
      try {
        const res = await fetch(`/api/incidents?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
          window.dispatchEvent(new CustomEvent('incident_resolved', { detail: { id } }))
          setIncidents((prev) => prev.filter((i) => i.id !== id))
        }
      } catch (_) {}
    }
  }, [])

  // Handle City Change Selection (Single Source of Truth)
  const handleSelectCity = (lat: number, lon: number, displayName: string) => {
    const sector = {
      name: displayName,
      cityName: displayName,
      lat,
      lon,
      radiusKm: 10,
    }
    try {
      localStorage.setItem('planner_active_city', JSON.stringify(sector))
      localStorage.setItem('planner_has_selected_city', 'true')
    } catch (_) {}
    setCurrentCityName(displayName)
    setCurrentCenter([lat, lon])
    window.dispatchEvent(new CustomEvent('planner_city_changed', { detail: sector }))
  }

  // Initial Leaflet Map Setup with Automatic Map Focus
  useEffect(() => {
    if (!containerRef.current) return

    const initMap = (L: any) => {
      if (mapRef.current || !containerRef.current) return

      try {
        if ((containerRef.current as any)._leaflet_id) {
          delete (containerRef.current as any)._leaflet_id
        }

        // Get saved center or default
        let initialCenter = currentCenter
        try {
          const saved = localStorage.getItem('planner_active_city')
          if (saved) {
            const p = JSON.parse(saved)
            if (p.lat && p.lon) initialCenter = [p.lat, p.lon]
          }
        } catch (_) {}

        const map = L.map(containerRef.current, {
          center: initialCenter,
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

        // TomTom Real-Time Traffic Flow Layer
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
      // Clear existing elements
      polylinesRef.current.forEach((p) => { try { p.remove() } catch (_) {} })
      markersRef.current.forEach((m) => { try { m.remove() } catch (_) {} })
      recMarkersRef.current.forEach((m) => { try { m.remove() } catch (_) {} })
      incidentMarkersRef.current.forEach((m) => { try { m.remove() } catch (_) {} })
      polylinesRef.current = []
      markersRef.current = []
      recMarkersRef.current = []
      incidentMarkersRef.current = []

      if (heatLayerRef.current) {
        try { map.removeLayer(heatLayerRef.current) } catch (_) {}
        heatLayerRef.current = null
      }

      // Draw 10km Radius Surveillance Boundary Circle
      if (radiusCircleRef.current) {
        try { map.removeLayer(radiusCircleRef.current) } catch (_) {}
        radiusCircleRef.current = null
      }
      const radiusCircle = L.circle(currentCenter, {
        radius: 10000,
        color: '#2563eb',
        weight: 2,
        dashArray: '6, 8',
        fillColor: '#3b82f6',
        fillOpacity: 0.05,
      }).addTo(map)
      radiusCircle.bindTooltip(`<b>10 km Surveillance Sector</b><br/>${currentCityName}`, {
        permanent: false,
        direction: 'center',
      })
      radiusCircleRef.current = radiusCircle

      const heatPoints: [number, number, number][] = []

      // Render Corridors
      corridors.forEach((corr) => {
        if (corr.coordinates && corr.coordinates.length > 1) {
          const color = severityHex[corr.severity] || '#a67c52'
          const isSelected = activeCorridor?.corridor_id === corr.corridor_id

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
            `<strong>${corr.corridor_name}</strong><br/>` +
            `Speed: ${corr.current_speed_kmh} km/h (Free Flow: ${corr.free_flow_speed_kmh} km/h)<br/>` +
            `Congestion: ${corr.current_congestion}% · ${corr.severity.toUpperCase()}`,
            { direction: 'top', className: 'map-custom-tooltip' }
          )

          polylinesRef.current.push(polyGlow, polyline)
        }
      })

      // Render Bottlenecks
      bottlenecks.forEach((bn) => {
        if (bn.coordinates) {
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
              background: #1e293b;
              border: 2px solid ${severityHex[bn.severity]};
              border-radius: 50%;
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
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
            <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; padding: 4px; min-width: 170px;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">HOTSPOT COORDINATES</div>
              <b style="font-size: 13px; color: #0f172a;">${bn.coordinates[0].toFixed(4)}° N, ${bn.coordinates[1].toFixed(4)}° E</b><br/>
              <div style="margin-top: 4px;">
                <span style="color: #dc2626; font-weight: bold;">+${bn.avg_delay_mins} min delay</span><br/>
                <span style="color: #475569;">Severity: ${bn.severity.toUpperCase()}</span><br/>
                <span style="color: #94a3b8;">Confidence: ${(bn.confidence * 100).toFixed(0)}%</span>
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

      // Render AI Recommendations
      if (showRecommendations && recommendations && recommendations.length > 0) {
        recommendations.forEach((rec) => {
          let coords = rec.bottleneck?.coordinates
          if (!coords) {
            const matchedCorr = corridors.find((c) => c.corridor_id === rec.corridor_id)
            if (matchedCorr?.coordinates && matchedCorr.coordinates.length > 0) {
              coords = matchedCorr.coordinates[Math.floor(matchedCorr.coordinates.length / 2)]
            }
          }

          if (coords) {
            const intensity = rec.priority === 'high' ? 0.98 : rec.priority === 'medium' ? 0.85 : 0.65
            heatPoints.push([coords[0], coords[1], intensity])

            let actionEmoji = '🚦'
            if (rec.action_type === 'dynamic_reroute') actionEmoji = '🔀'
            else if (rec.action_type === 'incident_dispatch') actionEmoji = '👮'
            else if (rec.action_type === 'lane_reversal') actionEmoji = '🔄'
            else if (rec.action_type === 'speed_limit_adjustment') actionEmoji = '⚡'

            const priorityColor = rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#ea580c' : '#16a34a'

            const recHtml = `
              <div style="
                position: relative;
                display: flex;
                align-items: center;
                gap: 5px;
                background: #1e293b;
                color: white;
                border: 2px solid ${priorityColor};
                border-radius: 16px;
                padding: 4px 8px;
                box-shadow: 0 4px 14px rgba(0,0,0,0.35);
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
                  <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #93c5fd; letter-spacing: 0.04em;">AI INTERVENTION</span>
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
              <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; padding: 6px; min-width: 220px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 800; color: ${priorityColor}; text-transform: uppercase; background: ${priorityColor}15; padding: 2px 6px; border-radius: 4px;">
                    ${rec.priority.toUpperCase()} PRIORITY
                  </span>
                  <span style="font-size: 10px; font-weight: 700; color: #64748b;">${Math.round(rec.confidence * 100)}% Confidence</span>
                </div>
                <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 3px;">${rec.title}</div>
                <div style="font-size: 11px; color: #475569; line-height: 1.4; margin-bottom: 8px;">${rec.description}</div>
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px;">
                  <span style="color: #64748b;">Expected Mitigation:</span>
                  <span style="font-weight: 800; color: #16a34a;">-${rec.expected_delay_reduction_mins} min delay</span>
                </div>
                <div style="margin-top: 6px; font-size: 10px; color: #64748b;">Corridor: <strong>${rec.corridor_name}</strong></div>
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

      // Render Reported Incidents
      incidents.forEach((inc) => {
        if (inc.lat && inc.lon && inc.active) {
          let emoji = '⚠️'
          if (inc.category === 'temple_fest') emoji = '🎪'
          else if (inc.category === 'accident') emoji = '💥'
          else if (inc.category === 'concert') emoji = '🎸'
          else if (inc.category === 'construction') emoji = '🚧'
          else if (inc.category === 'weather_hazard') emoji = '⛈️'
          else if (inc.category === 'procession') emoji = '🚩'

          const incHtml = `
            <div style="
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 38px;
              height: 38px;
              background: #991b1b;
              color: white;
              border: 2.5px solid #fecaca;
              border-radius: 50%;
              box-shadow: 0 4px 18px rgba(220,38,38,0.7);
              cursor: pointer;
              font-size: 19px;
            ">
              <span style="
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 2px solid #ef4444;
                animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
                opacity: 0.85;
                pointer-events: none;
              "></span>
              <span>${emoji}</span>
            </div>
          `

          const incIcon = L.divIcon({
            html: incHtml,
            className: '',
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          })

          const marker = L.marker([inc.lat, inc.lon], { icon: incIcon, zIndexOffset: 3000 }).addTo(map)
          marker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #2c2825; padding: 4px; min-width: 210px;">
              <div style="display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; color: #dc2626; text-transform: uppercase;">
                <span>${emoji} REPORTED EVENT DISRUPTION</span>
              </div>
              <b style="font-size: 13px; color: #2c2825; display: block; margin-top: 3px;">${inc.title}</b>
              <p style="font-size: 11px; color: #6b625b; margin: 4px 0;">${inc.description || ''}</p>
              <div style="margin-top: 6px; padding: 6px; background: #fef2f2; border-radius: 8px; border: 1px solid #fee2e2;">
                <div style="color: #b91c1c; font-weight: 800;">Delay Impact: +${inc.expected_delay_mins} mins</div>
                <div style="color: #991b1b; font-size: 10px;">Radius: ${inc.impact_radius_meters}m · Severity: ${inc.severity.toUpperCase()}</div>
              </div>
              <button
                onclick="window.__resolveIncident('${inc.id}')"
                style="margin-top: 8px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; background: #dc2626; color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 800; cursor: pointer; box-shadow: 0 2px 6px rgba(220,38,38,0.3);"
              >
                <span>✕ Cancel & Clear Disruption</span>
              </button>
            </div>
          `)

          incidentMarkersRef.current.push(marker)
        }
      })

      // Leaflet Heatmap Layer
      if (L.heatLayer && heatPoints.length > 0 && mapLayerMode !== 'flow') {
        const heat = L.heatLayer(heatPoints, {
          radius: 34,
          blur: 25,
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

  // Re-render map objects when data updates
  useEffect(() => {
    if (mapRef.current && (window as any).L) {
      renderMapObjects((window as any).L, mapRef.current)
    }
  }, [corridors, activeCorridor, recommendations, showRecommendations, incidents, mapLayerMode, currentCenter])

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

  function fitAllNetwork() {
    const map = mapRef.current
    const L = (window as any).L
    if (!map || !L) return

    const allPts: [number, number][] = []
    corridors.forEach((c) => {
      if (c.coordinates) c.coordinates.forEach((pt) => allPts.push(pt))
    })
    bottlenecks.forEach((b) => {
      if (b.coordinates) allPts.push(b.coordinates)
    })
    recommendations.forEach((r) => {
      if (r.bottleneck?.coordinates) allPts.push(r.bottleneck.coordinates)
    })

    if (allPts.length > 0) {
      map.fitBounds(L.latLngBounds(allPts), { padding: [60, 60], maxZoom: 15 })
    } else {
      map.flyTo(currentCenter, 13)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── CITY PLANNER DYNAMIC SEARCH & LIVE AREA CONTROLLER ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Compass className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Dynamic City & Location Surveillance
              </h3>
              <p className="text-[11px] text-slate-500">
                Search any Kerala municipality, road, or junction for live TomTom flow telemetry & bottlenecks
              </p>
            </div>
          </div>

          {/* Quick preset city chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Popular:
            </span>
            {PRESET_CITIES.map((city) => {
              const isCurrent = currentCityName.toLowerCase().includes(city.name.toLowerCase())
              return (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => handleSelectLocation(city.lat, city.lon, city.name)}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
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
            <Search className="absolute left-3.5 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => {
                if (searchSuggestions.length > 0) setShowSuggestions(true)
              }}
              placeholder="Search any town, city, or junction (e.g. Kothamangalam, Munnar, Aluva, Kaloor, Thrissur)..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-24 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSearchSuggestions([])
                  setShowSuggestions(false)
                }}
                className="absolute right-20 text-slate-400 hover:text-slate-900"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching || isFetchingTraffic}
              className="absolute right-1.5 flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
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
            <div className="absolute left-0 right-0 top-12 z-[500] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900">{title}</p>
                        <p className="text-[11px] text-slate-400">{subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
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
      <div className="relative flex h-[620px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm lg:flex-row">
        {/* MAP VIEWPORT */}
        <div className="relative flex-1">
          <div ref={containerRef} className="h-full w-full" />

          {/* Map Control Floating Toolbar */}
          <div className="absolute left-4 top-4 z-[400] flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-md backdrop-blur-md max-w-[95%]">
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
              <button
                type="button"
                onClick={() => handleLayerMode('hybrid')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  mapLayerMode === 'hybrid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="size-3.5" />
                Hybrid
              </button>
              <button
                type="button"
                onClick={() => handleLayerMode('heatmap')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  mapLayerMode === 'heatmap'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="size-3.5" />
                Heatmap
              </button>
              <button
                type="button"
                onClick={() => handleLayerMode('flow')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  mapLayerMode === 'flow'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Gauge className="size-3.5" />
                Flow
              </button>
            </div>

            {/* Recommendations Toggle */}
            <button
              type="button"
              onClick={() => setShowRecommendations(!showRecommendations)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                showRecommendations
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="size-3.5 text-emerald-600" />
              <span>Interventions ({recommendations.length})</span>
            </button>

            {/* Panoramic Fit All Network Button */}
            <button
              type="button"
              onClick={fitAllNetwork}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
            >
              <Maximize2 className="size-3.5" />
              <span>Show All on Map</span>
            </button>

            {isFetchingTraffic && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                <RefreshCw className="size-3.5 animate-spin" /> Fetching Live Grid...
              </span>
            )}
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-[400] hidden sm:flex items-center gap-4 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 shadow-md backdrop-blur-md text-[11px] font-semibold text-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-r border-slate-200 pr-2">
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
        <div className="flex w-full flex-col border-t border-slate-200 bg-white lg:w-96 lg:border-l lg:border-t-0">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Live Sector Telemetry
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live 10km Grid
              </span>
            </div>
            <h2 className="mt-1 text-base font-extrabold text-slate-900 truncate">
              {currentCityName}
            </h2>
            <p className="text-xs text-slate-500">
              Sector Coordinates: {currentCenter[0].toFixed(4)}, {currentCenter[1].toFixed(4)}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* AI MITIGATION INTERVENTIONS SECTION */}
            {recommendations && recommendations.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-emerald-600" />
                    All Active AI Interventions ({recommendations.length})
                  </span>
                  <button
                    type="button"
                    onClick={fitAllNetwork}
                    className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
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
                            ? 'border-emerald-600 bg-white shadow-xs ring-1 ring-emerald-600'
                            : 'border-emerald-100 bg-white hover:border-emerald-300'
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
                        <p className="text-xs font-bold text-slate-900 leading-snug">{rec.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{rec.corridor_name}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeCorridor ? (
              <div className="space-y-4">
                {/* Selected Corridor Banner */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Focused Corridor Artery
                  </span>
                  <p className="text-sm font-extrabold text-slate-900">{activeCorridor.corridor_name}</p>
                </div>

                {/* Speed & Congestion Gauges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Gauge className="size-3" /> Current Speed
                    </span>
                    <p className="mt-1 font-mono text-xl font-extrabold text-slate-900">
                      {activeCorridor.current_speed_kmh || 24} <span className="text-xs font-normal text-slate-400">km/h</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Free flow: {activeCorridor.free_flow_speed_kmh || 48} km/h
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Activity className="size-3" /> Congestion
                    </span>
                    <p className="mt-1 font-mono text-xl font-extrabold text-emerald-700">
                      {activeCorridor.current_congestion}%
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      Forecast: {activeCorridor.predicted_congestion}% (+60m)
                    </p>
                  </div>
                </div>

                {/* Corridor Metadata Details */}
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between p-3">
                    <span className="text-slate-400">Status Severity</span>
                    <span
                      className="font-bold uppercase tracking-wider"
                      style={{ color: severityHex[activeCorridor.severity] }}
                    >
                      {activeCorridor.severity}
                    </span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-400">Segment Length</span>
                    <span className="font-semibold text-slate-900">{activeCorridor.length_km || 4.2} km</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-400">Avg Peak Delay</span>
                    <span className="font-semibold text-slate-900">+{activeCorridor.historical_avg_delay || 12} min</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-slate-400">Model Confidence</span>
                    <span className="font-bold text-emerald-700">{(activeCorridor.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/70 rounded-xl border border-slate-100">
                Click any corridor or bottleneck pin on the map to view detailed flow telemetry.
              </div>
            )}

            {/* Corridors in this Searched Area */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Detected Arteries in Sector ({corridors.length})
              </span>
              <div className="mt-2 space-y-1.5">
                {corridors.map((c) => {
                  const isSel = c.corridor_id === activeCorridor?.corridor_id
                  return (
                    <button
                      key={c.corridor_id}
                      type="button"
                      onClick={() => {
                        setActiveCorridor(c)
                        if (onSelectCorridor) onSelectCorridor(c.corridor_id)
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                        isSel
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100'
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Congestion Hotspots ({bottlenecks.length})
              </span>
              <div className="mt-2 space-y-1.5">
                {bottlenecks.map((bn) => (
                  <div
                    key={bn.id}
                    className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 text-xs text-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-3.5 text-rose-600 shrink-0" />
                      <div>
                        <p className="font-bold leading-tight">{bn.corridor_name}</p>
                        <p className="text-[10px] text-slate-400">{bn.window}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-rose-600 shrink-0">
                      +{bn.avg_delay_mins}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
