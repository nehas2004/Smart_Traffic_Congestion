'use client'

import { useEffect, useState } from 'react'
import { AdminKpiGrid } from '@/components/admin/admin-kpi-grid'
import { DecisionSupportCard } from '@/components/admin/decision-support-card'
import { AdminBottleneckTable } from '@/components/admin/admin-bottleneck-table'
import { ActiveIncidentsPanel } from '@/components/admin/active-incidents-panel'
import {
  fetchCurrentTraffic,
  fetchBottlenecks,
  fetchRecommendations,
  fetchDecisionHistory,
  submitDecision,
  fetchDashboardMetrics,
  DashboardMetrics,
} from '@/lib/admin-api'
import {
  SharedTrafficData,
  BottleneckItem,
  TrafficRecommendation,
  DecisionRecord,
  DecisionAction,
} from '@/types/traffic'
import { ShieldCheck, RefreshCw, Zap, ArrowUpRight, History, Flame } from 'lucide-react'
import Link from 'next/link'
import { ReportIncidentModal } from '@/components/admin/report-incident-modal'

export default function AdminOverviewPage() {
  const [corridors, setCorridors] = useState<SharedTrafficData[]>([])
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([])
  const [recommendations, setRecommendations] = useState<TrafficRecommendation[]>([])
  const [decisions, setDecisions] = useState<DecisionRecord[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [activeSectorName, setActiveSectorName] = useState('Kochi (Ernakulam)')
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lon: number }>({ lat: 10.0033, lon: 76.2996 })
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function loadData(sector?: { lat: number; lon: number; name: string; cityName?: string }) {
    setIsRefreshing(true)
    try {
      let sec = sector
      if (!sec) {
        try {
          const s = localStorage.getItem('planner_active_city')
          if (s) sec = JSON.parse(s)
        } catch (_) {}
      }
      if (sec) {
        setActiveSectorName(sec.name || sec.cityName || 'Active City Sector')
        setActiveCoords({ lat: sec.lat, lon: sec.lon })
      }

      const [cData, bData, rData, dData, mData] = await Promise.all([
        fetchCurrentTraffic(sec),
        fetchBottlenecks(sec),
        fetchRecommendations(sec),
        fetchDecisionHistory(),
        fetchDashboardMetrics(sec),
      ])
      setCorridors(cData)
      setBottlenecks(bData)
      setRecommendations(rData)
      setDecisions(dData)
      setMetrics(mData)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
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

    window.addEventListener('planner_city_changed', onCityChange)
    window.addEventListener('incident_reported', onIncidentReported)
    return () => {
      window.removeEventListener('planner_city_changed', onCityChange)
      window.removeEventListener('incident_reported', onIncidentReported)
    }
  }, [])

  async function handleDecisionAction(
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

    const { success, record } = await submitDecision({
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

    if (success) {
      setDecisions((prev) => [record, ...prev])
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Page Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-[#2c2825]">
              Executive Traffic Ops Dashboard
            </h1>
            <div className="flex items-center gap-1.5 rounded-xl border border-blue-600/30 bg-blue-50 px-3 py-1 text-xs font-black text-blue-950 shadow-2xs">
              <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
              <span>{activeSectorName}</span>
              <span className="font-mono text-[11px] font-bold text-blue-700/80">
                ({activeCoords.lat.toFixed(4)}°, {activeCoords.lon.toFixed(4)}°)
              </span>
            </div>
          </div>
          <p className="mt-1 text-sm text-[#9e9189]">
            Live congestion telemetry & AI decision support within 10km radius of {activeSectorName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:from-amber-700 hover:to-orange-700 hover:scale-[1.02]"
          >
            <Flame className="size-3.5 fill-white" />
            Report Event Disruption
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-white px-3.5 py-2 text-xs font-bold text-[#2c2825] shadow-sm transition-all hover:bg-[#faf8f5]"
          >
            <RefreshCw className={`size-3.5 text-[#a67c52] ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>

          <Link
            href="/admin/traffic"
            className="flex items-center gap-1.5 rounded-xl bg-[#2c2825] px-4 py-2 text-xs font-bold text-[#faf8f5] shadow-sm transition-all hover:bg-[#1e1b18]"
          >
            <Zap className="size-3.5 text-[#c8a97e]" />
            Live Congestion Map
          </Link>
        </div>
      </div>

      {/* KPI METRIC TILES */}
      <AdminKpiGrid
        corridors={corridors}
        bottlenecks={bottlenecks}
        recommendations={recommendations}
        metrics={metrics}
        cityName={activeSectorName}
      />

      {/* DECISION SUPPORT HIGH PRIORITY QUEUE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-[#a67c52] text-white">
              <Zap className="size-3.5" />
            </div>
            <h2 className="text-lg font-extrabold text-[#2c2825]">
              Decision Support Priority Queue
            </h2>
          </div>
          <span className="text-xs font-bold text-[#9e9189]">
            {recommendations.length} Active System Recommendations
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {recommendations.map((rec) => (
            <DecisionSupportCard
              key={rec.id}
              recommendation={rec}
              onDecision={handleDecisionAction}
            />
          ))}
          {recommendations.length === 0 && !loading && (
            <div className="col-span-2 rounded-2xl border border-[#e8e0d5] bg-white p-12 text-center text-sm text-[#9e9189]">
              <ShieldCheck className="mx-auto size-8 text-emerald-600 mb-2" />
              All traffic recommendations have been resolved or dismissed.
            </div>
          )}
        </div>
      </div>

      {/* ACTIVE REPORTED LOCAL DISRUPTIONS PANEL */}
      <ActiveIncidentsPanel onIncidentCancelled={() => loadData()} />

      {/* BOTTLENECK SURVEILLANCE & RECENT DECISIONS SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl border border-[#e8e0d5] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#2c2825]">Active Congestion Bottlenecks</h2>
              <p className="text-xs text-[#9e9189]">Corridors experiencing speed degradation & queue formation</p>
            </div>
            <Link
              href="/admin/traffic"
              className="flex items-center gap-1 text-xs font-bold text-[#a67c52] hover:underline"
            >
              View on map <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <AdminBottleneckTable bottlenecks={bottlenecks} />
        </div>

        {/* RECENT DECISIONS SNIPPET */}
        <div className="rounded-3xl border border-[#e8e0d5] bg-white p-6 shadow-sm h-fit">
          <div className="flex items-center justify-between border-b border-[#f0ece7] pb-4 mb-4">
            <div className="flex items-center gap-2">
              <History className="size-4 text-[#a67c52]" />
              <h3 className="text-sm font-extrabold text-[#2c2825]">
                Recent Operator Actions
              </h3>
            </div>
            <Link
              href="/admin/decisions"
              className="flex items-center gap-1 text-xs font-bold text-[#a67c52] hover:text-[#2c2825]"
            >
              Full History <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#f0ece7]">
            {decisions.slice(0, 5).map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#2c2825]">{d.corridor_name}</span>
                  <p className="text-[#9e9189] text-[11px] mt-0.5">{d.reason_or_notes}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-[#f5f2ee] text-[#2c2825]">
                    {d.action}
                  </span>
                  <p className="text-[10px] text-[#9e9189] font-mono mt-1">
                    {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
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
