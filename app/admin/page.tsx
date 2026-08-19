'use client'

import { useEffect, useState } from 'react'
import { AdminKpiGrid } from '@/components/admin/admin-kpi-grid'
import { DecisionSupportCard } from '@/components/admin/decision-support-card'
import { AdminBottleneckTable } from '@/components/admin/admin-bottleneck-table'
import {
  fetchCurrentTraffic,
  fetchBottlenecks,
  fetchRecommendations,
  fetchDecisionHistory,
  submitDecision,
} from '@/lib/admin-api'
import {
  SharedTrafficData,
  BottleneckItem,
  TrafficRecommendation,
  DecisionRecord,
  DecisionAction,
} from '@/types/traffic'
import { ShieldCheck, RefreshCw, Zap, ArrowUpRight, History } from 'lucide-react'
import Link from 'next/link'

export default function AdminOverviewPage() {
  const [corridors, setCorridors] = useState<SharedTrafficData[]>([])
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([])
  const [recommendations, setRecommendations] = useState<TrafficRecommendation[]>([])
  const [decisions, setDecisions] = useState<DecisionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function loadData() {
    setIsRefreshing(true)
    try {
      const [cData, bData, rData, dData] = await Promise.all([
        fetchCurrentTraffic(),
        fetchBottlenecks(),
        fetchRecommendations(),
        fetchDecisionHistory(),
      ])
      setCorridors(cData)
      setBottlenecks(bData)
      setRecommendations(rData)
      setDecisions(dData)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
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
      operator: 'Arshad (Admin)',
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#2c2825]">
              Executive Traffic Ops Dashboard
            </h1>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              Operational Mode
            </span>
          </div>
          <p className="mt-1 text-sm text-[#9e9189]">
            Real-time congestion surveillance, ML-driven decision support & control overrides
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
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

      {/* BOTTLENECK SURVEILLANCE & RECENT DECISIONS SPLIT */}
      <div className="space-y-6">
        <AdminBottleneckTable bottlenecks={bottlenecks} />

        {/* RECENT DECISIONS SNIPPET */}
        <div className="rounded-2xl border border-[#e8e0d5] bg-white p-5 shadow-sm">
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
              View Full History <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#f0ece7]">
            {decisions.slice(0, 3).map((d) => (
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
    </main>
  )
}
