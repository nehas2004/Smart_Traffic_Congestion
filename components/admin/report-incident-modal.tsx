'use client'

import { useState, useRef } from 'react'
import {
  AlertTriangle,
  MapPin,
  Clock,
  Radio,
  Flame,
  X,
  Search,
  PlusCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { IncidentCategory, SeverityLevel, ReportedIncident } from '@/types/traffic'

const CATEGORIES: { id: IncidentCategory; label: string; icon: string; defaultDelay: number; defaultRadius: number }[] = [
  { id: 'temple_fest', label: 'Temple Fest / Procession', icon: '🎪', defaultDelay: 25, defaultRadius: 1500 },
  { id: 'accident', label: 'Road Accident / Crash', icon: '💥', defaultDelay: 15, defaultRadius: 800 },
  { id: 'concert', label: 'Concert / Public Gathering', icon: '🎸', defaultDelay: 20, defaultRadius: 1200 },
  { id: 'construction', label: 'Road Work / Construction', icon: '🚧', defaultDelay: 12, defaultRadius: 600 },
  { id: 'weather_hazard', label: 'Waterlogging / Hazard', icon: '⛈️', defaultDelay: 18, defaultRadius: 1000 },
  { id: 'procession', label: 'Rally / Marathon Event', icon: '🚩', defaultDelay: 22, defaultRadius: 2000 },
  { id: 'other', label: 'General Congestion Choke', icon: '⚠️', defaultDelay: 10, defaultRadius: 500 },
]

interface ReportIncidentModalProps {
  isOpen: boolean
  defaultLat?: number
  defaultLon?: number
  onClose: () => void
  onIncidentReported?: (incident: ReportedIncident) => void
}

export function ReportIncidentModal({
  isOpen,
  defaultLat = 10.0601,
  defaultLon = 76.6214,
  onClose,
  onIncidentReported,
}: ReportIncidentModalProps) {
  const [category, setCategory] = useState<IncidentCategory>('temple_fest')
  const [title, setTitle] = useState('Annual Temple Festival Procession (Utsavam)')
  const [lat, setLat] = useState<string>(defaultLat.toFixed(4))
  const [lon, setLon] = useState<string>(defaultLon.toFixed(4))
  const [locationName, setLocationName] = useState('')
  const [severity, setSeverity] = useState<SeverityLevel>('severe')
  const [delayMins, setDelayMins] = useState<number>(25)
  const [radiusMeters, setRadiusMeters] = useState<number>(1500)
  const [durationHours, setDurationHours] = useState<number>(4)
  const [description, setDescription] = useState('Heavy pedestrian footfall and procession blocking mainline carriageway.')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // TomTom Search Autocomplete for place picking
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchDebounceRef = useRef<any>(null)

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  const handleCategorySelect = (cat: typeof CATEGORIES[0]) => {
    setCategory(cat.id)
    setDelayMins(cat.defaultDelay)
    setRadiusMeters(cat.defaultRadius)
    if (!title || CATEGORIES.some((c) => title.includes(c.label))) {
      setTitle(`${cat.label}`)
    }
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    if (!val || val.trim().length < 2) {
      setSuggestions([])
      return
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(val)}.json?key=${KEY}&limit=5`
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

  const handleSelectSuggestion = (item: any) => {
    const pLat = item.position.lat
    const pLon = item.position.lon
    const name = item.poi?.name || item.address?.freeformAddress || 'Selected Point'
    setLat(pLat.toFixed(4))
    setLon(pLon.toFixed(4))
    setLocationName(name)
    setSearchQuery(name)
    setSuggestions([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const parsedLat = parseFloat(lat)
    const parsedLon = parseFloat(lon)

    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      setError('Please provide valid decimal coordinates (Latitude & Longitude).')
      setIsSubmitting(false)
      return
    }

    try {
      const startTime = new Date().toISOString()
      const endTime = new Date(Date.now() + durationHours * 3600 * 1000).toISOString()

      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          lat: parsedLat,
          lon: parsedLon,
          severity,
          impact_radius_meters: radiusMeters,
          expected_delay_mins: delayMins,
          start_time: startTime,
          end_time: endTime,
          description: description + (locationName ? ` (Location: ${locationName})` : ''),
          reported_by: 'City Planner Operations Desk',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSuccess(true)
        if (onIncidentReported && data.incident) {
          onIncidentReported(data.incident)
        }
        // Broadcast custom event so active maps refresh their heatmap layers instantly
        window.dispatchEvent(new CustomEvent('incident_reported', { detail: data.incident }))

        setTimeout(() => {
          setSuccess(false)
          onClose()
        }, 1200)
      } else {
        const d = await res.json()
        setError(d.error || 'Failed to submit incident report.')
      }
    } catch (err: any) {
      setError(err?.message || 'Network error recording incident.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="border-b border-slate-100 bg-slate-50/70 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  Report Congestion / Local Event Disruption
                </h2>
                <p className="text-xs text-slate-500">
                  Broadcasts heat blobs to City Planner heatmap & Commuters route views
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Incident reported successfully! Updating heatmaps...</span>
            </div>
          )}

          {/* 1. Category Selector */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Disruption / Event Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`flex items-center gap-2 rounded-2xl p-2.5 text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-xs font-extrabold leading-tight">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Incident Title */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Incident Title / Event Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Temple Festival Procession (Utsavam)"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none shadow-xs"
            />
          </div>

          {/* 3. Location Coordinate Picker / Place Search */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Location & Exact Coordinates
            </label>

            {/* Place Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search landmark / street to auto-fill coordinates..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none shadow-xs"
              />
              {isSearching && (
                <RefreshCw className="absolute right-3.5 top-3 size-4 animate-spin text-emerald-600" />
              )}

              {/* Suggestions Dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute top-11 left-0 right-0 z-30 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                  {suggestions.map((item, idx) => {
                    const title = item.poi?.name || item.address?.freeformAddress || 'Place'
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="flex w-full items-center justify-between p-2 text-left text-xs font-bold text-slate-900 hover:bg-emerald-50 rounded-lg cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="size-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{title}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {item.position.lat.toFixed(4)}, {item.position.lon.toFixed(4)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Direct Lat/Lon Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-1">Latitude (°N)</span>
                <input
                  type="text"
                  required
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-1">Longitude (°E)</span>
                <input
                  type="text"
                  required
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. Severity & Estimated Impact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none cursor-pointer"
              >
                <option value="severe">🔴 Severe (Gridlock)</option>
                <option value="heavy">🟠 Heavy Delay</option>
                <option value="moderate">🟡 Moderate Slowdown</option>
                <option value="low">🟢 Minor Impact</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                Added Delay (Mins)
              </label>
              <input
                type="number"
                min="3"
                max="120"
                value={delayMins}
                onChange={(e) => setDelayMins(parseInt(e.target.value) || 10)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                Duration (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="72"
                value={durationHours}
                onChange={(e) => setDurationHours(parseInt(e.target.value) || 2)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* 5. Description / Mitigation Directive */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Description & Advisory Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context (e.g. Temple procession moving from East Gate, divert via outer bypass)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Flame className="size-4 fill-white" />
              )}
              <span>Publish to Heatmaps</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
