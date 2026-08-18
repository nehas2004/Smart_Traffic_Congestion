'use client'

import { Waypoints, Cloud, Clock } from 'lucide-react'
import { RouteCard } from './commuter/route-card'
import { ForecastChart } from './commuter/forecast-chart'
import { IncidentFeed } from './commuter/incident-feed'
import { useEffect, useRef } from 'react'

function LiveMapWidget() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ''
    if (!KEY || !containerRef.current) return

    const initMap = (L: any) => {
      if (mapRef.current || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: [10.0601, 76.6214],
        zoom: 13,
        zoomControl: true,
      })
      mapRef.current = map

      // TomTom raster map tiles
      L.tileLayer(
        `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${KEY}&tileSize=256`,
        { attribution: '© <a href="https://www.tomtom.com">TomTom</a>', maxZoom: 22 }
      ).addTo(map)

      // TomTom traffic flow overlay
      L.tileLayer(
        `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${KEY}`,
        { opacity: 0.7, maxZoom: 22 }
      ).addTo(map)

      // Pin center
      const icon = L.divIcon({
        html: `<div style="background:#c8a97e;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
        className: '', iconAnchor: [6, 6],
      })
      L.marker([10.0601, 76.6214], { icon })
        .bindPopup('<b>Kothamangalam</b><br/>Traffic monitoring area')
        .addTo(map)
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
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

export function DashboardShell({ role, liveContext }: { role: string, liveContext: any }) {
  const isPlanner = role === 'planner'

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <header className="sticky top-0 z-50 border-b border-[#e8e0d5] bg-[#faf8f5]/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#2c2825]">
              <Waypoints className="size-4 text-[#c8a97e]" />
            </div>
            <span className="font-bold text-[#2c2825]">Flowcast {isPlanner ? 'Planner' : 'Commuter'}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#9e9189]">
            <div className="flex items-center gap-2 border-r border-[#e8e0d5] pr-4">
              <Cloud className="size-4" /> {liveContext.weather.desc} {liveContext.weather.temp}°C
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4" /> {liveContext.hour}:00
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        {isPlanner ? (
          <div className="text-[#2c2825]">Planner Dashboard (Coming Soon)</div>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-bold text-[#2c2825]">Good morning, Commuter</h1>
              <p className="text-sm text-[#9e9189]">Live insights from TomTom & OpenWeather for Kothamangalam.</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-1">
                <RouteCard liveContext={liveContext} />
                <IncidentFeed liveContext={liveContext} />
              </div>
              <div className="flex flex-col gap-6 lg:col-span-2">
                <ForecastChart />
                <div className="rounded-2xl border border-[#e8e0d5] shadow-sm overflow-hidden" style={{ height: 400 }}>
                  <LiveMapWidget />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
