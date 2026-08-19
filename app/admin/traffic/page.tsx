'use client'

import { useEffect, useState } from 'react'
import { TrafficMapView } from '@/components/admin/traffic-map-view'
import { DecisionSupportCard } from '@/components/admin/decision-support-card'
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
import { Map, Layers, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminTrafficMapPage() {
  const [corridors, setCorridors] = useState<CorridorDetail[]>([])
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([])
  const [recommendations, setRecommendations] = useState<TrafficRecommendation[]>([])
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('corr-01')
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    try {
      const [cData, bData, rData] = await Promise.all([
        fetchCurrentTraffic(),
        fetchBottlenecks(),
        fetchRecommendations(),
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
  }, [])

  const selectedRecommendation = recommendations.find(
    (r) => r.corridor_id === selectedCorridorId
  ) || recommendations[0]

  async function handleDecision(
    recId: string,
    action: DecisionAction,
    params?: {
      timingAdjustment?: number
      reroutePercent?: number
      notes?: string
    }
  ) {
    if (!selectedRecommendation) return
    await submitDecision({
      recommendation_id: recId,
      corridor_id: selectedRecommendation.corridor_id,
      corridor_name: selectedRecommendation.corridor_name,
      action: action,
      operator: 'Arshad (Admin)',
      reason_or_notes: params?.notes,
      modified_parameters: {
        custom_timing_seconds: params?.timingAdjustment,
        reroute_percentage: params?.reroutePercent,
      },
    })
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-1 text-xs font-bold text-[#9e9189] hover:text-[#2c2825]"
            >
              <ArrowLeft className="size-3.5" /> Overview
            </Link>
            <span className="text-xs text-[#e8e0d5]">/</span>
            <span className="text-xs font-bold text-[#a67c52]">Traffic Congestion Surveillance</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#2c2825]">
            Network Congestion & Location Intelligence
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-white px-3.5 py-2 text-xs font-bold text-[#2c2825] shadow-sm hover:bg-[#faf8f5]"
          >
            <RefreshCw className="size-3.5 text-[#a67c52]" />
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

      {/* CORRIDOR CONTEXT DECISION SUPPORT */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-[#2c2825]">
          Active Corridor Decision Support
        </h2>
        {selectedRecommendation ? (
          <DecisionSupportCard
            recommendation={selectedRecommendation}
            onDecision={handleDecision}
          />
        ) : (
          <div className="rounded-2xl border border-[#e8e0d5] bg-white p-8 text-center text-xs text-[#9e9189]">
            No pending action items for this corridor.
          </div>
        )}
      </div>
    </main>
  )
}
