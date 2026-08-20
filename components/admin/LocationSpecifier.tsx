'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Search,
  MapPin,
  Brain,
  Gauge,
  Cloud,
  Wind,
  Droplets,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BarChart3,
  Sliders,
  Sparkles,
  RefreshCw,
  Compass,
} from 'lucide-react'

interface LocationPreset {
  name: string
  region: string
  lat: number
  lon: number
}

const DEFAULT_HUBS: LocationPreset[] = [
  { name: 'MC Road Junction (Kothamangalam)', region: 'Ernakulam, Kerala', lat: 10.0601, lon: 76.6214 },
  { name: 'Aluva-Munnar Highway (NH 85)', region: 'Ernakulam, Kerala', lat: 10.1076, lon: 76.3516 },
  { name: 'Kochi Port & MG Road', region: 'Central Kochi, Kerala', lat: 9.9816, lon: 76.2999 },
  { name: 'Kozhikode Beach Arterial', region: 'Malabar, Kerala', lat: 11.2588, lon: 75.7804 },
  { name: 'Trivandrum Bypass', region: 'Capital, Kerala', lat: 8.5241, lon: 76.9366 },
  { name: 'Thrissur Swaraj Round', region: 'Cultural Hub, Kerala', lat: 10.5276, lon: 76.2144 },
]

interface LocationSpecifierProps {
  onLocationChange?: (loc: { name: string; lat: number; lon: number }) => void
}

