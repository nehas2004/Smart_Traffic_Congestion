'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrafficRecommendation,
  DecisionAction,
} from '@/types/traffic'
import {
  Check,
  X,
  Sliders,
  AlertTriangle,
  Calendar,
  Zap,
  TrendingUp,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
  Car,
  Timer,
  SlidersHorizontal,
  Info,
} from 'lucide-react'

interface DecisionSupportCardProps {
  recommendation: TrafficRecommendation
  onDecision: (
    recId: string,
    action: DecisionAction,
    params?: {
      timingAdjustment?: number
      reroutePercent?: number
      notes?: string
    }
  ) => Promise<void>
}

export function DecisionSupportCard({
  recommendation,
  onDecision,
}: DecisionSupportCardProps) {
  const [isModifying, setIsModifying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customTiming, setCustomTiming] = useState<number>(35)
  const [customReroute, setCustomReroute] = useState<number>(25)
  const [operatorNotes, setOperatorNotes] = useState<string>('')
  const [resolvedStatus, setResolvedStatus] = useState<DecisionAction | null>(null)

  const severityColorMap: Record<string, { bg: string; text: string; border: string; label: string }> = {
    low: { bg: '#dcfce7', text: '#15803d', border: '#86efac', label: 'Low Delay' },
    moderate: { bg: '#fef9c3', text: '#854d0e', border: '#fde047', label: 'Moderate Traffic' },
    heavy: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74', label: 'Heavy Traffic' },
    severe: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', label: 'Severe Congestion' },
    critical: { bg: '#7f1d1d', text: '#ffffff', border: '#991b1b', label: 'Critical Gridlock' },
  }

  const sev = severityColorMap[recommendation.severity] || severityColorMap.moderate

  // Human-friendly location name resolver
  const formatLocationName = (rawName: string) => {
    if (!rawName) return 'Main Corridor Junction'
    if (rawName.startsWith('Position (')) {
      const match = rawName.match(/\(([^)]+)\)/)
      const coords = match ? match[1] : ''
      return `Corridor Junction (${coords})`
    }
    return rawName
  }

  const locationTitle = formatLocationName(recommendation.corridor_name)

  async function handleAction(action: DecisionAction) {
    setIsSubmitting(true)
    try {
      await onDecision(recommendation.id, action, {
        timingAdjustment: customTiming,
        reroutePercent: customReroute,
        notes:
          operatorNotes ||
          (action === 'accept'
            ? 'Approved AI signal recommendation'
            : action === 'reject'
            ? 'Dismissed by traffic operator'
            : 'Applied custom operator adjustments'),
      })
      setResolvedStatus(action)
      setIsModifying(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (resolvedStatus) {
    return (
      <Card className="border-[#e8e0d5] bg-[#faf8f5] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex size-10 items-center justify-center rounded-2xl font-bold shadow-2xs ${
                resolvedStatus === 'accept'
                  ? 'bg-emerald-600 text-white'
                  : resolvedStatus === 'modify'
                  ? 'bg-amber-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {resolvedStatus === 'accept' && <Check className="size-5" />}
              {resolvedStatus === 'modify' && <Sliders className="size-5" />}
              {resolvedStatus === 'reject' && <X className="size-5" />}
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#2c2825]">{locationTitle}</p>
              <p className="text-xs text-[#9e9189]">
                Status:{' '}
                <strong className="uppercase text-[#2c2825]">
                  {resolvedStatus === 'accept' ? 'Action Executed' : resolvedStatus === 'modify' ? 'Modified & Applied' : 'Dismissed'}
                </strong>{' '}
                by Operations Center
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono bg-white">
            Signal Command Sent
          </Badge>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-[#e8e0d5] bg-white shadow-xs transition-all hover:shadow-md">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#f0ece7] bg-[#faf8f5] px-5 py-3.5 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-[#2c2825] text-white shadow-2xs">
            <MapPin className="size-4 text-[#c8a97e]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#2c2825]">
              {locationTitle}
            </h3>
            <p className="text-[11px] text-[#9e9189] font-mono">
              Live Surveillance Point · 10km Grid Telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider"
            style={{
              backgroundColor: sev.bg,
              color: sev.text,
              border: `1px solid ${sev.border}`,
            }}
          >
            {sev.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
            <ShieldCheck className="size-3 text-emerald-600" />
            {(recommendation.confidence * 100).toFixed(0)}% AI Accuracy
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* ── 3 Key Metrics Cards ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Current Congestion */}
          <div className="rounded-2xl border border-[#e8e0d5] bg-[#fdfcfb] p-4">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#9e9189]">
              <span>Current Status</span>
              <Car className="size-3.5 text-[#9e9189]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-[#2c2825]">
                {recommendation.current_congestion}%
              </span>
              <span className="text-xs text-[#9e9189]">density</span>
            </div>
            <p className="text-[11px] text-[#6b625b] mt-1">
              Normal moving traffic flow
            </p>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#f0ece7] overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-[#a67c52]"
                style={{ width: `${recommendation.current_congestion}%` }}
              />
            </div>
          </div>

          {/* Predicted in 1 Hour */}
          <div className="rounded-2xl border border-[#c8a97e]/40 bg-[#faf6f0] p-4">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#a67c52]">
              <span>Predicted in 1 Hour</span>
              <TrendingUp className="size-3.5 text-[#a67c52]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-[#a67c52]">
                {recommendation.predicted_congestion}%
              </span>
              <span className="text-xs font-bold text-[#a67c52]">
                +{recommendation.predicted_congestion - recommendation.current_congestion}% buildup
              </span>
            </div>
            <p className="text-[11px] text-[#8e6943] mt-1">
              Upcoming peak hour slowdown
            </p>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-[#e8e0d5] overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-[#2c2825]"
                style={{ width: `${recommendation.predicted_congestion}%` }}
              />
            </div>
          </div>

          {/* Expected Benefit if Accepted */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
              <span>Expected Benefit</span>
              <Timer className="size-3.5 text-emerald-700" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-emerald-700">
                {recommendation.expected_delay_reduction_mins} min
              </span>
              <span className="text-xs font-bold text-emerald-700">saved per car</span>
            </div>
            <p className="text-[11px] text-emerald-800/90 font-bold mt-1">
              Clears +420 extra vehicles / hour
            </p>
          </div>
        </div>

        {/* ── Why This Is Happening (Root Cause) ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recommendation.bottleneck && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#e8e0d5] bg-white p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <AlertTriangle className="size-4" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold text-[#2c2825]">Daily Recurring Choke Point</p>
                <p className="text-[#6b625b] mt-0.5">
                  Typical delay: <strong>+{recommendation.bottleneck.avg_delay_mins} mins</strong> during rush-hour window.
                </p>
                <p className="mt-0.5 text-[11px] text-[#9e9189]">
                  Volume growth: +{recommendation.bottleneck.trend_percent}% this week
                </p>
              </div>
            </div>
          )}

          {recommendation.event_impact ? (
            <div className="flex items-start gap-3 rounded-2xl border border-[#e8e0d5] bg-white p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                <Calendar className="size-4" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold text-[#2c2825]">Event Blockade Detected</p>
                <p className="text-[#6b625b] mt-0.5">
                  {recommendation.event_impact.event_name} (~{recommendation.event_impact.expected_attendance} people)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-[#e8e0d5] bg-white p-3.5 text-xs text-[#9e9189]">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#faf8f5] text-[#9e9189]">
                <Info className="size-4" />
              </div>
              <div>
                <p className="font-bold text-[#2c2825]">No Special Events or Roadwork</p>
                <p className="text-[11px] text-[#9e9189]">Traffic surge is purely standard commuter peak traffic.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Recommended Solution ── */}
        <div className="rounded-2xl border border-[#c8a97e]/40 bg-[#faf8f5] p-4.5">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#2c2825] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#c8a97e]">
              Proposed Action
            </span>
            <span className="text-sm font-extrabold text-[#2c2825]">
              {recommendation.title}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#6b625b]">
            {recommendation.description}
          </p>
        </div>

        {/* ── Sliders for Custom Adjustments ── */}
        {isModifying && (
          <div className="rounded-2xl border-2 border-[#a67c52] bg-white p-4 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0ece7]">
              <span className="text-xs font-black text-[#2c2825] flex items-center gap-1.5">
                <SlidersHorizontal className="size-4 text-[#a67c52]" /> Customize Signal Parameters
              </span>
              <button
                type="button"
                onClick={() => setIsModifying(false)}
                className="text-xs text-[#9e9189] hover:text-[#2c2825]"
              >
                Cancel
              </button>
            </div>

            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#2c2825] flex justify-between">
                  <span>Additional Green Light Time</span>
                  <span className="font-mono font-bold text-[#a67c52]">+{customTiming} seconds</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={customTiming}
                  onChange={(e) => setCustomTiming(Number(e.target.value))}
                  className="w-full mt-2 accent-[#2c2825]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#2c2825] flex justify-between">
                  <span>Divert Target to Parallel Routes</span>
                  <span className="font-mono font-bold text-[#a67c52]">{customReroute}%</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={customReroute}
                  onChange={(e) => setCustomReroute(Number(e.target.value))}
                  className="w-full mt-2 accent-[#2c2825]"
                />
              </div>
            </div>

            <div className="mt-3.5">
              <label className="text-xs font-bold text-[#2c2825]">Operator Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Adjusted green light duration based on CCTV visual feed"
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e8e0d5] bg-[#faf8f5] px-3.5 py-2 text-xs text-[#2c2825] outline-none focus:border-[#a67c52]"
              />
            </div>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0ece7] pt-4">
          <div className="flex items-center gap-1 text-[11px] text-[#9e9189]">
            <Clock className="size-3.5 text-[#9e9189]" />
            <span>Execution Speed: Instant Signal Update</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleAction('reject')}
              className="h-9.5 gap-1.5 rounded-xl border-[#e8e0d5] bg-white text-xs font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-300"
            >
              <X className="size-3.5" />
              Dismiss
            </Button>

            {!isModifying ? (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsModifying(true)}
                className="h-9.5 gap-1.5 rounded-xl border-[#e8e0d5] bg-white text-xs font-bold text-[#2c2825] hover:bg-[#f5f2ee]"
              >
                <SlidersHorizontal className="size-3.5" />
                Adjust
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleAction('modify')}
                className="h-9.5 gap-1.5 rounded-xl bg-[#a67c52] text-xs font-bold text-white hover:bg-[#8e6943]"
              >
                <Check className="size-3.5" />
                Save & Apply
              </Button>
            )}

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction('accept')}
              className="h-9.5 gap-1.5 rounded-xl bg-[#2c2825] text-xs font-bold text-[#faf8f5] hover:bg-[#1e1b18] shadow-sm"
            >
              <Check className="size-3.5 text-[#c8a97e]" />
              Apply Signal Change
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
