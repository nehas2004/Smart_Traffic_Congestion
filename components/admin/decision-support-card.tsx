'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrafficRecommendation,
  DecisionAction,
  DecisionRecord,
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
  ArrowRight,
  Info,
  Clock,
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
  const [customTiming, setCustomTiming] = useState<number>(30)
  const [customReroute, setCustomReroute] = useState<number>(25)
  const [operatorNotes, setOperatorNotes] = useState<string>('')
  const [resolvedStatus, setResolvedStatus] = useState<DecisionAction | null>(null)

  const severityColorMap: Record<string, { bg: string; text: string; border: string }> = {
    low: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    moderate: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
    heavy: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
    severe: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    critical: { bg: '#7f1d1d', text: '#ffffff', border: '#991b1b' },
  }

  const sev = severityColorMap[recommendation.severity] || severityColorMap.moderate

  async function handleAction(action: DecisionAction) {
    setIsSubmitting(true)
    try {
      await onDecision(recommendation.id, action, {
        timingAdjustment: customTiming,
        reroutePercent: customReroute,
        notes: operatorNotes || (action === 'accept' ? 'Approved standard recommendation' : action === 'reject' ? 'Rejected by operator discretion' : 'Modified parameters applied'),
      })
      setResolvedStatus(action)
      setIsModifying(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (resolvedStatus) {
    return (
      <Card className="border-[#e8e0d5] bg-[#faf8f5] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-9 items-center justify-center rounded-xl font-bold ${
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
              <p className="text-sm font-bold text-[#2c2825]">{recommendation.corridor_name}</p>
              <p className="text-xs text-[#9e9189]">
                Action logged as <strong className="uppercase">{resolvedStatus}</strong> by Arshad (Admin)
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            Dispatched
          </Badge>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-[#e8e0d5] bg-white shadow-sm transition-all hover:shadow-md">
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#f0ece7] bg-[#faf8f5] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#2c2825] text-white">
            <Zap className="size-3.5 text-[#c8a97e]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#2c2825]">
              {recommendation.corridor_name}
            </h3>
            <p className="text-[11px] text-[#9e9189]">ID: {recommendation.corridor_id} · Decision Support Queue</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: sev.bg,
              color: sev.text,
              border: `1px solid ${sev.border}`,
            }}
          >
            {recommendation.severity} Severity
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f0ece7] px-2.5 py-0.5 text-[11px] font-semibold text-[#2c2825]">
            <ShieldCheck className="size-3 text-[#16a34a]" />
            {(recommendation.confidence * 100).toFixed(0)}% Conf
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* Congestion Metrics Comparison */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Current Congestion */}
          <div className="rounded-xl border border-[#e8e0d5] bg-[#fdfcfb] p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">
              Current Congestion
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-[#2c2825]">
                {recommendation.current_congestion}%
              </span>
              <span className="text-xs text-[#9e9189]">index</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#f0ece7]">
              <div
                className="h-1.5 rounded-full bg-[#a67c52]"
                style={{ width: `${recommendation.current_congestion}%` }}
              />
            </div>
          </div>

          {/* Predicted Congestion */}
          <div className="rounded-xl border border-[#c8a97e]/40 bg-[#faf6f0] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#a67c52]">
                Predicted (+60m)
              </span>
              <TrendingUp className="size-3.5 text-[#a67c52]" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-[#a67c52]">
                {recommendation.predicted_congestion}%
              </span>
              <span className="text-xs font-semibold text-[#a67c52]">
                +{recommendation.predicted_congestion - recommendation.current_congestion}% surge
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#e8e0d5]">
              <div
                className="h-1.5 rounded-full bg-[#2c2825]"
                style={{ width: `${recommendation.predicted_congestion}%` }}
              />
            </div>
          </div>

          {/* Expected Delay Benefit */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Mitigation Benefit
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-emerald-700">
                -{recommendation.expected_delay_reduction_mins}m
              </span>
              <span className="text-xs font-semibold text-emerald-700">delay reduction</span>
            </div>
            <p className="mt-2 text-[11px] text-emerald-800/80 font-medium">
              Drain rate +420 vehicles/hr
            </p>
          </div>
        </div>

        {/* Bottleneck & Event Impact Signals */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recommendation.bottleneck && (
            <div className="flex items-start gap-3 rounded-xl border border-[#e8e0d5] bg-white p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="size-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-[#2c2825]">Active Bottleneck Identified</p>
                <p className="text-[#6b625b]">
                  Recurring delay: <strong>+{recommendation.bottleneck.avg_delay_mins} min</strong> ({recommendation.bottleneck.window})
                </p>
                <p className="mt-0.5 text-[11px] text-[#9e9189]">
                  Trend: +{recommendation.bottleneck.trend_percent}% weekly volume growth
                </p>
              </div>
            </div>
          )}

          {recommendation.event_impact ? (
            <div className="flex items-start gap-3 rounded-xl border border-[#e8e0d5] bg-white p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Calendar className="size-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-[#2c2825]">Correlated Event Surge</p>
                <p className="text-[#6b625b]">
                  {recommendation.event_impact.event_name} (~{recommendation.event_impact.expected_attendance} pax)
                </p>
                <p className="mt-0.5 text-[11px] text-[#9e9189]">
                  Congestion multiplier: {recommendation.event_impact.congestion_multiplier}x within {recommendation.event_impact.radius_meters}m
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-[#e8e0d5] bg-white p-3.5 text-xs text-[#9e9189]">
              <Info className="size-4" />
              <span>No severe external events detected in radius</span>
            </div>
          )}
        </div>

        {/* Operational Recommendation Content */}
        <div className="mt-4 rounded-xl border border-[#c8a97e]/30 bg-[#faf8f5] p-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#2c2825] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#c8a97e]">
              System Recommendation
            </span>
            <span className="text-xs font-bold text-[#2c2825]">{recommendation.title}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#6b625b]">
            {recommendation.description}
          </p>
        </div>

        {/* Modify Parameter Form Drawer */}
        {isModifying && (
          <div className="mt-4 rounded-xl border-2 border-[#a67c52] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0ece7]">
              <span className="text-xs font-bold text-[#2c2825] flex items-center gap-1.5">
                <Sliders className="size-3.5 text-[#a67c52]" /> Custom Decision Parameters
              </span>
              <button
                type="button"
                onClick={() => setIsModifying(false)}
                className="text-xs text-[#9e9189] hover:text-[#2c2825]"
              >
                Cancel
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[#2c2825] flex justify-between">
                  <span>Signal Phase Offset (seconds)</span>
                  <span className="font-mono text-[#a67c52]">+{customTiming}s</span>
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
                <label className="text-[11px] font-bold text-[#2c2825] flex justify-between">
                  <span>Divert Target (%)</span>
                  <span className="font-mono text-[#a67c52]">{customReroute}%</span>
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

            <div className="mt-3">
              <label className="text-[11px] font-bold text-[#2c2825]">Operator Audit Notes</label>
              <input
                type="text"
                placeholder="e.g. Adjusted offset based on field camera feedback"
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#e8e0d5] bg-[#faf8f5] px-3 py-1.5 text-xs text-[#2c2825] outline-none focus:border-[#a67c52]"
              />
            </div>
          </div>
        )}

        {/* Action Controls: ACCEPT / MODIFY / REJECT */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0ece7] pt-4">
          <div className="flex items-center gap-1 text-[11px] text-[#9e9189]">
            <Clock className="size-3" />
            <span>Target Execution: Immediate</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleAction('reject')}
              className="h-9 gap-1.5 border-[#e8e0d5] bg-white text-xs font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-300"
            >
              <X className="size-3.5" />
              Reject
            </Button>

            {!isModifying ? (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsModifying(true)}
                className="h-9 gap-1.5 border-[#e8e0d5] bg-white text-xs font-bold text-[#2c2825] hover:bg-[#f5f2ee]"
              >
                <Sliders className="size-3.5" />
                Modify
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleAction('modify')}
                className="h-9 gap-1.5 bg-[#a67c52] text-xs font-bold text-white hover:bg-[#8e6943]"
              >
                <Check className="size-3.5" />
                Apply Modified
              </Button>
            )}

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAction('accept')}
              className="h-9 gap-1.5 bg-[#2c2825] text-xs font-bold text-[#faf8f5] hover:bg-[#1e1b18] shadow-sm"
            >
              <Check className="size-3.5 text-[#c8a97e]" />
              Accept Recommendation
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
