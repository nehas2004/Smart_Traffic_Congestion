'use client'

import { useEffect, useRef, useState } from 'react'
import { Layers, Flame, Gauge } from 'lucide-react'

// ── Public-safe Traffic object — FROZEN SHAPE per SHARED_CONTRACT.md ──────────
export interface TrafficCorridor {
  corridor_id: number | string
  city?: string
  corridor_name: string
  timestamp: string
  current_congestion: number
  predicted_congestion: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
  coordinates?: [number, number]
}

// City map centres
const CITY_CENTRES: Record<string, [number, number]> = {
  'Kothamangalam':       [10.0601, 76.6214],
  'Munnar':              [10.0889, 77.0595],
  'Aluva':               [10.1076, 76.3516],
  'Kochi':               [10.0200, 76.3050],
  'Thrissur':            [10.5276, 76.2144],
  'Thiruvananthapuram':  [8.5241,  76.9366],
  'Trivandrum':          [8.5241,  76.9366],
  'Kozhikode':           [11.2588, 75.7804],
  'Kollam':              [8.8932,  76.6141],
}

// Default per-corridor centre-points
const DEFAULT_CORRIDOR_COORDS: Record<string | number, [number, number]> = {
  1:   [10.0601, 76.6214],
  2:   [10.0889, 77.0595],
  5:   [10.0601, 76.6214],
  7:   [10.0961, 76.3558],
  101: [10.0126, 76.3084],
  102: [10.0228, 76.3083],
  103: [9.9717,  76.3106],
  104: [9.9837,  76.2776],
  12:  [10.0126, 76.3084],
  3:   [10.0228, 76.3083],
  9:   [9.9717,  76.3106],
  11:  [9.9837,  76.2776],
  201: [10.5248, 76.2130],
  202: [10.5310, 76.2200],
  203: [10.5100, 76.1900],
  301: [8.5245,  76.9360],
  302: [8.5310,  76.9450],
  303: [8.5180,  76.9390],
  401: [11.2564, 75.7730],
  402: [11.2630, 75.7900],
  403: [11.2501, 75.7720],
  501: [8.8938,  76.6032],
  502: [8.9010,  76.5950],
}

const SEVERITY_COLOUR: Record<string, string> = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#ca8a04',
  low:      '#16a34a',
}
const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical', high: 'Heavy', medium: 'Moderate', low: 'Clear',
}

interface Props {
  corridors: TrafficCorridor[]
  selectedCity?: string
  customCenter?: [number, number]
  height?: string | number
}

