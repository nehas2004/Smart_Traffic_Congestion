'use client'

import React, { useMemo, useState } from 'react'
import {
  Clock,
  TrendingUp,
  Sparkles,
  CloudRain,
  Sun,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react'
import { generate24HourRouteForecast, HourlyForecastPoint } from '@/lib/api-services'

interface ForecastChartProps {
  fromName?: string
  toName?: string
  distanceKm?: number
  baseDurationMins?: number
  currentDelayMins?: number
  selectedHour?: number | null
  onSelectHour?: (hour: number | null) => void
  weatherRainHourly?: number[]
}

export function ForecastChart({
  fromName = 'Origin',
  toName = 'Destination',
  distanceKm = 45,
  baseDurationMins = 75,
  currentDelayMins = 12,
  selectedHour = null,
  onSelectHour,
  weatherRainHourly,
}: ForecastChartProps) {
  const currentHour = new Date().getHours()
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6
  const [hoveredPoint, setHoveredPoint] = useState<HourlyForecastPoint | null>(null)

  // 1. Generate the 24-hour predictive curve for this specific corridor
  const forecastData = useMemo(() => {
    return generate24HourRouteForecast(
      distanceKm,
      baseDurationMins,
      isWeekend,
      weatherRainHourly
    )
  }, [distanceKm, baseDurationMins, isWeekend, weatherRainHourly])

  // Max delay for relative bar height normalization
  const maxDelay = useMemo(() => {
    const delays = forecastData.map((d) => d.delayMins)
    return Math.max(...delays, 20)
  }, [forecastData])

  // 2. Compute "Smart Best Departure Window" recommendation
  const bestDepartureAdvice = useMemo(() => {
    const currentPoint = forecastData[currentHour] || forecastData[0]
    const upcomingHours = forecastData.slice(currentHour, Math.min(24, currentHour + 5))

    if (upcomingHours.length <= 1) {
      return null
    }

    // Find the hour in the next 4 hours with minimum delay
    let minPoint = upcomingHours[0]
    for (const pt of upcomingHours) {
      if (pt.delayMins < minPoint.delayMins) {
        minPoint = pt
      }
    }

    const savingsMins = currentPoint.delayMins - minPoint.delayMins

    if (savingsMins >= 4 && minPoint.hour !== currentHour) {
      return {
        bestHour: minPoint.hour,
        bestTimeLabel: minPoint.timeLabel,
        currentTimeLabel: currentPoint.timeLabel,
        savingsMins,
        bestDelay: minPoint.delayMins,
        currentDelay: currentPoint.delayMins,
      }
    }

    return null
  }, [forecastData, currentHour])

  const activeDisplayPoint = hoveredPoint || (selectedHour !== null ? forecastData[selectedHour] : forecastData[currentHour])

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 md:p-6 transition-all">
      {/* Header with Route Name & Live Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Zap size={11} className="text-indigo-600" /> 24-Hour ML Traffic Curve
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {isWeekend ? 'Weekend Pattern' : 'Weekday Pattern'}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
            24-Hour Traffic Forecast: <span className="text-indigo-600">{fromName}</span> → <span className="text-indigo-600">{toName}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Click any hour bar below to simulate departure & preview corridor delay.
          </p>
        </div>

        {/* Selected / Reset Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {selectedHour !== null && (
            <button
              type="button"
              onClick={() => onSelectHour && onSelectHour(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
            >
              <RotateCcw size={12} /> Reset to Live
            </button>
          )}
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Clock size={13} className="text-indigo-600" />
            <span>Live: {forecastData[currentHour]?.timeLabel || 'Now'}</span>
          </div>
        </div>
      </div>

      {/* Smart Best Departure Window Advisory Banner */}
      {bestDepartureAdvice && (
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/90 p-3.5 flex items-center justify-between gap-3 flex-wrap animate-in fade-in-50">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-950">
                💡 Recommended Departure Window: Leave at {bestDepartureAdvice.bestTimeLabel} to save {bestDepartureAdvice.savingsMins} minutes!
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                Congestion drops from +{bestDepartureAdvice.currentDelay}m at {bestDepartureAdvice.currentTimeLabel} down to +{bestDepartureAdvice.bestDelay}m at {bestDepartureAdvice.bestTimeLabel}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectHour && onSelectHour(bestDepartureAdvice.bestHour)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            Simulate {bestDepartureAdvice.bestTimeLabel} Departure →
          </button>
        </div>
      )}

      {/* Active Selection / Hover Preview Banner */}
      {activeDisplayPoint && (
        <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-3">
            <div
              className="size-3.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: activeDisplayPoint.severityColor }}
            />
            <div>
              <span className="font-extrabold text-slate-900 text-sm mr-2">
                {activeDisplayPoint.timeLabel} ({activeDisplayPoint.time24})
              </span>
              <span className="font-semibold text-slate-500">
                {activeDisplayPoint.periodName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-slate-400 font-medium mr-1">Travel Time:</span>
              <span className="font-extrabold text-slate-900">{activeDisplayPoint.predictedDurationMins} min</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium mr-1">Delay:</span>
              <span className={`font-black ${activeDisplayPoint.delayMins > 8 ? 'text-rose-600' : activeDisplayPoint.delayMins > 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {activeDisplayPoint.delayMins > 0 ? `+${activeDisplayPoint.delayMins} min` : 'Free Flow'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium mr-1">Est. Speed:</span>
              <span className="font-bold text-slate-800">{activeDisplayPoint.predictedSpeed} km/h</span>
            </div>
            {activeDisplayPoint.weatherRainMm > 0.5 && (
              <div className="flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md font-bold text-[11px]">
                <CloudRain size={12} /> Rain: {activeDisplayPoint.weatherRainMm} mm
              </div>
            )}
          </div>
        </div>
      )}

      {/* 24-Hour Vertical Bar Visualizer */}
      <div className="mt-5 relative">
        <div className="flex items-end justify-between gap-1 sm:gap-1.5 h-44 sm:h-48 pt-6 pb-2 overflow-x-auto no-scrollbar">
          {forecastData.map((pt) => {
            const isCurr = pt.isCurrentHour
            const isSel = selectedHour === pt.hour
            // Height ratio normalized between 18% and 100%
            const heightPct = Math.max(18, Math.min(100, Math.round((pt.delayMins / maxDelay) * 90) + 18))

            return (
              <div
                key={pt.hour}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => onSelectHour && onSelectHour(isSel ? null : pt.hour)}
                className="flex-1 min-w-[28px] sm:min-w-[34px] flex flex-col items-center justify-end h-full group cursor-pointer relative"
              >
                {/* Current / Selected Active Pill Indicator */}
                {(isCurr || isSel) && (
                  <div
                    className={`absolute -top-3 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs whitespace-nowrap z-10 ${
                      isSel
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                        : 'bg-slate-900 text-white ring-2 ring-slate-200'
                    }`}
                  >
                    {isSel ? 'Sim' : 'Now'}
                  </div>
                )}

                {/* Vertical Bar Container */}
                <div
                  className={`w-full max-w-[26px] sm:max-w-[32px] rounded-t-xl transition-all duration-300 flex flex-col justify-end p-0.5 relative overflow-hidden ${
                    isSel
                      ? 'ring-2 ring-indigo-500 scale-105 shadow-md'
                      : isCurr
                      ? 'ring-2 ring-slate-400 scale-102'
                      : 'group-hover:scale-105 group-hover:brightness-110'
                  }`}
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: pt.severityColor,
                  }}
                >
                  {/* Subtle top gloss */}
                  <div className="w-full h-1 bg-white/40 rounded-t-lg" />

                  {/* Delay number inside bar if space permits */}
                  {heightPct >= 35 && (
                    <span className="text-[10px] font-black text-white text-center drop-shadow-xs pb-1 select-none">
                      +{pt.delayMins}m
                    </span>
                  )}
                </div>

                {/* Bottom Hour Label */}
                <span
                  className={`mt-2 text-[10px] font-bold select-none transition-colors ${
                    isSel
                      ? 'text-indigo-600 font-extrabold'
                      : isCurr
                      ? 'text-slate-900 font-extrabold'
                      : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                >
                  {pt.hour % 3 === 0 || isCurr || isSel ? pt.timeLabel.replace(' ', '') : '·'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Congestion Levels:
          </span>

          <div className="flex items-center gap-3.5 flex-wrap font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#10b981]" />
              <span>Free Flow (&lt;4m)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#eab308]" />
              <span>Moderate (4-9m)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#f97316]" />
              <span>Heavy (10-16m)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#ef4444]" />
              <span>Severe (17m+)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
