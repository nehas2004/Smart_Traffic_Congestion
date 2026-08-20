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
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt-1')
  const [isModifying, setIsModifying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customTiming, setCustomTiming] = useState<number>(35)
  const [customReroute, setCustomReroute] = useState<number>(25)
  const [operatorNotes, setOperatorNotes] = useState<string>('')
  const [resolvedStatus, setResolvedStatus] = useState<DecisionAction | null>(null)

  const hasOptions = recommendation.options && recommendation.options.length > 0
  const activeOption = hasOptions
    ? recommendation.options!.find((o) => o.id === selectedOptionId) || recommendation.options![0]
    : null

  const displayActionTitle = activeOption ? activeOption.title : recommendation.title
  const displayActionText = activeOption ? activeOption.action : recommendation.title
  const displayReasonText = activeOption ? activeOption.reason : recommendation.description

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
            ? `Approved AI strategy option: ${displayActionTitle}`
            : action === 'reject'
            ? 'Dismissed by traffic operator'
            : `Applied custom adjustments for strategy: ${displayActionTitle}`),
      })
      setResolvedStatus(action)
      setIsModifying(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (resolvedStatus) {
    return (
      <Card className="overflow-hidden border-slate-200 bg-white shadow-xs p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 items-center justify-center rounded-2xl ${
                resolvedStatus === 'accept'
                  ? 'bg-emerald-100 text-emerald-700'
                  : resolvedStatus === 'modify'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {resolvedStatus === 'accept' && <Check className="size-5" />}
              {resolvedStatus === 'modify' && <Sliders className="size-5" />}
              {resolvedStatus === 'reject' && <X className="size-5" />}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">{locationTitle}</p>
              <p className="text-xs text-slate-500">
                Status:{' '}
                <strong className="uppercase text-slate-900">
                  {resolvedStatus === 'accept' ? 'Action Executed' : resolvedStatus === 'modify' ? 'Modified & Applied' : 'Dismissed'}
                </strong>{' '}
                by Operations Center
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono bg-white border-slate-200 text-slate-700">
            Signal Command Sent
          </Badge>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-xs transition-all hover:shadow-md">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <MapPin className="size-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              {locationTitle}
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
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
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
            <ShieldCheck className="size-3 text-emerald-600" />
            {(recommendation.confidence * 100).toFixed(0)}% AI Accuracy
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* ── Multi-Strategy Option Tabs ── */}
        {hasOptions && (
          <div className="flex flex-col sm:flex-row gap-2.5 rounded-2xl border border-slate-200 bg-slate-100/70 p-2">
            {recommendation.options!.map((opt, i) => {
              const isSelected = selectedOptionId === opt.id || (!selectedOptionId && i === 0)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`flex-1 rounded-xl p-3 text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-white border-2 border-emerald-600 shadow-xs text-slate-900'
                      : 'bg-white/60 border border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  {opt.is_recommended && (
                    <span className="absolute -top-2 right-3 rounded-md bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-xs">
                      AI Recommended
                    </span>
                  )}
                  <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                    Option {i + 1} · {opt.strategy_type.replace('_', ' ')}
                  </div>
                  <div className="text-xs font-bold leading-snug">{opt.title}</div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── 3 Key Metrics Cards ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Current Congestion */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              <span>Current Status</span>
              <Car className="size-3.5 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-slate-900">
                {recommendation.current_congestion}%
              </span>
              <span className="text-xs text-slate-400">density</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Normal moving traffic flow
            </p>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-emerald-600"
                style={{ width: `${recommendation.current_congestion}%` }}
              />
            </div>
          </div>

          {/* Predicted in 1 Hour */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
              <span>Predicted in 1 Hour</span>
              <TrendingUp className="size-3.5 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-emerald-800">
                {recommendation.predicted_congestion}%
              </span>
              <span className="text-xs font-bold text-emerald-700">
                +{recommendation.predicted_congestion - recommendation.current_congestion}% buildup
              </span>
            </div>
            <p className="text-[11px] text-emerald-950/80 mt-1 font-medium">
              Upcoming peak hour slowdown
            </p>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-emerald-200 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-emerald-700"
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

        {/* ── Strategy Trade-off Comparison Box ── */}
        {activeOption && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <div className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                ✓ Expected Impact
              </div>
              <p className="text-xs font-bold text-emerald-950 mt-1">{activeOption.expected_impact}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <div className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                ⚠ Side-Effect Trade-off
              </div>
              <p className="text-xs font-bold text-amber-950 mt-1">{activeOption.side_effect_tradeoff}</p>
            </div>
          </div>
        )}

        {/* ── Why This Is Happening (Root Cause) ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recommendation.bottleneck && (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <AlertTriangle className="size-4" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold text-slate-900">Daily Recurring Choke Point</p>
                <p className="text-slate-600 mt-0.5">
                  Typical delay: <strong>+{recommendation.bottleneck.avg_delay_mins} mins</strong> during rush-hour window.
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Volume growth: +{recommendation.bottleneck.trend_percent}% this week
                </p>
              </div>
            </div>
          )}

          {recommendation.event_impact ? (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                <Calendar className="size-4" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold text-slate-900">Event Blockade Detected</p>
                <p className="text-slate-600 mt-0.5">
                  {recommendation.event_impact.event_name} (~{recommendation.event_impact.expected_attendance} people)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-500">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Info className="size-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900">No Special Events or Roadwork</p>
                <p className="text-[11px] text-slate-500">Traffic surge is purely standard commuter peak traffic.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Recommended Solution ── */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4.5">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
              Proposed Action
            </span>
            <span className="text-sm font-extrabold text-emerald-950">
              {displayActionText}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-emerald-900/90 font-medium">
            {displayReasonText}
          </p>
        </div>

        {/* ── Sliders for Custom Adjustments ── */}
        {isModifying && (
          <div className="rounded-2xl border-2 border-emerald-500 bg-white p-4 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <SlidersHorizontal className="size-4 text-emerald-600" /> Customize Signal Parameters
              </span>
              <button
                type="button"
                onClick={() => setIsModifying(false)}
                className="text-xs text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 flex justify-between">
                  <span>Additional Green Light Time</span>
                  <span className="font-mono font-bold text-emerald-700">+{customTiming} seconds</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={customTiming}
                  onChange={(e) => setCustomTiming(Number(e.target.value))}
                  className="w-full mt-2 accent-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 flex justify-between">
                  <span>Divert Target to Parallel Routes</span>
                  <span className="font-mono font-bold text-emerald-700">{customReroute}%</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={customReroute}
                  onChange={(e) => setCustomReroute(Number(e.target.value))}
                  className="w-full mt-2 accent-emerald-600"
                />
              </div>
            </div>

            <div className="mt-3.5">
              <label className="text-xs font-bold text-slate-900">Operator Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Adjusted green light duration based on CCTV visual feed"
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Clock className="size-3.5 text-slate-400" />
            <span>Execution Speed: Instant Signal Update</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleAction('reject')}
              className="h-9.5 gap-1.5 rounded-xl border-slate-200 bg-white text-xs font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-300 cursor-pointer"
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
                className="h-9.5 gap-1.5 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <SlidersHorizontal className="size-3.5" />
                Adjust
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleAction('modify')}
                className="h-9.5 gap-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Check className="size-3.5" />
                Save & Apply
              </Button>
            )}

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction('accept')}
              className="h-9.5 gap-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Check className="size-3.5 text-white" />
              Apply Signal Change
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
