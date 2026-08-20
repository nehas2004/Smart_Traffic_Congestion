'use client'

import { useEffect, useState } from 'react'
import { TrafficMapView } from '@/components/admin/traffic-map-view'
import { DecisionSupportCard } from '@/components/admin/decision-support-card'
import { ActiveIncidentsPanel } from '@/components/admin/active-incidents-panel'
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
import { Map, Layers, RefreshCw, AlertCircle, ArrowLeft, Flame } from 'lucide-react'
import Link from 'next/link'

export default function AdminTrafficMapPage() {
  const [corridors, setCorridors] = useState<CorridorDetail[]>([])
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([])
  const [recommendations, setRecommendations] = useState<TrafficRecommendation[]>([])
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('corr-01')
  const [activeCity, setActiveCity] = useState('Kochi (Ernakulam)')
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lon: number }>({ lat: 10.0033, lon: 76.2996 })
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadData(sector?: { lat: number; lon: number; name: string; cityName?: string }) {
    setLoading(true)
    try {
      let sec = sector
      if (!sec) {
        try {
          const s = localStorage.getItem('planner_active_city')
          if (s) sec = JSON.parse(s)
        } catch (_) {}
      }
      if (sec) {
        const displayName = sec.cityName || sec.name || `${sec.lat.toFixed(4)}°, ${sec.lon.toFixed(4)}°`
        setActiveCity(displayName)
        setActiveCoords({ lat: sec.lat, lon: sec.lon })
      }

      const [cData, bData, rData] = await Promise.all([
        fetchCurrentTraffic(sec),
        fetchBottlenecks(sec),
        fetchRecommendations(sec),
      ])
      setCorridors(cData as CorridorDetail[])
      setBottlenecks(bData)
      setRecommendations(rData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const onCityChange = (e: any) => {
      if (e.detail) {
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
  }, [])

  const selectedRecommendation = recommendations.find(
    (r) => r.corridor_id === selectedCorridorId
  )

  async function handleDecision(
    recId: string,
    action: DecisionAction,
    params?: {
      timingAdjustment?: number
      reroutePercent?: number
      notes?: string
    }
  ) {
    const targetRec = recommendations.find((r) => r.id === recId)
    if (!targetRec) return

    await submitDecision({
      recommendation_id: recId,
      corridor_id: targetRec.corridor_id,
      corridor_name: targetRec.corridor_name,
      action: action,
      operator: 'City Traffic Controller',
      reason_or_notes: params?.notes,
      modified_parameters: {
        custom_timing_seconds: params?.timingAdjustment,
        reroute_percentage: params?.reroutePercent,
      },
    })
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
