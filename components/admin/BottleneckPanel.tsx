'use client'

import { useState } from 'react'
import { BottleneckItem } from '@/types/traffic'
import { AlertTriangle, ArrowUpDown, Clock, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'

interface BottleneckPanelProps {
  bottlenecks: BottleneckItem[]
  onSelectCorridor?: (corridorId: string) => void
}

export function BottleneckPanel({
  bottlenecks,
  onSelectCorridor,
}: BottleneckPanelProps) {
  const [sortBySeverity, setSortBySeverity] = useState(true)

  const severityOrder: Record<string, number> = {
    critical: 4,
    severe: 4,
    high: 3,
    heavy: 3,
    moderate: 2,
    low: 1,
  }

  const sortedList = [...bottlenecks].sort((a, b) => {
    if (sortBySeverity) {
      const orderA = severityOrder[a.severity?.toLowerCase()] || 0
      const orderB = severityOrder[b.severity?.toLowerCase()] || 0
      return orderB - orderA
    }
    return b.avg_delay_mins - a.avg_delay_mins
  })

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'severe':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
      case 'heavy':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'moderate':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header & Sort Control */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-[#2c2825]">
            Ranked Bottleneck Arterials
          </h3>
          <p className="text-xs text-[#9e9189]">
            Pre-ranked corridor bottlenecks based on recurring peak delays
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSortBySeverity(!sortBySeverity)}
          className="flex items-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-white px-3 py-1.5 text-xs font-bold text-[#2c2825] shadow-xs hover:bg-[#faf8f5] cursor-pointer"
        >
          <ArrowUpDown className="size-3.5 text-[#a67c52]" />
          Sort by: {sortBySeverity ? 'Severity Ranking' : 'Avg Delay (mins)'}
        </button>
      </div>

      {/* Bottlenecks List */}
      <div className="space-y-2.5">
        {sortedList.map((bn, idx) => (
          <div
            key={bn.id || idx}
            onClick={() => onSelectCorridor?.(bn.corridor_id)}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e8e0d5] bg-white p-4 transition-all hover:border-[#a67c52] hover:shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#2c2825] font-mono text-xs font-bold text-[#c8a97e]">
                #{idx + 1}
              </span>
              <div>
                <h4 className="text-sm font-bold text-[#2c2825]">
                  {bn.corridor_name}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-[#9e9189] mt-0.5">
                  <span className="flex items-center gap-1 font-medium text-[#6b625b]">
                    <Clock className="size-3 text-[#a67c52]" />
                    Peak: {bn.window} ({bn.days})
                  </span>
                  <span>·</span>
                  <span>Confidence: {Math.round((bn.confidence || 0.9) * 100)}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-sm font-black text-red-700">+{bn.avg_delay_mins}m</span>
                <p className="text-[10px] text-[#9e9189]">Avg Peak Delay</p>
              </div>

              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${getSeverityBadge(bn.severity)}`}>
                {bn.severity}
              </span>

              <button
                type="button"
                className="rounded-lg bg-[#f5f2ee] p-1.5 text-[#2c2825] hover:bg-[#2c2825] hover:text-white transition-colors"
                title="Inspect Location Intelligence"
              >
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        ))}

        {sortedList.length === 0 && (
          <div className="rounded-xl border border-[#e8e0d5] bg-white p-8 text-center text-xs text-[#9e9189]">
            No bottlenecks currently reported by the server.
          </div>
        )}
      </div>
    </div>
  )
}