export function LiveTrafficMap({ corridors, selectedCity = 'All Cities', customCenter, height = 380 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const heatLayerRef = useRef<any>(null)
  const flowTileRef = useRef<any>(null)

  const [mapMode, setMapMode] = useState<'hybrid' | 'heatmap' | 'flow'>('hybrid')
  const [error, setError] = useState<string | null>(null)
  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  useEffect(() => {
    if (!containerRef.current) return

    const initMap = (L: any) => {
      if (mapRef.current || !containerRef.current) return
      try {
        if ((containerRef.current as any)._leaflet_id) {
          delete (containerRef.current as any)._leaflet_id
        }

        const centre = customCenter || CITY_CENTRES[selectedCity] || [10.0601, 76.6214]
        const map = L.map(containerRef.current, {
          center: centre,
          zoom: selectedCity === 'All Cities' && !customCenter ? 8 : 13,
          scrollWheelZoom: false,
          zoomControl: true,
        })
        mapRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map)

        const flowTile = L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${KEY}`,
          { opacity: 0.82, maxZoom: 18 }
        )
        flowTile.addTo(map)
        flowTileRef.current = flowTile

        updateLayers(L, map)
      } catch {
        setError('Map could not initialise.')
      }
    }

    const updateLayers = (L: any, map: any) => {
      markersRef.current.forEach((m) => { try { m.remove() } catch (_) {} })
      markersRef.current = []

      if (heatLayerRef.current) {
        try { map.removeLayer(heatLayerRef.current) } catch (_) {}
        heatLayerRef.current = null
      }

      const heatPoints: [number, number, number][] = []

      corridors.forEach((c) => {
        const coords = c.coordinates || DEFAULT_CORRIDOR_COORDS[c.corridor_id] || customCenter || CITY_CENTRES[c.city || ''] || null
        if (!coords) return

        const intensity = Math.min(1.0, Math.max(0.2, c.current_congestion / 100))
        heatPoints.push([coords[0], coords[1], intensity])
        heatPoints.push([coords[0] + 0.0015, coords[1] + 0.0015, intensity * 0.75])
        heatPoints.push([coords[0] - 0.0015, coords[1] - 0.0015, intensity * 0.75])

        const color = SEVERITY_COLOUR[c.severity] || '#6b7280'
        const circle = L.circleMarker(coords, {
          radius: 12, fillColor: color, color: '#fff',
          weight: 2.5, opacity: 1, fillOpacity: 0.9,
        }).addTo(map)

        circle.bindPopup(`
          <div style="font-family:system-ui;min-width:190px">
            <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px">${c.city || 'Live Location'}</div>
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${c.corridor_name}</div>
            <div style="font-size:12px;color:#374151">Now: <b style="color:${color}">${SEVERITY_LABEL[c.severity] || c.severity}</b> — ${c.current_congestion}%</div>
            <div style="font-size:12px;color:#6b7280">15-min forecast: ${c.predicted_congestion}%</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px">Confidence: ${Math.round(c.confidence * 100)}%</div>
          </div>
        `)

        markersRef.current.push(circle)
      })

      if (L.heatLayer && heatPoints.length > 0 && mapMode !== 'flow') {
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

    const load = () => {
      if (!document.getElementById('leaflet-css-public')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css-public'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const loadHeatPlugin = (L: any) => {
        if ((L as any).heatLayer) {
          initMap(L)
        } else if (!document.getElementById('leaflet-heat-public-js')) {
          const script = document.createElement('script')
          script.id = 'leaflet-heat-public-js'
          script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'
          script.onload = () => initMap(L)
          document.head.appendChild(script)
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
    load()

    return () => {
      try {
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
        if (containerRef.current && (containerRef.current as any)._leaflet_id) {
          delete (containerRef.current as any)._leaflet_id
        }
      } catch (_) {}
    }
  }, [])

  useEffect(() => {
    if (mapRef.current && (window as any).L) {
      const L = (window as any).L
      const centre = customCenter || CITY_CENTRES[selectedCity]
      if (centre) {
        mapRef.current.flyTo(centre, selectedCity === 'All Cities' && !customCenter ? 8 : 13, {
          animate: true,
          duration: 1.0,
        })
      }

      markersRef.current.forEach((m) => { try { m.remove() } catch (_) {} })
      markersRef.current = []

      if (heatLayerRef.current) {
        try { mapRef.current.removeLayer(heatLayerRef.current) } catch (_) {}
        heatLayerRef.current = null
      }

      const heatPoints: [number, number, number][] = []

      corridors.forEach((c) => {
        const coords = c.coordinates || DEFAULT_CORRIDOR_COORDS[c.corridor_id] || customCenter || CITY_CENTRES[c.city || ''] || null
        if (!coords) return

        const intensity = Math.min(1.0, Math.max(0.2, c.current_congestion / 100))
        heatPoints.push([coords[0], coords[1], intensity])
        heatPoints.push([coords[0] + 0.0015, coords[1] + 0.0015, intensity * 0.75])
        heatPoints.push([coords[0] - 0.0015, coords[1] - 0.0015, intensity * 0.75])

        const color = SEVERITY_COLOUR[c.severity] || '#6b7280'
        const circle = L.circleMarker(coords, {
          radius: 12, fillColor: color, color: '#fff',
          weight: 2.5, opacity: 1, fillOpacity: 0.9,
        }).addTo(mapRef.current)

        circle.bindPopup(`
          <div style="font-family:system-ui;min-width:190px">
            <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px">${c.city || 'Live Location'}</div>
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${c.corridor_name}</div>
            <div style="font-size:12px;color:#374151">Now: <b style="color:${color}">${SEVERITY_LABEL[c.severity] || c.severity}</b> — ${c.current_congestion}%</div>
            <div style="font-size:12px;color:#6b7280">15-min forecast: ${c.predicted_congestion}%</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px">Confidence: ${Math.round(c.confidence * 100)}%</div>
          </div>
        `)

        markersRef.current.push(circle)
      })

      if (L.heatLayer && heatPoints.length > 0 && mapMode !== 'flow') {
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
        heat.addTo(mapRef.current)
        heatLayerRef.current = heat
      }
    }
  }, [corridors, selectedCity, customCenter, mapMode])

  const handleModeChange = (mode: 'hybrid' | 'heatmap' | 'flow') => {
    setMapMode(mode)
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

  if (error) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f5f2ee', borderRadius: 16, color: '#9e9189', fontSize: 14 }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
        borderRadius: 10, padding: 3, display: 'flex', gap: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}>
        <button
          type="button"
          onClick={() => handleModeChange('hybrid')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px',
            borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: mapMode === 'hybrid' ? '#2c2825' : 'transparent',
            color: mapMode === 'hybrid' ? '#c8a97e' : '#6b7280',
          }}
        >
          <Layers size={12} /> Hybrid
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('heatmap')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px',
            borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: mapMode === 'heatmap' ? '#2c2825' : 'transparent',
            color: mapMode === 'heatmap' ? '#c8a97e' : '#6b625b',
          }}
        >
          <Flame size={12} /> Heatmap
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('flow')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px',
            borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: mapMode === 'flow' ? '#2c2825' : 'transparent',
            color: mapMode === 'flow' ? '#c8a97e' : '#6b625b',
          }}
        >
          <Gauge size={12} /> Live Flow
        </button>
      </div>

      <div ref={containerRef} style={{ height, width: '100%', minWidth: 0 }} />

      <div style={{
        position: 'absolute', bottom: 10, left: 10, zIndex: 1000,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
        borderRadius: 10, padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
          {mapMode === 'flow' ? 'Flow Status' : 'Thermal Density'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#2c2825' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: SEVERITY_COLOUR[s] }} />
              {SEVERITY_LABEL[s]}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
