'use client'

import { bottlenecks, FLOW_META } from '@/lib/mock-data'
import { ArrowDownRight, ArrowUpRight, Clock, MapPin } from 'lucide-react'

export function BottleneckList() {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {bottlenecks.map((b, i) => (
        <li key={b.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {String(i + 1).padStart(2, '0')}
          </span>

          <span
            className="h-9 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: FLOW_META[b.level].token }}
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              {b.corridor}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3 shrink-0" aria-hidden="true" />
              {b.window} · {b.days}
            </p>
          </div>

          <div className="hidden text-right sm:block">
            <p className="font-mono text-sm font-semibold tabular-nums">+{b.avgDelay}m</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">avg delay</p>
          </div>

          <div className="w-16 text-right">
            <p
              className="flex items-center justify-end gap-0.5 font-mono text-xs tabular-nums"
              style={{
                color: b.trend > 0 ? 'var(--flow-severe)' : 'var(--flow-free)',
              }}
            >
              {b.trend > 0 ? (
                <ArrowUpRight className="size-3" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="size-3" aria-hidden="true" />
              )}
              {Math.abs(b.trend)}%
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {(b.confidence * 100).toFixed(0)}% conf
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

