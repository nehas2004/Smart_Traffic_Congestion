'use client'

import { TrafficRecommendation, EventImpact } from '@/types/traffic'
import { Zap, Calendar, Sparkles, AlertCircle } from 'lucide-react'

interface DecisionSupportShellProps {
  recommendation?: TrafficRecommendation | null
  eventImpact?: EventImpact | null
  children?: React.ReactNode // Mount point for another module's recommendation component
}

export function DecisionSupportShell({
  recommendation,
  eventImpact,
  children,
}: DecisionSupportShellProps) {
  return (
    <div className="rounded-2xl border border-[#e8e0d5] bg-white p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f0ece7] pb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#2c2825] text-[#c8a97e]">
            <Zap className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#2c2825]">
              Decision Support System Shell
            </h3>
            <p className="text-xs text-[#9e9189]">
              Surfacing event-impact context and AI recommendation side-by-side
            </p>
          </div>
        </div>

        <span className="rounded-full bg-[#f5f2ee] px-2.5 py-0.5 text-[10px] font-bold text-[#6b625b]">
          Integration Mount Slot
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Why this matters (Event Context) */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-amber-800" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Corridor Event Context
            </h4>
          </div>

          {eventImpact ? (
            <div className="space-y-1.5 text-xs text-amber-950">
              <p className="font-bold text-sm">{eventImpact.event_name}</p>
              <p className="text-[11px] text-amber-900">
                Venue: {eventImpact.venue} · Peak: {eventImpact.peak_window}
              </p>
              <p className="text-[11px] text-amber-800">
                Expected Surge: +{Math.round((eventImpact.congestion_multiplier - 1) * 100)}% traffic load ({eventImpact.expected_attendance.toLocaleString()} attendees)
              </p>
            </div>
          ) : (
            <p className="text-xs text-amber-850">
              No overlapping major special events reported for the currently selected corridor.
            </p>
          )}
        </div>

        {/* Right: What to do (AI Recommendation Mount Point Slot) */}
        <div className="rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#a67c52]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2c2825]">
              AI Mitigation Recommendation (Mount Area)
            </h4>
          </div>

          {/* Reserved slot for Ameena's recommendation component */}
          {children ? (
            children
          ) : recommendation ? (
            <div className="space-y-2 text-xs">
              <p className="font-bold text-sm text-[#2c2825]">{recommendation.title || recommendation.action_type}</p>
              <p className="text-xs text-[#6b625b] leading-relaxed">{recommendation.description}</p>
              <div className="flex items-center justify-between text-[11px] text-[#9e9189] border-t border-[#e8e0d5] pt-2">
                <span>Confidence: {Math.round(recommendation.confidence * 100)}%</span>
                <span className="font-semibold text-emerald-700">
                  Est. Delay Reduction: -{recommendation.expected_delay_reduction_mins}m
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#9e9189]">
              No active AI recommendation payload received for this corridor.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
