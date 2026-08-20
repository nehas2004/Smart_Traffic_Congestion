'use client'

import { useState } from 'react'
import { BottleneckItem } from '@/types/traffic'
import { AlertTriangle, TrendingUp, TrendingDown, Clock, BarChart3, ArrowUpRight } from 'lucide-react'

interface BottleneckGraphProps {
  bottlenecks: BottleneckItem[]
  onSelectBottleneck?: (corridorId: string) => void
}

export function BottleneckGraph({
  bottlenecks,
  onSelectBottleneck,
}: BottleneckGraphProps) {
  const [metricMode, setMetricMode] = useState<'delay' | 'trend' | 'confidence'>('delay')

  const maxDelay = Math.max(...bottlenecks.map((b) => b.avg_delay_mins), 1)

  return (
    <div className="rounded-2xl border border-[#e8e0d5] bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f0ece7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <BarChart3 className="size-4" />
            </div>
            <h3 className="text-base font-extrabold text-[#2c2825]">
              Urban Bottleneck Severity & Delay Visualizer
            </h3>
          </div>
          <p className="text-xs text-[#9e9189] mt-0.5">
            Ranked bottleneck comparison across peak congestion windows
          </p>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center rounded-xl border border-[#e8e0d5] bg-[#f5f2ee] p-1 text-xs">
          <button
            type="button"
            onClick={() => setMetricMode('delay')}
            className={`rounded-lg px-3 py-1 font-bold transition-all ${
              metricMode === 'delay'
                ? 'bg-[#2c2825] text-white shadow-sm'
                : 'text-[#9e9189] hover:text-[#2c2825]'
            }`}
          >
            Average Delay (Mins)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('trend')}
            className={`rounded-lg px-3 py-1 font-bold transition-all ${
              metricMode === 'trend'
                ? 'bg-[#2c2825] text-white shadow-sm'
                : 'text-[#9e9189] hover:text-[#2c2825]'
            }`}
          >
            Weekly Surge Trend (%)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('confidence')}
            className={`rounded-lg px-3 py-1 font-bold transition-all ${
              metricMode === 'confidence'
                ? 'bg-[#2c2825] text-white shadow-sm'
                : 'text-[#9e9189] hover:text-[#2c2825]'
            }`}
          >
            ML Confidence
          </button>
        </div>
      </div>

      {/* Visual Bar Graph */}
      <div className="mt-6 space-y-5">
        {bottlenecks.map((item, idx) => {
          const delayPercent = Math.min(100, Math.round((item.avg_delay_mins / maxDelay) * 100))
          const isSevere = item.severity === 'severe' || item.severity === 'critical' || (item.severity as string) === 'High'
          const isHeavy = item.severity === 'heavy' || item.severity === 'moderate' || (item.severity as string) === 'Medium'

          const barColor = isSevere
            ? 'bg-rose-500 hover:bg-rose-600'
            : isHeavy
            ? 'bg-amber-500 hover:bg-amber-600'
            : 'bg-emerald-500 hover:bg-emerald-600'

          return (
            <div
              key={item.id || idx}
              onClick={() => onSelectBottleneck?.(item.corridor_id)}
              className="group rounded-xl border border-[#f0ece7] bg-[#faf8f5] p-4 transition-all hover:border-[#a67c52] hover:bg-white hover:shadow-md cursor-pointer"
            >
              {/* Row Top */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-md bg-[#2c2825] font-mono text-[11px] font-bold text-[#c8a97e]">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#2c2825] group-hover:text-[#a67c52] transition-colors">
                      {item.corridor_name}
                    </h4>
                    <p className="text-[11px] text-[#9e9189] flex items-center gap-1.5 mt-0.5">
                      <Clock className="size-3 text-[#a67c52]" />
                      Peak: <span className="font-semibold text-[#2c2825]">{item.window}</span> ({item.days})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-lg font-black text-[#2c2825]">
                      {metricMode === 'delay'
                        ? `+${item.avg_delay_mins}m`
                        : metricMode === 'trend'
                        ? `${item.trend_percent > 0 ? '+' : ''}${item.trend_percent}%`
                        : `${Math.round(item.confidence * 100)}%`}
                    </span>
                    <p className="text-[10px] text-[#9e9189] font-medium">
                      {metricMode === 'delay'
                        ? 'Excess Travel Delay'
                        : metricMode === 'trend'
                        ? 'Worsening Trend'
                        : 'Detector Reliability'}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      isSevere
                        ? 'bg-rose-100 text-rose-800'
                        : isHeavy
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>
              </div>

              {/* Progress Graph Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-bold text-[#9e9189] mb-1">
                  <span>Relative Bottleneck Impact</span>
                  <span>{delayPercent}% of Max Critical Delay</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-[#e8e0d5]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{
                      width: `${
                        metricMode === 'delay'
                          ? delayPercent
                          : metricMode === 'trend'
                          ? Math.min(100, Math.max(10, Math.abs(item.trend_percent) * 5))
                          : item.confidence * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Footer Trend Summary */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#9e9189]">
                <div className="flex items-center gap-1.5 font-medium">
                  {item.trend_percent > 0 ? (
                    <span className="flex items-center gap-1 text-rose-700 font-bold">
                      <TrendingUp className="size-3.5" /> +{item.trend_percent}% worsening during peak rush
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <TrendingDown className="size-3.5" /> {item.trend_percent}% clearing faster
                    </span>
                  )}
                </div>

                <span className="text-[11px] font-semibold text-[#a67c52] flex items-center gap-1 group-hover:underline">
                  Inspect in Decision Support <ArrowUpRight className="size-3" />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
