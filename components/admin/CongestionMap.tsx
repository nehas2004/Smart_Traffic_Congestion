'use client'

import { useState } from 'react'
import { CorridorDetail, BottleneckItem } from '@/types/traffic'
import { Layers, MapPin, Compass, AlertCircle } from 'lucide-react'

interface CongestionMapProps {
  corridors: CorridorDetail[]
  bottlenecks?: BottleneckItem[]
  selectedCorridorId: string
  onSelectCorridor: (id: string) => void
}

export function CongestionMap({
  corridors,
  bottlenecks = [],
  selectedCorridorId,
  onSelectCorridor,
}: CongestionMapProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'severe':
        return { bg: '#ef4444', text: 'Critical', badge: 'bg-red-100 text-red-800 border-red-200' }
      case 'high':
      case 'heavy':
        return { bg: '#f97316', text: 'High', badge: 'bg-orange-100 text-orange-800 border-orange-200' }
      case 'moderate':
        return { bg: '#eab308', text: 'Moderate', badge: 'bg-amber-100 text-amber-800 border-amber-200' }
      default:
        return { bg: '#22c55e', text: 'Low', badge: 'bg-green-100 text-green-800 border-green-200' }
    }
  }

  const filteredCorridors = corridors.filter((c) => {
    if (filterSeverity === 'all') return true
    return c.severity?.toLowerCase() === filterSeverity
  })

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e8e0d5] bg-white shadow-xs">
      {/* Map Header & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#e8e0d5] bg-[#faf8f5] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#2c2825] text-[#c8a97e]">
            <Compass className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-[#2c2825]">
              Admin Congestion Map Surveillance
            </h3>
            <p className="text-[10px] text-[#9e9189]">
              Monitoring {corridors.length} key road corridors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[#9e9189]">Filter Severity:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="rounded-lg border border-[#e8e0d5] bg-white px-2.5 py-1 text-xs font-bold text-[#2c2825] outline-none"
          >
            <option value="all">All Corridors ({corridors.length})</option>
            <option value="critical">Critical</option>
            <option value="heavy">High / Heavy</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low (Free Flow)</option>
          </select>
        </div>
      </div>

      {/* Corridor Spatial Cards Canvas */}
      <div className="p-5 bg-[#faf8f5]/60">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredCorridors.map((c) => {
            const isSelected = c.corridor_id === selectedCorridorId
            const colorInfo = getSeverityColor(c.severity)

            return (
              <div
                key={c.corridor_id}
                onClick={() => onSelectCorridor(c.corridor_id)}
                className={`flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-2 border-[#2c2825] bg-white shadow-md ring-2 ring-[#a67c52]/20'
                    : 'border-[#e8e0d5] bg-white hover:border-[#a67c52] hover:shadow-xs'
                }`}
                style={{ borderLeftWidth: '5px', borderLeftColor: colorInfo.bg }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-[#9e9189]">
                        {c.corridor_id}
                      </span>
                      {isSelected && (
                        <span className="rounded-full bg-[#2c2825] px-1.5 py-0.2 text-[9px] font-bold text-[#c8a97e]">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-[#2c2825] mt-0.5">
                      {c.corridor_name}
                    </h4>
                  </div>

                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase ${colorInfo.badge}`}>
                    {colorInfo.text}
                  </span>
                </div>

                {/* Congestion & Confidence Telemetry */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#f0ece7] pt-2.5 text-center text-xs">
                  <div className="rounded-lg bg-[#faf8f5] p-2">
                    <span className="text-[10px] font-bold text-[#9e9189]">CURRENT</span>
                    <p className="font-black text-[#2c2825] mt-0.5">{c.current_congestion}%</p>
                  </div>

                  <div className="rounded-lg bg-[#faf8f5] p-2">
                    <span className="text-[10px] font-bold text-[#9e9189]">PREDICTED</span>
                    <p className="font-black text-red-700 mt-0.5">{c.predicted_congestion}%</p>
                  </div>

                  <div className="rounded-lg bg-[#faf8f5] p-2">
                    <span className="text-[10px] font-bold text-[#9e9189]">CONFIDENCE</span>
                    <p className="font-black text-[#2c2825] mt-0.5">
                      {Math.round((c.confidence || 0.9) * 100)}%
                    </p>
                  </div>
                </div>

                {/* Congestion Bar */}
                <div className="mt-2.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f0ece7]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${c.current_congestion}%`,
                        backgroundColor: colorInfo.bg,
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Severity Color Mapping Legend (Accessibility requirement) */}
      <div className="flex flex-wrap items-center justify-between border-t border-[#e8e0d5] bg-white px-5 py-3 text-[11px] text-[#9e9189]">
        <div className="flex items-center gap-4">
          <span className="font-bold text-[#2c2825]">Severity Mapping:</span>
          <span className="flex items-center gap-1.5 font-medium text-[#2c2825]">
            <span className="size-2.5 rounded-full bg-green-500" /> Low (Green)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-[#2c2825]">
            <span className="size-2.5 rounded-full bg-amber-500" /> Moderate (Yellow/Amber)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-[#2c2825]">
            <span className="size-2.5 rounded-full bg-orange-500" /> High (Orange)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-[#2c2825]">
            <span className="size-2.5 rounded-full bg-red-600" /> Critical (Red)
          </span>
        </div>

        <span>Click any corridor to view event context in Location Intelligence Panel</span>
      </div>
    </div>
  )
}
