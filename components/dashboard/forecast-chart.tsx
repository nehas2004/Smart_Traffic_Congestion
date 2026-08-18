'use client'

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { forecastSeries } from '@/lib/mock-data'

const data = forecastSeries.map((d) => ({
  ...d,
  band: [d.lower, d.upper] as [number, number],
}))

function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-mono font-medium text-popover-foreground">{label}</p>
      <p className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>Predicted</span>
        <span className="font-mono font-medium text-foreground">{row.predicted} min</span>
      </p>
      <p className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>Range</span>
        <span className="font-mono">
          {row.lower}–{row.upper}
        </span>
      </p>
      {row.actual != null && (
        <p className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>Actual</span>
          <span className="font-mono font-medium text-foreground">{row.actual} min</span>
        </p>
      )}
    </div>
  )
}

export function ForecastChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="hour"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          interval={3}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
          domain={[0, 40]}
          ticks={[0, 10, 20, 30, 40]}
          tickFormatter={(v) => `${v}m`}
        />
        <Tooltip content={<ForecastTooltip />} cursor={{ stroke: 'var(--border)' }} />
        <Area
          type="monotone"
          dataKey="band"
          stroke="none"
          fill="url(#bandFill)"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--chart-1)' }}
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="var(--chart-2)"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

