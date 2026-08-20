'use client'

import { useState } from 'react'
import { BottleneckItem, SeverityLevel } from '@/types/traffic'
import { TrafficBottleneck } from '@/lib/admin-api'
import { Card } from '@/components/ui/card'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Search,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react'

interface AdminBottleneckTableProps {
  bottlenecks: Array<BottleneckItem | TrafficBottleneck>
  onSelectBottleneck?: (corridorId: string) => void
}

const sevBadge: Record<SeverityLevel, { bg: string; text: string; border: string }> = {
  low: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  moderate: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  heavy: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  severe: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  critical: { bg: '#7f1d1d', text: '#ffffff', border: '#991b1b' },
}

export function AdminBottleneckTable({
  bottlenecks,
  onSelectBottleneck,
}: AdminBottleneckTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const filtered = bottlenecks.filter((b) => {
    const matchesSearch =
      b.corridor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.window.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSeverity = severityFilter === 'all' || b.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  return (
    <Card className="overflow-hidden border-[#e8e0d5] bg-white shadow-sm">
      {/* Header with Search & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f0ece7] bg-[#faf8f5] px-5 py-4">
        <div>
          <h2 className="text-sm font-extrabold text-[#2c2825]">
            Monitored Bottlenecks & Grid Hotspots
          </h2>
          <p className="text-[11px] text-[#9e9189]">
            Identified recurring delay points categorized by operational severity
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#9e9189]" />
            <input
              type="text"
              placeholder="Filter corridors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded-lg border border-[#e8e0d5] bg-white pl-8 pr-3 text-xs text-[#2c2825] outline-none focus:border-[#a67c52]"
            />
          </div>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 rounded-lg border border-[#e8e0d5] bg-white px-2.5 text-xs font-semibold text-[#2c2825] outline-none focus:border-[#a67c52]"
          >
            <option value="all">All Severities</option>
            <option value="severe">Severe</option>
            <option value="heavy">Heavy</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#f0ece7] bg-[#faf8f5]/60 text-[10px] font-bold uppercase tracking-wider text-[#9e9189]">
            <tr>
              <th className="px-5 py-3">Corridor / Location</th>
              <th className="px-4 py-3">Time Window & Days</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Avg Delay</th>
              <th className="px-4 py-3">Trend</th>
              <th className="px-4 py-3">Predicted TTI</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ece7]">
            {filtered.map((item) => {
              const badge = sevBadge[item.severity] || sevBadge.moderate
              const predictedTti = 'predicted_congestion' in item ? item.predicted_congestion : undefined
              return (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-[#faf8f5]/80 cursor-pointer"
                  onClick={() => onSelectBottleneck && onSelectBottleneck(item.corridor_id)}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-[#2c2825]">{item.corridor_name}</div>
                    <span className="font-mono text-[10px] text-[#9e9189]">ID: {item.id}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 font-medium text-[#2c2825]">
                      <Clock className="size-3 text-[#9e9189]" />
                      {item.window}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#9e9189]">
                      <Calendar className="size-3 text-[#9e9189]" />
                      {item.days}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm font-extrabold text-[#2c2825]">
                      +{item.avg_delay_mins} min
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div
                      className={`flex items-center gap-1 font-semibold ${
                        item.trend_percent > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {item.trend_percent > 0 ? (
                        <TrendingUp className="size-3.5" />
                      ) : (
                        <TrendingDown className="size-3.5" />
                      )}
                      <span>{Math.abs(item.trend_percent)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-extrabold text-[#2c2825]">
                    {predictedTti?.toFixed(2) ?? 'Unavailable'}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[#6b625b]">
                    {item.confidence == null ? 'Unavailable' : `${(item.confidence * 100).toFixed(0)}%`}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#e8e0d5] bg-white px-2.5 py-1 text-[11px] font-bold text-[#2c2825] transition-all hover:bg-[#2c2825] hover:text-white"
                    >
                      Inspect <ChevronRight className="size-3" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-xs text-[#9e9189]">
                  No bottlenecks matching current search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
