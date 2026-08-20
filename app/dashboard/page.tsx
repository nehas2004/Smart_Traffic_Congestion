'use client'

import React, { useState, useMemo } from 'react'
import { Nav } from '@/components/shared/nav'
import {
  Zap,
  MapPin,
  Clock,
  Compass,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Fuel,
  Navigation,
  ArrowRight,
  ShieldCheck,
  Flame,
  Activity
} from 'lucide-react'
import { ForecastChart } from '@/components/dashboard/commuter/forecast-chart'
import { FuelCostCalculator } from '@/components/dashboard/commuter/fuel-cost-calculator'

interface CorridorOption {
  id: string
  name: string
  from: string
  to: string
  distanceKm: number
  baseDurationMins: number
  currentDelayMins: number
  hotspots: { name: string; delay: number; severity: 'Moderate' | 'Heavy' | 'Severe' }[]
}

const PRESET_CORRIDORS: CorridorOption[] = [
  {
    id: 'corridor-1',
    name: 'NH-85 Regional Arterial',
    from: 'Kochi (Edappally Toll)',
    to: 'Kothamangalam (Thankalam)',
    distanceKm: 48.8,
    baseDurationMins: 81,
    currentDelayMins: 4,
    hotspots: [
      { name: 'Thankalam Junction', delay: 4, severity: 'Moderate' },
      { name: 'Kozhippilly Bottleneck', delay: 5, severity: 'Moderate' },
      { name: 'MC Road Junction', delay: 6, severity: 'Moderate' }
    ]
  },
  {
    id: 'corridor-2',
    name: 'Kothamangalam Town Gateway',
    from: 'Thankalam Junction',
    to: 'Kozhippilly (NH 85)',
    distanceKm: 14.2,
    baseDurationMins: 22,
    currentDelayMins: 5,
    hotspots: [
      { name: 'Town Central Square', delay: 3, severity: 'Moderate' },
      { name: 'Kozhippilly Market', delay: 2, severity: 'Moderate' }
    ]
  },
  {
    id: 'corridor-3',
    name: 'Aluva - Munnar Highway',
    from: 'Aluva Town Gate',
    to: 'High Range Junction',
    distanceKm: 50.9,
    baseDurationMins: 85,
    currentDelayMins: 8,
    hotspots: [
      { name: 'Perumbavoor Town Center', delay: 5, severity: 'Moderate' },
      { name: 'High Range Feeder Road', delay: 3, severity: 'Moderate' }
    ]
  },
  {
    id: 'corridor-4',
    name: 'Muvattupuzha Bypass Link',
    from: 'Muvattupuzha MC Road',
    to: 'Karikkode Junction',
    distanceKm: 26.5,
    baseDurationMins: 42,
    currentDelayMins: 7,
    hotspots: [
      { name: 'Karikkode Bypass Bend', delay: 4, severity: 'Moderate' },
      { name: 'Market Feeder Link', delay: 3, severity: 'Moderate' }
    ]
  }
]

export default function DashboardPage() {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('corridor-1')
  const [selectedHour, setSelectedHour] = useState<number | null>(null)

  const activeCorridor = useMemo(() => {
    return PRESET_CORRIDORS.find(c => c.id === selectedCorridorId) || PRESET_CORRIDORS[0]
  }, [selectedCorridorId])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header with Corridor Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Activity size={11} className="text-indigo-600" /> Commuter Traffic Hub
              </span>
              <span className="text-xs text-slate-500 font-medium">Real-Time Forecasts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              24-Hour Corridor Traffic Forecast
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Select an arterial route to analyze 24-hour predictive congestion curves, simulate departure times, and evaluate delays.
            </p>
          </div>

          {/* Quick Corridor Selection Dropdown / Selector */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400 pl-2">Corridor:</span>
            <select
              value={selectedCorridorId}
              onChange={(e) => {
                setSelectedCorridorId(e.target.value)
                setSelectedHour(null)
              }}
              className="bg-slate-50 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {PRESET_CORRIDORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.distanceKm} km)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Corridor Navigation Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {PRESET_CORRIDORS.map((corridor) => {
            const isSelected = corridor.id === activeCorridor.id
            const totalMins = corridor.baseDurationMins + corridor.currentDelayMins
            return (
              <button
                key={corridor.id}
                type="button"
                onClick={() => {
                  setSelectedCorridorId(corridor.id)
                  setSelectedHour(null)
                }}
                className={`p-3.5 rounded-2xl text-left transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-extrabold truncate uppercase tracking-wider">
                    {corridor.name}
                  </span>
                  {corridor.currentDelayMins > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      +{corridor.currentDelayMins}m
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-lg font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {totalMins} min
                  </span>
                  <span className={`text-[11px] font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                    · {corridor.distanceKm} km
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* 24-HOUR ROUTE-SPECIFIC FORECAST CURVE */}
        <div className="mb-6">
          <ForecastChart
            fromName={activeCorridor.from}
            toName={activeCorridor.to}
            distanceKm={activeCorridor.distanceKm}
            baseDurationMins={activeCorridor.baseDurationMins}
            currentDelayMins={activeCorridor.currentDelayMins}
            selectedHour={selectedHour}
            onSelectHour={setSelectedHour}
          />
        </div>

        {/* Bottom Details Grid: Active Bottlenecks & Commuter Fuel Calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Active Bottlenecks along the selected corridor */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Active Bottlenecks on {activeCorridor.name}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Real-time choke points and delay hotspots along this corridor.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                {activeCorridor.hotspots.length} Points
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {activeCorridor.hotspots.map((spot, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{spot.name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Congestion impact: <span className="text-slate-700 font-semibold">{spot.severity}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                    +{spot.delay} min delay
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Commuter Fuel Cost Calculator */}
          <div className="lg:col-span-6">
            <FuelCostCalculator
              initialDistance={activeCorridor.distanceKm}
              initialMileage={15}
              initialFuelPrice={106.50}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
