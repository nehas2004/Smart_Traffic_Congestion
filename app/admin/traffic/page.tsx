'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { TrafficMapView } from '@/components/admin/traffic-map-view'
import { ActiveIncidentsPanel } from '@/components/admin/active-incidents-panel'
import { DecisionSupportCard } from '@/components/admin/decision-support-card'
import { ReportIncidentModal } from '@/components/admin/report-incident-modal'
import {
  fetchCurrentTraffic,
  fetchBottlenecks,
  fetchRecommendations,
  submitDecision,
} from '@/lib/admin-api'
import {
  CorridorDetail,
  BottleneckItem,
  TrafficRecommendation,
  DecisionAction,
} from '@/types/traffic'
import { RefreshCw, Flame, ArrowLeft } from 'lucide-react'

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

  const selectedRecommendation = recommendations.find((r) => r.corridor_id === selectedCorridorId) || recommendations[0]

  const handleDecision = async (
    recommendationId: string,
    action: DecisionAction,
    modifiedParameters?: Record<string, any>,
    reason?: string
  ) => {
    try {
      await submitDecision({
        recommendation_id: recommendationId,
        action,
        modified_parameters: modifiedParameters,
        reason,
      })
      await loadData()
    } catch (e) {
      console.error('Error submitting decision:', e)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-900">10km Grid Traffic Intelligence</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-1">
            Live 10km Congestion Grid & Location Intelligence
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Active Grid Center: {activeCity} · Radius: 10.0 km
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:scale-[1.02] cursor-pointer"
          >
            <Flame className="size-3.5 fill-white" />
            Report Event Disruption
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="size-3.5 text-emerald-600" />
            Refresh Corridors
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

      {/* ACTIVE REPORTED LOCAL DISRUPTIONS PANEL */}
      <ActiveIncidentsPanel onIncidentCancelled={() => loadData()} />

      {/* CORRIDOR CONTEXT DECISION SUPPORT */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">
          Active Corridor Decision Support
        </h2>
        {selectedRecommendation ? (
          <DecisionSupportCard
            recommendation={selectedRecommendation}
            onDecision={handleDecision}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            No pending action items for this corridor.
          </div>
        )}
      </div>

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
