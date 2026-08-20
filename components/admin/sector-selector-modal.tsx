'use client'

import { useState, useRef, useEffect } from 'react'
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
  Sparkles,
  Navigation,
  Globe2,
} from 'lucide-react'

export interface SectorPoint {
  name: string
  cityName?: string
  district?: string
  lat: number
  lon: number
  radiusKm: number
}

export const PRESET_CITIES: SectorPoint[] = [
  {
    name: 'Kochi (Ernakulam)',
    cityName: 'Kochi (Ernakulam)',
    district: 'Central Metro Corridor',
    lat: 10.0033,
    lon: 76.2996,
    radiusKm: 10,
  },
  {
    name: 'Thiruvananthapuram',
    cityName: 'Thiruvananthapuram',
    district: 'Capital City & Technopark',
    lat: 8.5241,
    lon: 76.9366,
    radiusKm: 10,
  },
  {
    name: 'Kozhikode',
    cityName: 'Kozhikode',
    district: 'Malabar Coastal Commercial Hub',
    lat: 11.2588,
    lon: 75.7804,
    radiusKm: 10,
  },
  {
    name: 'Thrissur',
    cityName: 'Thrissur',
    district: 'Swaraj Round & Arterials',
    lat: 10.5276,
    lon: 76.2144,
    radiusKm: 10,
  },
  {
    name: 'Kothamangalam',
    cityName: 'Kothamangalam',
    district: 'MC Road & High-Range Gateway',
    lat: 10.0601,
    lon: 76.6214,
    radiusKm: 10,
  },
  {
    name: 'Aluva - Angamaly',
    cityName: 'Aluva / Angamaly',
    district: 'Airport & Industrial Transit Belt',
    lat: 10.1076,
    lon: 76.3516,
    radiusKm: 10,
  },
  {
    name: 'Munnar',
    cityName: 'Munnar',
    district: 'NH 85 Hill Station Corridor',
    lat: 10.0889,
    lon: 77.0595,
    radiusKm: 10,
  },
]

interface SectorSelectorModalProps {
  isOpen: boolean
  currentSector?: SectorPoint | null
  isFirstTime?: boolean
  onClose?: () => void
  onSelectSector: (sector: SectorPoint) => void
}

export function SectorSelectorModal({
  isOpen,
  currentSector,
  isFirstTime = false,
  onClose,
  onSelectSector,
}: SectorSelectorModalProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<any>(null)

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  // Reverse geocoding helper using TomTom API
  const reverseGeocodeCity = async (lat: number, lon: number): Promise<string> => {
    // Check known presets first
    const match = PRESET_CITIES.find(
      (c) => Math.abs(c.lat - lat) < 0.02 && Math.abs(c.lon - lon) < 0.02
    )
    if (match) return match.cityName || match.name

    try {
      const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json?key=${KEY}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const addr = data.addresses?.[0]?.address
        if (addr) {
          return (
            addr.municipality ||
            addr.municipalitySubdivision ||
            addr.freeformAddress ||
            `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
          )
        }
      }
    } catch (_) {}
    return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
  }

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
          display: `Direct Coordinates (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E)`,
          city: 'Custom GPS Grid Center',
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
        const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(
          val
        )}.json?key=${KEY}&limit=6`
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
    }, 280)
  }

  const handleSelectCustom = async (lat: number, lon: number, givenLabel?: string) => {
    let resolvedCityName = givenLabel
    if (!resolvedCityName || resolvedCityName.includes('Direct Coordinates')) {
      resolvedCityName = await reverseGeocodeCity(lat, lon)
    }

    const sector: SectorPoint = {
      name: resolvedCityName,
      cityName: resolvedCityName,
      district: `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
      lat,
      lon,
      radiusKm: 10,
    }
    try {
      localStorage.setItem('planner_active_city', JSON.stringify(sector))
      localStorage.setItem('planner_has_selected_city', 'true')
    } catch (_) {}
    onSelectSector(sector)
  }

  const handleSelectPreset = (preset: SectorPoint) => {
    try {
      localStorage.setItem('planner_active_city', JSON.stringify(preset))
      localStorage.setItem('planner_has_selected_city', 'true')
    } catch (_) {}
    onSelectSector(preset)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="border-b border-slate-100 bg-slate-50/70 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                <Building2 className="size-5.5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    Select Operational City & Sector
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-900">
                    10km Grid
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Choose your target city or enter GPS coordinates to initialize live congestion telemetry.
                </p>
              </div>
            </div>

            {onClose && !isFirstTime && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Active Grid Banner */}
          <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-950 font-semibold">
              <Radio className="size-4 text-emerald-600 animate-pulse" />
              <span>
                Operations Area: <strong>10 km Radius Telemetry Grid</strong>
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full">
              <Globe2 className="size-3 text-emerald-700" />
              TomTom Live Traffic
            </div>
          </div>

          {/* Search / Custom Location Box */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Search City, Town, or Enter Custom GPS Coordinates:
            </label>
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 size-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Type city name (e.g. Kochi, Bangalore, Aluva) or lat, lon..."
                autoFocus
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
              />
              {isSearching && (
                <RefreshCw className="absolute right-3.5 size-4 animate-spin text-emerald-600" />
              )}
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl max-h-56 overflow-y-auto">
                {suggestions.map((item, idx) => {
                  const lat = item.position?.lat || 10.0601
                  const lon = item.position?.lon || 76.6214
                  const label =
                    item.display ||
                    item.poi?.name ||
                    item.address?.municipality ||
                    item.address?.freeformAddress ||
                    `Coordinates (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`
                  const subtitle =
                    item.address?.freeformAddress ||
                    `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCustom(lat, lon, label)}
                      className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-emerald-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <MapPin className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{label}</p>
                          <p className="text-[11px] font-mono text-slate-500">{subtitle}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                        Select <ArrowRight className="size-3" />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Preset Major City Hubs */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Quick Select Operational City Sectors (Kerala Grid)
              </span>
              <span className="text-[10px] text-slate-400">Click to initialize</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_CITIES.map((city) => {
                const isSelected =
                  currentSector &&
                  ((currentSector.cityName && currentSector.cityName === city.cityName) ||
                    (Math.abs(currentSector.lat - city.lat) < 0.005 &&
                      Math.abs(currentSector.lon - city.lon) < 0.005))

                return (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => handleSelectPreset(city)}
                    className={`group flex items-center justify-between rounded-2xl p-3.5 text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-emerald-300 hover:bg-slate-50 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition ${
                          isSelected
                            ? 'bg-white text-emerald-600'
                            : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
                        }`}
                      >
                        <Building2 className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-extrabold leading-tight truncate">
                            {city.cityName || city.name}
                          </p>
                        </div>
                        <p
                          className={`text-[10px] truncate mt-0.5 ${
                            isSelected ? 'text-emerald-100' : 'text-slate-500'
                          }`}
                        >
                          {city.district}
                        </p>
                        <p
                          className={`text-[10px] font-mono font-semibold ${
                            isSelected ? 'text-white/80' : 'text-emerald-700'
                          }`}
                        >
                          {city.lat.toFixed(4)}° N, {city.lon.toFixed(4)}° E
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="size-3" /> Active
                        </span>
                      ) : (
                        <div className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition group-hover:border-emerald-600 group-hover:bg-emerald-600 group-hover:text-white">
                          <ArrowRight className="size-3.5" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500">
            Selected city coordinates establish the <strong>10km surveillance radius</strong> for live TomTom traffic flow, ML bottleneck forecasts, and signal decision support.
          </p>
        </div>
      </div>
    </div>
  )
}
