'use client'
import { useEffect, useRef, useState } from 'react'

// ── Public-safe Traffic object — FROZEN SHAPE per SHARED_CONTRACT.md ──────────
export interface TrafficCorridor {
  corridor_id: number
  city: string
  corridor_name: string
  timestamp: string
  current_congestion: number
  predicted_congestion: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
}

// City map centres
const CITY_CENTRES: Record<string, [number, number]> = {
  'Kochi':               [10.0200, 76.3050],
  'Thrissur':            [10.5276, 76.2144],
  'Thiruvananthapuram':  [8.5241,  76.9366],
  'Kozhikode':           [11.2588, 75.7804],
  'Kollam':              [8.8932,  76.6141],
}

// Per-corridor centre-points (corridor_id → lat/lng)
const CORRIDOR_COORDS: Record<number, [number, number]> = {
  // Kochi
  101: [10.0126, 76.3084], // Kaloor Junction
  102: [10.0228, 76.3083], // Edapally Toll
  103: [9.9717,  76.3106], // Vyttila Mobility Hub
  104: [9.9837,  76.2776], // Marine Drive
  // Thrissur
  201: [10.5248, 76.2130], // Thrissur Round
  202: [10.5310, 76.2200], // Poothole Road
  203: [10.5100, 76.1900], // Ollur Bypass
  // Thiruvananthapuram
  301: [8.5245,  76.9360], // Pattom Junction
  302: [8.5310,  76.9450], // Kowdiar–Vellayambalam
  303: [8.5180,  76.9390], // Kesavadasapuram
  // Kozhikode
  401: [11.2564, 75.7730], // Palayam Junction
  402: [11.2630, 75.7900], // Mavoor Road
  403: [11.2501, 75.7720], // Calicut Beach Road
  // Kollam
  501: [8.8938,  76.6032], // Chinnakada Junction
  502: [8.9010,  76.5950], // Polayathode Bridge
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
  selectedCity: string
  height?: string | number
}

export function LiveTrafficMap({ corridors, selectedCity, height = 380 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const initMap = (L: any) => {
      if (mapRef.current || !containerRef.current) return
      try {
        if ((containerRef.current as any)._leaflet_id) {
          delete (containerRef.current as any)._leaflet_id
        }
        const centre = CITY_CENTRES[selectedCity] || [10.0200, 76.3050]
        const map = L.map(containerRef.current, {
          center: centre,
          zoom: selectedCity === 'All Cities' ? 7 : 12,
          scrollWheelZoom: false,
          zoomControl: true,
        })
        mapRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map)

        corridors.forEach((c) => {
          const coords = CORRIDOR_COORDS[c.corridor_id]
          if (!coords) return
          const color = SEVERITY_COLOUR[c.severity] || '#6b7280'
          const circle = L.circleMarker(coords, {
            radius: 14, fillColor: color, color: '#fff',
            weight: 2.5, opacity: 1, fillOpacity: 0.85,
          }).addTo(map)
          circle.bindPopup(`
            <div style="font-family:system-ui;min-width:190px">
              <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px">${c.city}</div>
              <div style="font-weight:700;font-size:13px;margin-bottom:4px">${c.corridor_name}</div>
              <div style="font-size:12px;color:#374151">Now: <b style="color:${color}">${SEVERITY_LABEL[c.severity] || c.severity}</b> — ${c.current_congestion}%</div>
              <div style="font-size:12px;color:#6b7280">15-min forecast: ${c.predicted_congestion}%</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:4px">Confidence: ${Math.round(c.confidence * 100)}%</div>
            </div>
          `)
        })
      } catch {
        setError('Map could not initialise.')
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
      try {
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
        if (containerRef.current && (containerRef.current as any)._leaflet_id) {
          delete (containerRef.current as any)._leaflet_id
        }
      } catch (_) {}
    }
  }, [corridors, selectedCity])

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
      <div style={{
        position: 'absolute', bottom: 10, left: 10, zIndex: 1000,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
        borderRadius: 10, padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}>
        {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#2c2825' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: SEVERITY_COLOUR[s] }} />
            {SEVERITY_LABEL[s]}
          </div>
        ))}
      </div>
    </div>
  )
}
