'use client'

import { useEffect, useRef, useState } from 'react'
import { CorridorDetail, BottleneckItem, SeverityLevel } from '@/types/traffic'
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
} from 'lucide-react'

interface TrafficMapViewProps {
  corridors: CorridorDetail[]
  bottlenecks: BottleneckItem[]
  selectedCorridorId?: string
  onSelectCorridor?: (corridorId: string) => void
}

const severityHex: Record<SeverityLevel, string> = {
  low: '#16a34a',
  moderate: '#eab308',
  heavy: '#f97316',
  severe: '#dc2626',
  critical: '#991b1b',
}

export function TrafficMapView({
  corridors,
  bottlenecks,
  selectedCorridorId,
  onSelectCorridor,
}: TrafficMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const polylinesRef = useRef<any[]>([])
  const markersRef = useRef<any[]>([])

  const [activeCorridor, setActiveCorridor] = useState<CorridorDetail | null>(
    corridors.find((c) => c.corridor_id === selectedCorridorId) || corridors[0] || null
  )
  const [showFlowOverlay, setShowFlowOverlay] = useState(true)
  const [flowLayerInstance, setFlowLayerInstance] = useState<any>(null)

  useEffect(() => {
    if (selectedCorridorId) {
      const found = corridors.find((c) => c.corridor_id === selectedCorridorId)
      if (found) setActiveCorridor(found)
    }
  }, [selectedCorridorId, corridors])

  useEffect(() => {
    const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || '9IjAeUzCf9waJ3H1O3F3e7OprPPecCot'
    if (!containerRef.current) return

    const initMap = (L: any) => {
      if (mapRef.current || !containerRef.current) return

      try {
        if ((containerRef.current as any)._leaflet_id) {
          delete (containerRef.current as any)._leaflet_id
        }

        // Center on Kothamangalam monitoring region
        const map = L.map(containerRef.current, {
          center: [10.0601, 76.6214],
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

        // TomTom Real-Time Traffic Flow Layer
        const flow = L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${KEY}`,
          { opacity: 0.75, maxZoom: 22 }
        )
        flow.addTo(map)
        setFlowLayerInstance(flow)

        // Render Corridor Polylines & Markers
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

      if ((window as any).L) {
        initMap((window as any).L)
      } else {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => initMap((window as any).L)
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
      polylinesRef.current = []
      markersRef.current = []

    // Corridors
    corridors.forEach((corr) => {
      if (corr.coordinates && corr.coordinates.length > 1) {
        const color = severityHex[corr.severity] || '#a67c52'
        const isSelected = activeCorridor?.corridor_id === corr.corridor_id

        // Glow line
        const polyGlow = L.polyline(corr.coordinates, {
          color: color,
          weight: isSelected ? 12 : 8,
          opacity: isSelected ? 0.4 : 0.2,
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
        const pinHtml = `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: #2c2825;
            border: 2px solid ${severityHex[bn.severity]};
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
            cursor: pointer;
          ">
            <span style="
              position: absolute;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              border: 2px solid ${severityHex[bn.severity]};
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              opacity: 0.75;
            "></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${severityHex[bn.severity]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
        `

        const customIcon = L.divIcon({
          html: pinHtml,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const marker = L.marker(bn.coordinates, { icon: customIcon }).addTo(map)
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #2c2825; padding: 4px;">
            <b style="font-size: 13px;">${bn.corridor_name}</b><br/>
            <span style="color: #dc2626; font-weight: bold;">+${bn.avg_delay_mins} min delay</span> (${bn.window})<br/>
            <span style="color: #9e9189;">Confidence: ${(bn.confidence * 100).toFixed(0)}%</span>
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
    } catch (err) {
      console.warn('Error in renderMapObjects:', err)
    }
  }

  // Update polylines when activeCorridor changes
  useEffect(() => {
    if (mapRef.current && (window as any).L) {
      renderMapObjects((window as any).L, mapRef.current)
    }
  }, [activeCorridor])

  function toggleFlow() {
    if (flowLayerInstance && mapRef.current) {
      if (showFlowOverlay) {
        mapRef.current.removeLayer(flowLayerInstance)
        setShowFlowOverlay(false)
      } else {
        flowLayerInstance.addTo(mapRef.current)
        setShowFlowOverlay(true)
      }
    }
  }

  function centerOnSelected() {
    if (activeCorridor?.coordinates && activeCorridor.coordinates.length > 0 && mapRef.current && (window as any).L) {
      const L = (window as any).L
      mapRef.current.fitBounds(L.latLngBounds(activeCorridor.coordinates), {
        padding: [80, 80],
        maxZoom: 16,
      })
    }
  }

  return (
    <div className="relative flex h-[620px] w-full flex-col overflow-hidden rounded-2xl border border-[#e8e0d5] bg-[#faf8f5] shadow-sm lg:flex-row">
      {/* MAP VIEWPORT */}
      <div className="relative flex-1">
        <div ref={containerRef} className="h-full w-full" />

        {/* Map Control Floating Toolbar */}
        <div className="absolute left-4 top-4 z-[400] flex items-center gap-2 rounded-xl border border-[#e8e0d5] bg-white/90 p-1.5 shadow-md backdrop-blur-md">
          <button
            type="button"
            onClick={toggleFlow}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              showFlowOverlay
                ? 'bg-[#2c2825] text-white'
                : 'bg-transparent text-[#6b625b] hover:bg-[#f5f2ee]'
            }`}
          >
            <Layers className="size-3.5" />
            TomTom Flow
          </button>

          <button
            type="button"
            onClick={centerOnSelected}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-[#6b625b] hover:bg-[#f5f2ee]"
          >
            <Maximize2 className="size-3.5" />
            Focus Corridor
          </button>
        </div>

        {/* Map Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-[400] hidden sm:flex items-center gap-4 rounded-xl border border-[#e8e0d5] bg-white/90 px-3.5 py-2 shadow-md backdrop-blur-md text-[11px] font-semibold text-[#2c2825]">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#16a34a]" /> Low
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#eab308]" /> Moderate
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#f97316]" /> Heavy
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#dc2626]" /> Severe
          </div>
        </div>
      </div>

      {/* LOCATION INTELLIGENCE SIDE PANEL */}
      <div className="flex w-full flex-col border-t border-[#e8e0d5] bg-white lg:w-96 lg:border-l lg:border-t-0">
        <div className="border-b border-[#f0ece7] bg-[#faf8f5] px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">
              Location Intelligence
            </span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Live Feed
            </span>
          </div>
          <h2 className="mt-1 text-base font-extrabold text-[#2c2825]">
            {activeCorridor ? activeCorridor.corridor_name : 'Select a Corridor'}
          </h2>
          <p className="text-xs text-[#9e9189]">
            Sector: Kothamangalam Municipal Urban Grid
          </p>
        </div>

        {activeCorridor ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                <span className="text-[#9e9189]">Corridor ID</span>
                <span className="font-mono font-bold text-[#2c2825]">{activeCorridor.corridor_id}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-[#9e9189]">Segment Length</span>
                <span className="font-semibold text-[#2c2825]">{activeCorridor.length_km || 4.2} km</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-[#9e9189]">Avg Peak Delay</span>
                <span className="font-semibold text-[#2c2825]">+{activeCorridor.historical_avg_delay || 18} min</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-[#9e9189]">Model Confidence</span>
                <span className="font-bold text-emerald-700">{(activeCorridor.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-[#9e9189]">Active Incidents</span>
                <span className="font-semibold text-[#2c2825]">
                  {activeCorridor.active_incidents || 0} reported
                </span>
              </div>
            </div>

            {/* Corridor List Switcher */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">
                Monitored Corridors
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
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#9e9189]">
            Click any corridor or bottleneck pin on the map to inspect location telemetry.
          </div>
        )}
      </div>
    </div>
  )
}
