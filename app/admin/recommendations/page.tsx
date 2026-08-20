'use client'

import { useEffect, useState, useCallback } from 'react'
import { DecisionSupportCard } from '@/components/admin/decision-support-card'
import {
  fetchRecommendations,
  submitDecision,
} from '@/lib/admin-api'
import {
  TrafficRecommendation,
  DecisionAction,
} from '@/types/traffic'
import { RefreshCw, Sparkles, ShieldCheck, MapPin, AlertCircle } from 'lucide-react'

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<TrafficRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [activeSector, setActiveSector] = useState<{ lat: number; lon: number; name?: string; cityName?: string } | null>(null)

  const loadData = useCallback(async (sectorOverride?: { lat: number; lon: number; name?: string; cityName?: string }) => {
    setIsRefreshing(true)
    let sec = sectorOverride || activeSector
    if (!sec) {
      try {
        const stored = localStorage.getItem('planner_active_city')
        if (stored) sec = JSON.parse(stored)
      } catch (_) {}
    }

    try {
      const recs = await fetchRecommendations(sec || undefined)
      setRecommendations(recs)
      setLastRefresh(new Date())
    } catch (_) {
      setRecommendations([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [activeSector])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('planner_active_city')
      if (stored) {
        const parsed = JSON.parse(stored)
        setActiveSector(prev => {
          if (prev && prev.lat === parsed.lat && prev.lon === parsed.lon) {
            return prev
          }
          return parsed
        })
      }
    } catch (_) {}

    loadData()

    const handleCityChanged = (e: any) => {
      if (e.detail) {
        setActiveSector(e.detail)
        loadData(e.detail)
      }
    }
    window.addEventListener('planner_city_changed', handleCityChanged)
    return () => window.removeEventListener('planner_city_changed', handleCityChanged)
  }, [loadData])

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

  const activeCityName = activeSector?.name || activeSector?.cityName || 'Active City Sector'

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <main className="mx-auto max-w-5xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                City Planner · AI Advisory Queue
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-900">
                <Sparkles className="size-3 text-emerald-600" />
                {recommendations.length} Active in Queue
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">
              AI Traffic Recommendations
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-bold text-slate-900">
                <MapPin className="size-3.5 text-emerald-600" />
                {activeCityName}
              </span>
              <span>·</span>
              <span>
                {lastRefresh
                  ? `Last evaluated: ${lastRefresh.toLocaleTimeString()}`
                  : 'Evaluating live telemetry...'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 transition-all hover:bg-emerald-700 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing Telemetry...' : 'Refresh Queue'}</span>
          </button>
        </div>

        {/* Advisory Context Alert */}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs font-medium text-emerald-950">
          <ShieldCheck className="size-5 shrink-0 text-emerald-600" />
          <p>
            <strong>Human-in-the-Loop Protocol:</strong> AI recommendations do not modify signal logic automatically. Every intervention requires explicit planner review, parameter customization, or dismissal.
          </p>
        </div>

        {/* Priority Recommendation Queue */}
        <div className="space-y-5">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-400">
              <RefreshCw className="mx-auto mb-3 size-6 animate-spin text-emerald-600" />
              Analyzing live sensor telemetry and predicting congestion choke points...
            </div>
          ) : recommendations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-400">
              <AlertCircle className="mx-auto mb-3 size-6 text-slate-400" />
              No active congestion bottlenecks requiring signal intervention in this sector.
            </div>
          ) : (
            recommendations.map((rec) => (
              <DecisionSupportCard
                key={rec.id}
                recommendation={rec}
                onDecision={handleDecisionAction}
              />
            ))
          )}
        </div>
      </main>
    </div>
  )
}
