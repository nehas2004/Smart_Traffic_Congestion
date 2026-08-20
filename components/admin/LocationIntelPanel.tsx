'use client'

import { CorridorDetail, EventImpact, BottleneckItem } from '@/types/traffic'
import { MapPin, Calendar, Clock, Gauge, Car, ShieldCheck, Activity, AlertCircle } from 'lucide-react'

interface LocationIntelPanelProps {
  corridor: CorridorDetail | null
  eventImpact?: EventImpact | null
  bottleneck?: BottleneckItem | null
}

export function LocationIntelPanel({
  corridor,
  eventImpact,
  bottleneck,
}: LocationIntelPanelProps) {
  if (!corridor) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[#e8e0d5] bg-white p-8 text-center">
        <MapPin className="size-8 text-[#9e9189] mb-2 opacity-50" />
        <h4 className="text-sm font-bold text-[#2c2825]">No Corridor Selected</h4>
        <p className="mt-1 text-xs text-[#9e9189]">
          Click any corridor on the congestion map or bottleneck list to inspect real-time telemetry and event context.
        </p>
      </div>
    )
  }

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
    <div className="flex flex-col gap-4 rounded-2xl border border-[#e8e0d5] bg-white p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#f0ece7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#2c2825] px-2 py-0.5 font-mono text-[10px] font-bold text-[#c8a97e]">
              {corridor.corridor_id}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${getSeverityBadge(corridor.severity)}`}>
              {corridor.severity}
            </span>
          </div>
          <h3 className="mt-1.5 text-base font-extrabold text-[#2c2825]">
            {corridor.corridor_name}
          </h3>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-[#2c2825]">
            {corridor.current_congestion}%
          </span>
          <p className="text-[10px] text-[#9e9189]">Current Congestion</p>
        </div>
      </div>

      {/* Corridor Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-[#9e9189]">Current</span>
          <p className="text-sm font-black text-[#2c2825] mt-0.5">{corridor.current_congestion}%</p>
        </div>

        <div className="rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-[#9e9189]">Predicted</span>
          <p className="text-sm font-black text-red-700 mt-0.5">{corridor.predicted_congestion}%</p>
        </div>

        <div className="rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-[#9e9189]">Confidence</span>
          <p className="text-sm font-black text-[#2c2825] mt-0.5">{Math.round((corridor.confidence || 0.9) * 100)}%</p>
        </div>

        <div className="rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-[#9e9189]">Speed</span>
          <p className="text-sm font-black text-[#2c2825] mt-0.5">
            {corridor.current_speed_kmh || 28} <span className="text-[9px] font-normal text-[#9e9189]">km/h</span>
          </p>
        </div>
      </div>

      {/* Event Impact Section (Sankhana integration) */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9e9189]">
          Event Impact Context
        </span>

        {eventImpact ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-4 text-amber-800" />
                <span className="text-xs font-extrabold text-amber-900">{eventImpact.event_name}</span>
              </div>
              <span className="rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                {eventImpact.severity_increase.toUpperCase()} IMPACT
              </span>
            </div>
            <p className="text-xs text-amber-900">
              Venue: <strong>{eventImpact.venue}</strong> · Peak Window: <strong>{eventImpact.peak_window}</strong>
            </p>
            <p className="text-[11px] text-amber-800">
              Expected Attendance: {eventImpact.expected_attendance.toLocaleString()} citizens (Multiplier: {eventImpact.congestion_multiplier}x)
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-3 text-xs text-[#9e9189]">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <span>No active or planned special events overlapping this corridor.</span>
          </div>
        )}
      </div>

      {/* Bottleneck Context */}
      {bottleneck && (
        <div className="rounded-xl border border-[#e8e0d5] bg-[#faf8f5] p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#2c2825]">Bottleneck Recurrence</span>
            <span className="font-semibold text-rose-700">+{bottleneck.avg_delay_mins}m Delay</span>
          </div>
          <p className="text-[11px] text-[#9e9189]">
            Peak Hours: {bottleneck.window} ({bottleneck.days})
          </p>
        </div>
      )}
    </div>
  )
}
