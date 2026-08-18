'use client'

import { useState } from 'react'
import { heatmapZones, ZONE_COLS, FLOW_META, type FlowLevel } from '@/lib/mock-data'

const ORDER: FlowLevel[] = ['free', 'moderate', 'heavy', 'severe']

export function TrafficHeatmap() {
  const [hovered, setHovered] = useState<(typeof heatmapZones)[number] | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-h-[2.5rem]">
          {hovered ? (
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-sm font-medium">{hovered.name}</span>
              <span className="text-xs text-muted-foreground">
                {FLOW_META[hovered.level].label} · congestion index{' '}
                {hovered.score.toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Hover a zone to inspect its predicted congestion index.
            </span>
          )}
        </div>
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${ZONE_COLS}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHovered(null)}
      >
        {heatmapZones.map((zone) => (
          <button
            key={zone.id}
            type="button"
            onMouseEnter={() => setHovered(zone)}
            onFocus={() => setHovered(zone)}
            aria-label={`${zone.name}: ${FLOW_META[zone.level].label}`}
            className="aspect-square rounded-[3px] outline-none ring-offset-2 ring-offset-card transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
            style={{
              backgroundColor: FLOW_META[zone.level].token,
              opacity: 0.35 + zone.score * 0.65,
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4">
        {ORDER.map((level) => (
          <div key={level} className="flex items-center gap-2">
            <span
              className="size-3 rounded-[3px]"
              style={{ backgroundColor: FLOW_META[level].token }}
            />
            <span className="text-xs text-foreground">{FLOW_META[level].label}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {FLOW_META[level].range}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

