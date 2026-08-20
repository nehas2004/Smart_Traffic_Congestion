'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrafficMapView } from '@/components/admin/traffic-map-view'
import { ReportIncidentModal } from '@/components/admin/report-incident-modal'
import {
  fetchCurrentTraffic,
  fetchBottlenecks,
  fetchRecommendations,
} from '@/lib/admin-api'
import {
  CorridorDetail,
  BottleneckItem,
  TrafficRecommendation,
} from '@/types/traffic'
import { RefreshCw, Flame } from 'lucide-react'

export default function AdminTrafficMapPage() {
  const [corridors, setCorridors] = useState<CorridorDetail[]>([])
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([])
  const [recommendations, setRecommendations] = useState<TrafficRecommendation[]>([])
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('corr-01')
  const [activeCity, setActiveCity] = useState('Kochi (Ernakulam)')
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lon: number }>({ lat: 10.0033, lon: 76.2996 })
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (sector?: { lat: number; lon: number; name?: string; cityName?: string }) => {
    let sec = sector
    if (!sec) {
      try {
        const s = localStorage.getItem('planner_active_city')
        if (s) sec = JSON.parse(s)
      } catch (_) {}
    }

    if (sec && sec.lat && sec.lon) {
      const displayName = sec.cityName || sec.name || `${sec.lat.toFixed(4)}°, ${sec.lon.toFixed(4)}°`
      setActiveCity(displayName)
      setActiveCoords({ lat: sec.lat, lon: sec.lon })
    }

    // Set loading state to prevent stale data
    setLoading(true)

    try {
      const [cData, bData, rData] = await Promise.all([
        fetchCurrentTraffic(sec ? { lat: sec.lat, lon: sec.lon, name: sec.cityName || sec.name || 'City' } : undefined),
        fetchBottlenecks(sec ? { lat: sec.lat, lon: sec.lon, name: sec.cityName || sec.name || 'City' } : undefined),
        fetchRecommendations(sec ? { lat: sec.lat, lon: sec.lon, name: sec.cityName || sec.name || 'City' } : undefined),
      ])
      setCorridors(cData as CorridorDetail[])
      setBottlenecks(bData)
      setRecommendations(rData)
      if (cData.length > 0) {
        setSelectedCorridorId(cData[0].corridor_id)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Read initial city from localStorage
    try {
      const s = localStorage.getItem('planner_active_city')
      if (s) {
        const parsed = JSON.parse(s)
        if (parsed.lat && parsed.lon) {
          setActiveCity(parsed.cityName || parsed.name || 'Selected City')
          setActiveCoords({ lat: parsed.lat, lon: parsed.lon })
        }
      }
    } catch (_) {}

    loadData()

    const onCityChange = (e: any) => {
      if (e.detail && e.detail.lat && e.detail.lon) {
        loadData(e.detail)
      }
    }

    const onIncidentReported = () => {
      loadData()
    }

    const onIncidentResolved = () => {
      loadData()
    }

    window.addEventListener('planner_city_changed', onCityChange)
    window.addEventListener('incident_reported', onIncidentReported)
    window.addEventListener('incident_resolved', onIncidentResolved)
    return () => {
      window.removeEventListener('planner_city_changed', onCityChange)
      window.removeEventListener('incident_reported', onIncidentReported)
      window.removeEventListener('incident_resolved', onIncidentResolved)
    }
  }, [loadData])

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#9e9189]">
              City Planner · Overview
            </span>
            <span className="text-[#e8e0d5]">/</span>
            <span className="text-xs font-bold text-blue-700">Surveillance Grid</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            <h1 className="text-2xl font-black tracking-tight text-[#2c2825]">
              City Overview & Traffic Surveillance
            </h1>
            <div className="flex items-center gap-1.5 rounded-xl border border-blue-600/30 bg-blue-50 px-3 py-1 text-xs font-black text-blue-950 shadow-2xs">
              <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
              <span>{activeCity}</span>
              <span className="font-mono text-[11px] font-bold text-blue-700/80">
                ({activeCoords.lat.toFixed(4)}°, {activeCoords.lon.toFixed(4)}°)
              </span>
            </div>
          </div>
          <p className="text-xs text-[#9e9189] font-mono mt-0.5">
            Active Grid Sector: {activeCity} · 10.0 km radius surveillance perimeter & live flow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:from-amber-700 hover:to-orange-700 hover:scale-[1.02] cursor-pointer"
          >
            <Flame className="size-3.5 fill-white" />
            Report Event Disruption
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-white px-3.5 py-2 text-xs font-bold text-[#2c2825] shadow-sm hover:bg-[#faf8f5] cursor-pointer"
          >
            <RefreshCw className={`size-3.5 text-[#a67c52] ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* FULL LOCATION INTELLIGENCE & TRAFFIC MAP */}
      <TrafficMapView
        corridors={corridors}
        bottlenecks={bottlenecks}
        recommendations={recommendations}
        selectedCorridorId={selectedCorridorId}
        activeCityName={activeCity}
        activeCoords={activeCoords}
        isLoading={loading}
        onSelectCorridor={(id) => setSelectedCorridorId(id)}
      />

      {/* Report Incident Modal */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        defaultLat={activeCoords.lat}
        defaultLon={activeCoords.lon}
        onClose={() => setIsReportModalOpen(false)}
        onIncidentReported={() => loadData()}
      />
    </main>
  )
}