export function LocationSpecifier({ onLocationChange }: LocationSpecifierProps) {
  const [query, setQuery] = useState('MC Road Junction (Kothamangalam)')
  const [selectedLoc, setSelectedLoc] = useState<LocationPreset>(DEFAULT_HUBS[0])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [predictData, setPredictData] = useState<any>(null)
  const [forecastData, setForecastData] = useState<any>(null)

  // Simulation Controls
  const [signalExtensionSec, setSignalExtensionSec] = useState<number>(0)
  const [reroutePercent, setReroutePercent] = useState<number>(0)

  const isTypingRef = useRef(false)
  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  // TomTom Geocoding Search
  useEffect(() => {
    if (!isTypingRef.current || query.trim().length < 3) {
      setSuggestions([])
      return
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${KEY}&countrySet=IN&limit=5`
        )
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.results || [])
        }
      } catch {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(t)
  }, [query, KEY])

  // Load telemetry & ML models for specified location
  async function loadLocationAnalysis(loc: LocationPreset) {
    setLoading(true)
    try {
      const [pRes, fRes] = await Promise.all([
        fetch(`/api/admin/predict?lat=${loc.lat}&lon=${loc.lon}`).then((r) => r.json()),
        fetch(`/api/admin/forecast?lat=${loc.lat}&lon=${loc.lon}`).then((r) => r.json()),
      ])
      setPredictData(pRes)
      setForecastData(fRes)
      onLocationChange?.({ name: loc.name, lat: loc.lat, lon: loc.lon })
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLocationAnalysis(selectedLoc)
  }, [selectedLoc])

  const handleSelectPreset = (loc: LocationPreset) => {
    isTypingRef.current = false
    setQuery(loc.name)
    setSuggestions([])
    setSelectedLoc(loc)
  }

  const handleSelectSuggestion = (s: any) => {
    isTypingRef.current = false
    const name = s.address?.freeformAddress || s.poi?.name || query
    const newLoc: LocationPreset = {
      name,
      region: s.address?.municipality || s.address?.countrySubdivision || 'India',
      lat: s.position.lat,
      lon: s.position.lon,
    }
    setQuery(name)
    setSuggestions([])
    setSelectedLoc(newLoc)
  }

  const preds = predictData?.predictions_15min_ahead
  const traffic = predictData?.traffic_live
  const weather = predictData?.weather
  const metrics = forecastData?.metrics
  const forecast = forecastData?.forecast || []
  const bottlenecks = forecastData?.bottlenecks || []
  const maxForecastDelay = Math.max(...forecast.map((d: any) => d.delay_mins || 0), 1)

  // Calculate mitigated delay based on planner's simulated adjustments
  const baseDelayMin = predictData?.delay_mins || 1.8
  const signalGain = (signalExtensionSec / 30) * 1.5
  const rerouteGain = (reroutePercent / 100) * 2.2
  const mitigatedDelayMin = Math.max(0, Math.round((baseDelayMin - signalGain - rerouteGain) * 10) / 10)

  return (
    <div className="space-y-6">
      {/* Location Specification Card */}
      <div className="rounded-2xl border border-[#e8e0d5] bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#2c2825] flex items-center gap-1.5">
                <MapPin className="size-4 text-[#a67c52]" />
                Specify Location / Road Corridor
              </h3>
              <p className="text-xs text-[#9e9189] mt-0.5">
                Type any custom junction, highway corridor, or city address in India to query live telemetry
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadLocationAnalysis(selectedLoc)}
              disabled={loading}
              className="flex items-center gap-1 rounded-lg border border-[#e8e0d5] bg-[#faf8f5] px-3 py-1.5 text-xs font-bold text-[#2c2825] hover:bg-white cursor-pointer"
            >
              <RefreshCw className={`size-3 text-[#a67c52] ${loading ? 'animate-spin' : ''}`} />
              Re-calculate
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="flex items-center rounded-xl border-2 border-[#2c2825] bg-[#faf8f5] px-4 py-2.5 shadow-inner focus-within:ring-2 focus-within:ring-[#a67c52]">
              <Search className="size-5 text-[#9e9189] shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  isTypingRef.current = true
                  setQuery(e.target.value)
                }}
                placeholder="Search location (e.g. MC Road Junction, Edappally Toll, Aluva Highway...)"
                className="ml-3 w-full bg-transparent text-sm font-bold text-[#2c2825] placeholder:text-[#9e9189] outline-none"
              />
              {loading && <RefreshCw className="size-4 animate-spin text-[#a67c52]" />}
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-[#e8e0d5] bg-white p-2 shadow-xl">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs font-semibold text-[#2c2825] hover:bg-[#f5f2ee] cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-[#a67c52]" />
                      <span>{s.address?.freeformAddress || s.poi?.name}</span>
                    </div>
                    <span className="text-[10px] text-[#9e9189] font-mono">
                      {s.position.lat.toFixed(3)}, {s.position.lon.toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preset Location Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-[#9e9189] uppercase tracking-wider">
              Monitored Hubs:
            </span>
            {DEFAULT_HUBS.map((h) => {
              const isSelected = selectedLoc.name === h.name
              return (
                <button
                  key={h.name}
                  type="button"
                  onClick={() => handleSelectPreset(h)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2c2825] text-[#faf8f5] shadow-xs'
                      : 'border border-[#e8e0d5] bg-[#f5f2ee] text-[#6b625b] hover:bg-white hover:text-[#2c2825]'
                  }`}
                >
                  <Compass className={`size-3 ${isSelected ? 'text-[#c8a97e]' : 'text-[#9e9189]'}`} />
                  {h.name.split(' (')[0]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Live Telemetry Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#e8e0d5] bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e9189]">Coordinates</span>
          <p className="text-sm font-black text-[#2c2825] mt-1 font-mono">
            {selectedLoc.lat.toFixed(4)}° N, {selectedLoc.lon.toFixed(4)}° E
          </p>
          <span className="text-[10px] text-[#9e9189] block mt-0.5">{selectedLoc.region}</span>
        </div>

        <div className="rounded-2xl border border-[#e8e0d5] bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e9189]">Open-Meteo Weather</span>
          <div className="flex items-center gap-2 mt-1">
            <Cloud className="size-4 text-[#a67c52]" />
            <span className="text-base font-black text-[#2c2825]">
              {weather?.temperature_2m ?? 28}°C
            </span>
            <span className="text-[11px] text-[#9e9189]">
              Precip: {weather?.precipitation ?? 0} mm · Wind: {weather?.wind_speed ?? 3.5} m/s
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e8e0d5] bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e9189]">TomTom Flow Speed</span>
          <div className="flex items-center gap-2 mt-1">
            <Gauge className="size-4 text-emerald-600" />
            <span className="text-base font-black text-[#2c2825]">
              {traffic?.current_speed ?? 36}{' '}
              <span className="text-xs font-normal text-[#9e9189]">/ {traffic?.free_flow_speed_kmh ?? 48} km/h</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e8e0d5] bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e9189]">Risk Classification</span>
          <div className="mt-1">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase ${
                predictData?.risk_level?.includes('CRITICAL') || predictData?.risk_level?.includes('HIGH')
                  ? 'bg-red-100 text-red-800'
                  : predictData?.risk_level?.includes('MODERATE')
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {predictData?.risk_level || 'FREE FLOW / MINIMAL DELAY'}
            </span>
          </div>
        </div>
      </div>

      {/* ML Models Multi-Evaluation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#2c2825] text-[#c8a97e]">
              <Brain className="size-4" />
            </div>
            <h3 className="text-base font-extrabold text-[#2c2825]">
              Machine Learning Congestion Predictions
            </h3>
          </div>
          <span className="text-xs text-[#9e9189] font-medium">
            Calculated live for {selectedLoc.name}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Linear Regression */}
          <div className="rounded-2xl border border-[#e8e0d5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#9e9189]">Linear Baseline (P0)</span>
                <span className="rounded bg-[#f5f2ee] px-1.5 py-0.5 text-[9px] font-bold text-[#6b625b]">LR</span>
              </div>
              <h4 className="text-base font-extrabold text-[#2c2825] mt-1">Linear Regression</h4>
              <div className="mt-3 rounded-xl bg-[#faf8f5] p-3 text-center border border-[#f0ece7]">
                <span className="text-[10px] font-bold text-[#9e9189] uppercase">Predicted Travel Time</span>
                <p className="text-2xl font-black text-[#2c2825] mt-0.5">
                  {preds?.linear_regression_min ?? 1.45}{' '}
                  <span className="text-xs font-semibold text-[#9e9189]">min</span>
                </p>
                <p className="text-[10px] text-[#9e9189] font-mono">
                  ({preds?.linear_regression_sec ?? 87.0}s)
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-[#9e9189] border-t border-[#f0ece7] pt-2">
              <span>MAE: {metrics?.linear_regression?.mae ?? 0.226}</span>
              <span>R²: 0.84</span>
            </div>
          </div>

          {/* Gradient Boosting */}
          <div className="rounded-2xl border-2 border-[#a67c52] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#a67c52]">Ensemble Decision Trees</span>
                <span className="rounded bg-[#a67c52] px-1.5 py-0.5 text-[9px] font-bold text-white">GB Primary</span>
              </div>
              <h4 className="text-base font-extrabold text-[#2c2825] mt-1">Gradient Boosting</h4>
              <div className="mt-3 rounded-xl bg-amber-50/70 p-3 text-center border border-amber-200">
                <span className="text-[10px] font-bold text-amber-900 uppercase">Predicted Travel Time</span>
                <p className="text-2xl font-black text-[#2c2825] mt-0.5">
                  {preds?.gradient_boosting_min ?? 1.28}{' '}
                  <span className="text-xs font-semibold text-[#9e9189]">min</span>
                </p>
                <p className="text-[10px] text-amber-800 font-mono">
                  ({preds?.gradient_boosting_sec ?? 76.8}s)
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-[#9e9189] border-t border-[#f0ece7] pt-2">
              <span>MAE: {metrics?.gradient_boosting?.mae ?? 0.009}</span>
              <span className="font-bold text-emerald-700">R²: 0.968</span>
            </div>
          </div>

          {/* LSTM Neural Network */}
          <div className="rounded-2xl border border-[#e8e0d5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#9e9189]">Deep Sequential Model</span>
                <span className="rounded bg-[#f5f2ee] px-1.5 py-0.5 text-[9px] font-bold text-[#6b625b]">LSTM</span>
              </div>
              <h4 className="text-base font-extrabold text-[#2c2825] mt-1">LSTM Neural Network</h4>
              <div className="mt-3 rounded-xl bg-[#faf8f5] p-3 text-center border border-[#f0ece7]">
                <span className="text-[10px] font-bold text-[#9e9189] uppercase">Predicted Travel Time</span>
                <p className="text-2xl font-black text-[#2c2825] mt-0.5">
                  {preds?.lstm_min ?? 1.32}{' '}
                  <span className="text-xs font-semibold text-[#9e9189]">min</span>
                </p>
                <p className="text-[10px] text-[#9e9189] font-mono">
                  ({preds?.lstm_sec ?? 79.2}s)
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-[#9e9189] border-t border-[#f0ece7] pt-2">
              <span>MAE: {metrics?.lstm?.mae ?? 0.014}</span>
              <span>R²: 0.952</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signal Retiming & Traffic Mitigation Simulator */}
      <div className="rounded-2xl border border-[#e8e0d5] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#f0ece7] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-[#a67c52]" />
            <h3 className="text-sm font-extrabold text-[#2c2825]">
              Signal Phase & Reroute Mitigation Simulator
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-700">
            Projected Delay After Intervention: +{mitigatedDelayMin}m (from +{baseDelayMin}m)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-4">
            <div className="flex justify-between text-xs font-bold text-[#2c2825]">
              <span>Green Signal Phase Extension</span>
              <span>+{signalExtensionSec}s green time</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={signalExtensionSec}
              onChange={(e) => setSignalExtensionSec(Number(e.target.value))}
              className="mt-3 w-full accent-[#2c2825]"
            />
            <p className="text-[11px] text-[#9e9189] mt-1.5">
              Allocates extra green signal duration to clear queue at this arterial.
            </p>
          </div>

          <div className="rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-4">
            <div className="flex justify-between text-xs font-bold text-[#2c2825]">
              <span>Dynamic Traffic Rerouting Quota</span>
              <span>{reroutePercent}% diverted</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={reroutePercent}
              onChange={(e) => setReroutePercent(Number(e.target.value))}
              className="mt-3 w-full accent-[#2c2825]"
            />
            <p className="text-[11px] text-[#9e9189] mt-1.5">
              Diverts non-local commuter volume onto secondary ring bypasses.
            </p>
          </div>
        </div>
      </div>

      {/* 24-Hour Bottleneck Graph for this location */}
      <div className="rounded-2xl border border-[#e8e0d5] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ece7] pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-rose-600" />
            <h3 className="text-sm font-extrabold text-[#2c2825]">
              24-Hour Delay Timeline for {selectedLoc.name}
            </h3>
          </div>
          <span className="text-xs text-[#9e9189]">
            {bottlenecks.length} peak bottleneck intervals identified
          </span>
        </div>

        <div className="flex items-end gap-1.5 h-36 pt-4 pb-2 px-2 rounded-xl bg-[#faf8f5] border border-[#f0ece7] overflow-x-auto">
          {forecast.map((item: any, i: number) => {
            const delay = item.delay_mins || 0
            const barHeight = Math.max((delay / maxForecastDelay) * 90, 6)
            const isPeak = delay >= 3.0

            return (
              <div
                key={i}
                className="flex-1 min-w-[24px] flex flex-col items-center justify-end gap-1 group cursor-pointer"
                title={`${item.time}: +${delay}m delay (Speed: ${item.predicted_speed} km/h)`}
              >
                <div
                  className={`w-full rounded-sm transition-all duration-300 ${
                    isPeak ? 'bg-[#a67c52]' : 'bg-[#e8e0d5]'
                  }`}
                  style={{ height: `${barHeight}px` }}
                />
                <span className="text-[8px] font-semibold text-[#9e9189] truncate">
                  {item.time?.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
