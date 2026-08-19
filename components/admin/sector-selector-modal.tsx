'use client'

import { useState, useRef } from 'react'
import {
  MapPin,
  Search,
  Radio,
  Building2,
  CheckCircle2,
  X,
  Crosshair,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'

export interface SectorPoint {
  name: string
  lat: number
  lon: number
  radiusKm: number
}

const PRESET_COORDINATES: SectorPoint[] = [
  { name: '10.0601° N, 76.6214° E', lat: 10.0601, lon: 76.6214, radiusKm: 10 },
  { name: '10.0033° N, 76.2996° E', lat: 10.0033, lon: 76.2996, radiusKm: 10 },
  { name: '10.1076° N, 76.3516° E', lat: 10.1076, lon: 76.3516, radiusKm: 10 },
  { name: '10.0889° N, 77.0595° E', lat: 10.0889, lon: 77.0595, radiusKm: 10 },
  { name: '10.5276° N, 76.2144° E', lat: 10.5276, lon: 76.2144, radiusKm: 10 },
  { name: '8.5241° N, 76.9366° E', lat: 8.5241, lon: 76.9366, radiusKm: 10 },
  { name: '11.2588° N, 75.7804° E', lat: 11.2588, lon: 75.7804, radiusKm: 10 },
]

interface SectorSelectorModalProps {
  isOpen: boolean
  currentSector?: SectorPoint | null
  onClose?: () => void
  onSelectSector: (sector: SectorPoint) => void
}

export function SectorSelectorModal({
  isOpen,
  currentSector,
  onClose,
  onSelectSector,
}: SectorSelectorModalProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<any>(null)

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  const handleQueryChange = (val: string) => {
    setQuery(val)

    // Check if user directly entered "lat, lon" numbers (e.g. 10.0601, 76.6214)
    const match = val.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/)
    if (match) {
      const lat = parseFloat(match[1])
      const lon = parseFloat(match[3])
      setSuggestions([
        {
          isDirectCoord: true,
          position: { lat, lon },
          display: `Coordinates (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E)`,
        },
      ])
      return
    }

    if (!val || val.trim().length < 2) {
      setSuggestions([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(val)}.json?key=${KEY}&limit=6`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.results || [])
        }
      } catch (_) {
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const handleSelect = (lat: number, lon: number) => {
    const sector: SectorPoint = {
      name: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
      lat,
      lon,
      radiusKm: 10,
    }
    try {
      localStorage.setItem('planner_active_city', JSON.stringify(sector))
    } catch (_) {}
    onSelectSector(sector)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[#e8e0d5] bg-[#faf8f5] shadow-2xl">
        {/* Modal Header */}
        <div className="border-b border-[#e8e0d5] bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[#2c2825] text-[#c8a97e] shadow-sm">
                <Crosshair className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#2c2825]">
                  10 km Radius Coordinate Surveillance Setup
                </h2>
                <p className="text-xs text-[#9e9189]">
                  Enter location coordinates or name to scan congestion points within <strong>10 km radius</strong>
                </p>
              </div>
            </div>

            {onClose && currentSector && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[#9e9189] hover:bg-[#faf8f5] hover:text-[#2c2825]"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Active 10km Radius Badge */}
          <div className="flex items-center justify-between rounded-2xl border border-blue-600/20 bg-blue-50/70 p-3 text-xs">
            <div className="flex items-center gap-2 text-blue-950 font-semibold">
              <Radio className="size-4 text-blue-600 animate-pulse" />
              <span>Surveillance Grid: <strong>10 km Radius Perimeter</strong></span>
            </div>
            <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-full">
              GPS Telemetry
            </span>
          </div>

          {/* Search / Coordinate Box */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 size-4 text-[#9e9189]" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Enter coordinates (e.g. 10.0601, 76.6214) or place name..."
                autoFocus
                className="h-12 w-full rounded-2xl border border-[#e8e0d5] bg-white pl-10 pr-10 text-sm font-semibold text-[#2c2825] placeholder:text-[#9e9189] focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              />
              {isSearching && (
                <RefreshCw className="absolute right-3.5 size-4 animate-spin text-[#a67c52]" />
              )}
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="mt-2 divide-y divide-[#f0ece7] rounded-2xl border border-[#e8e0d5] bg-white p-1.5 shadow-xl">
                {suggestions.map((item, idx) => {
                  const lat = item.position?.lat || 10.0601
                  const lon = item.position?.lon || 76.6214
                  const label = item.display || item.poi?.name || item.address?.freeformAddress || `Position (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelect(lat, lon)}
                      className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-[#faf8f5]"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="size-4 text-blue-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-[#2c2825]">{label}</p>
                          <p className="text-[11px] font-mono text-[#9e9189]">{lat.toFixed(4)}° N, {lon.toFixed(4)}° E</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600">
                        Scan 10km <ArrowRight className="size-3" />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Coordinate Sectors */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#9e9189]">
                Quick Coordinate Sectors (10km Grid)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_COORDINATES.map((sec) => {
                const isSelected =
                  currentSector &&
                  Math.abs(currentSector.lat - sec.lat) < 0.001 &&
                  Math.abs(currentSector.lon - sec.lon) < 0.001

                return (
                  <button
                    key={sec.name}
                    type="button"
                    onClick={() => handleSelect(sec.lat, sec.lon)}
                    className={`flex items-center justify-between rounded-2xl p-3 text-left transition-all border ${
                      isSelected
                        ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-md'
                        : 'border-[#e8e0d5] bg-white text-[#2c2825] hover:border-[#2563eb] hover:bg-[#faf8f5]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <MapPin className="size-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-mono font-black leading-tight truncate">{sec.lat.toFixed(4)}°, {sec.lon.toFixed(4)}°</p>
                        <p className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#9e9189]'}`}>
                          10km radius grid
                        </p>
                      </div>
                    </div>

                    {isSelected ? (
                      <CheckCircle2 className="size-4 text-white shrink-0" />
                    ) : (
                      <ArrowRight className="size-3.5 text-[#9e9189] shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#e8e0d5] bg-white p-4 text-center">
          <p className="text-[11px] text-[#9e9189]">
            All congestion points within the 10km perimeter are marked strictly by their exact latitude and longitude.
          </p>
        </div>
      </div>
    </div>
  )
}
