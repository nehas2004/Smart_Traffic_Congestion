'use client'

import { Waypoints, Map as MapIcon, Cloud, Clock } from 'lucide-react'
import { RouteCard } from './commuter/route-card'
import { ForecastChart } from './commuter/forecast-chart'
import { IncidentFeed } from './commuter/incident-feed'
import { useEffect } from 'react'

export function DashboardShell({ role, liveContext }: { role: string, liveContext: any }) {
  const isPlanner = role === 'planner'
  const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY

  useEffect(() => {
    // Basic init of TomTom Maps SDK via global if the script loaded
    if (TOMTOM_KEY && typeof window !== 'undefined' && (window as any).tt) {
        const map = (window as any).tt.map({
            key: TOMTOM_KEY,
            container: 'tomtom-map',
            center: [76.6214, 10.0601], // Kothamangalam
            zoom: 13,
            style: 'tomtom://vector/1/basic-main'
        });
        map.addControl(new (window as any).tt.FullscreenControl());
        map.addControl(new (window as any).tt.NavigationControl());
    }
  }, [TOMTOM_KEY])

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* TomTom SDK Script Injection */}
      <script src="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.23.0/maps/maps-web.min.js" defer></script>
      <link rel="stylesheet" type="text/css" href="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.23.0/maps/maps.css" />

      {/* Topbar */}
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

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-6">
        {isPlanner ? (
          <div className="text-[#2c2825]">Planner Dashboard (Coming Soon)</div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Greeting */}
            <div>
              <h1 className="text-2xl font-bold text-[#2c2825]">Good morning, Commuter</h1>
              <p className="text-sm text-[#9e9189]">Live insights from TomTom & OpenWeather for Kothamangalam.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column (Routes & Feed) */}
              <div className="flex flex-col gap-6 lg:col-span-1">
                <RouteCard liveContext={liveContext} />
                <IncidentFeed liveContext={liveContext} />
              </div>

              {/* Right Column (Charts & Map) */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                <ForecastChart />
                
                {/* TomTom Map Container */}
                <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-[#e8e0d5] bg-[#f5f2ee] shadow-sm overflow-hidden">
                  {!TOMTOM_KEY ? (
                    <>
                        <MapIcon className="mb-4 size-8 text-[#c8a97e] opacity-50" />
                        <p className="text-sm font-medium text-[#9e9189]">TomTom Interactive Map (Mocked - Provide API Key)</p>
                    </>
                  ) : (
                    <div id="tomtom-map" className="w-full h-full" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
