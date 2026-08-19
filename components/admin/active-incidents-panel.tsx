'use client'

import { useState, useEffect } from 'react'
import { ReportedIncident } from '@/types/traffic'
import {
  AlertTriangle,
  MapPin,
  Clock,
  Trash2,
  CheckCircle2,
  Flame,
  ShieldCheck,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { cancelReportedIncident } from '@/lib/admin-api'

interface ActiveIncidentsPanelProps {
  onIncidentCancelled?: () => void
}

export function ActiveIncidentsPanel({ onIncidentCancelled }: ActiveIncidentsPanelProps) {
  const [incidents, setIncidents] = useState<ReportedIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadActiveIncidents = async () => {
    try {
      const res = await fetch('/api/incidents', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setIncidents(data || [])
      }
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActiveIncidents()

    const onReported = (e: any) => {
      if (e.detail) {
        setIncidents((prev) => [e.detail, ...prev.filter((i) => i.id !== e.detail.id)])
      }
    }

    const onResolved = (e: any) => {
      if (e.detail?.id) {
        setIncidents((prev) => prev.filter((i) => i.id !== e.detail.id))
      }
    }

    window.addEventListener('incident_reported', onReported)
    window.addEventListener('incident_resolved', onResolved)
    return () => {
      window.removeEventListener('incident_reported', onReported)
      window.removeEventListener('incident_resolved', onResolved)
    }
  }, [])

  const handleCancelIncident = async (incId: string, incTitle: string) => {
    setCancellingId(incId)
    try {
      const ok = await cancelReportedIncident(incId)
      if (ok) {
        setIncidents((prev) => prev.filter((i) => i.id !== incId))
        setSuccessMsg(`Resolved "${incTitle}". Heatmap and commuter routes updated.`)
        setTimeout(() => setSuccessMsg(null), 3500)
        if (onIncidentCancelled) onIncidentCancelled()
      }
    } finally {
      setCancellingId(null)
    }
  }

  const getEmoji = (cat: string) => {
    if (cat === 'temple_fest') return '🎪'
    if (cat === 'accident') return '💥'
    if (cat === 'concert') return '🎸'
    if (cat === 'construction') return '🚧'
    if (cat === 'weather_hazard') return '⛈️'
    if (cat === 'procession') return '🚩'
    return '⚠️'
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#e8e0d5] bg-white p-6 shadow-sm flex items-center justify-center py-10">
        <RefreshCw className="size-5 animate-spin text-[#a67c52]" />
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-[#e8e0d5] bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
            <Flame className="size-4 fill-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#2c2825]">
              Active Reported Local Disruptions
            </h2>
            <p className="text-xs text-[#9e9189]">
              Manually reported events currently impacting heatmaps & commuter routes
            </p>
          </div>
        </div>

        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-900">
          {incidents.length} Active
        </span>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {incidents.length === 0 ? (
        <div className="rounded-2xl border border-[#f0ece7] bg-[#faf8f5] p-8 text-center">
          <ShieldCheck className="mx-auto size-7 text-emerald-600 mb-2" />
          <p className="text-xs font-bold text-[#2c2825]">No Active Disruptions Reported</p>
          <p className="text-[11px] text-[#9e9189] mt-0.5">
            Use "Report Event Disruption" button above to insert temple fests, crashes, or concerts.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#f0ece7]">
          {incidents.map((inc) => {
            const isCancelling = cancellingId === inc.id
            return (
              <div
                key={inc.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-[#faf8f5]/60 -mx-2 px-2 rounded-xl"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getEmoji(inc.category)}</span>
                    <h3 className="text-xs font-extrabold text-[#2c2825]">{inc.title}</h3>
                    <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800 uppercase">
                      +{inc.expected_delay_mins}m delay
                    </span>
                  </div>

                  <p className="text-[11px] text-[#6b625b] leading-tight">
                    {inc.description || 'Disruption affecting local vehicular speed and intersection capacity.'}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-[#9e9189] font-mono">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-blue-600" />
                      {inc.lat.toFixed(4)}° N, {inc.lon.toFixed(4)}° E
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      Radius: {inc.impact_radius_meters}m
                    </span>
                    <span>·</span>
                    <span>By: {inc.reported_by}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => handleCancelIncident(inc.id, inc.title)}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm transition-all hover:bg-red-100 hover:border-red-300 disabled:opacity-50"
                    title="Cancel disruption and clear from heatmaps"
                  >
                    {isCancelling ? (
                      <RefreshCw className="size-3.5 animate-spin text-red-700" />
                    ) : (
                      <XCircle className="size-3.5 text-red-600" />
                    )}
                    <span>Cancel & Resolve</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
