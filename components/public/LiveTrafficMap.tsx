'use client'
import { useEffect, useRef, useState } from 'react'

// ── Public-safe Traffic object — FROZEN SHAPE per SHARED_CONTRACT.md ──────────
// Only these fields are consumed. Any extra fields from the API are ignored.
export interface TrafficCorridor {
  corridor_id: number
  corridor_name: string
  timestamp: string
  current_congestion: number
  predicted_congestion: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
}

// Corridor centre-points for map markers (city-level default area — known limitation)
const CORRIDOR_COORDS: Record<number, [number, number]> = {
  12: [10.0126, 76.3084], // Kaloor
  5:  [10.0601, 76.6214], // MC Road Junction
  7:  [10.0961, 76.3558], // Aluva NH-85
  3:  [10.0228, 76.3083], // Edapally Junction
  9:  [9.9717,  76.3106], // Vyttila Mobility Hub
  11: [9.9837,  76.2776], // Marine Drive
}

// Severity → visual colour mapping (bucket names confirmed with Shadeed's schema)
const SEVERITY_COLOUR: Record<TrafficCorridor['severity'], string> = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#ca8a04',
  low:      '#16a34a',
}

const SEVERITY_LABEL: Record<TrafficCorridor['severity'], string> = {
  critical: 'Critical',
  high:     'Heavy',
  medium:   'Moderate',
  low:      'Clear',
}

interface Props {
  corridors: TrafficCorridor[]
  height?: string | number
}

export function LiveTrafficMap({ corridors, height = 380 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    let L: any
    try {
      // Prevent Leaflet double-init (React Strict Mode / HMR)
      if ((containerRef.current as any)._leaflet_id) {
        delete (containerRef.current as any)._leaflet_id
      }

      L = require('leaflet')
      require('leaflet/dist/leaflet.css')

      const map = L.map(containerRef.current, {
        center: [10.0200, 76.3050],
        zoom: 11,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map)

      // Render each corridor as a coloured circle marker
      corridors.forEach((c) => {
        const coords = CORRIDOR_COORDS[c.corridor_id]
        if (!coords) return

        const color = SEVERITY_COLOUR[c.severity] || '#6b7280'

        const circle = L.circleMarker(coords, {
          radius: 14,
          fillColor: color,
          color: '#fff',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.85,
        }).addTo(map)

        circle.bindPopup(`
          <div style="font-family:system-ui;min-width:180px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${c.corridor_name}</div>
            <div style="font-size:12px;color:#6b7280">Now: <b style="color:${color}">${SEVERITY_LABEL[c.severity]}</b> — ${c.current_congestion}%</div>
            <div style="font-size:12px;color:#6b7280">Next 15 min: ${c.predicted_congestion}%</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px">Confidence: ${Math.round(c.confidence * 100)}%</div>
          </div>
        `)
      })
    } catch (e) {
      setError('Map could not load. Check Leaflet install.')
    }

    return () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove()
          mapRef.current = null
        }
        if (containerRef.current && (containerRef.current as any)._leaflet_id) {
          delete (containerRef.current as any)._leaflet_id
        }
      } catch (_) {}
    }
  }, [corridors])

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
      <div ref={containerRef} style={{ height, width: '100%', minWidth: 0 }} />
      {/* Legend — overlaid bottom-left */}
      <div style={{
        position: 'absolute', bottom: 10, left: 10, zIndex: 1000,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
        borderRadius: 10, padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}>
        {(Object.keys(SEVERITY_COLOUR) as TrafficCorridor['severity'][]).map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#2c2825' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: SEVERITY_COLOUR[s] }} />
            {SEVERITY_LABEL[s]}
          </div>
        ))}
      </div>
    </div>
  )
}
