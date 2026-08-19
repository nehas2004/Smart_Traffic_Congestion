'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, Clock3, Gauge, Sparkles, TrendingUp } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { TrafficDataSource, TrafficForecastPoint } from '@/lib/admin-api'
import { CorridorDetail, SeverityLevel } from '@/types/traffic'
import { ForecastHorizon, ForecastHorizonTabs } from './forecast-horizon-tabs'

export type ForecastPoint = TrafficForecastPoint

interface ForecastPanelProps {
  corridors: CorridorDetail[]
  selectedCorridorId: string
  onCorridorChange: (corridorId: string) => void
  horizon: ForecastHorizon
  onHorizonChange: (horizon: ForecastHorizon) => void
  forecast: ForecastPoint[]
  dataSource: TrafficDataSource
}

const severityStyle: Record<SeverityLevel, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  heavy: 'bg-orange-100 text-orange-800',
  severe: 'bg-rose-100 text-rose-800',
  critical: 'bg-rose-900 text-white',
}

function ForecastTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ payload: ForecastPoint }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  return (
    <div className="rounded-lg border border-[#e8e0d5] bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-mono font-bold text-[#2c2825]">{label}</p>
      <p className="mt-1 text-[#6b625b]">
        Predicted: <span className="font-mono font-bold text-[#2c2825]">{point.predicted_congestion}%</span>
      </p>
    </div>
  )
}

export function ForecastPanel({
  corridors,
  selectedCorridorId,
  onCorridorChange,
  horizon,
  onHorizonChange,
  forecast,
  dataSource,
}: ForecastPanelProps) {
  const selectedCorridor = corridors.find((corridor) => corridor.corridor_id === selectedCorridorId)
  const usesMockData = dataSource === 'mock'

  if (!selectedCorridor) {
    return (
      <Card className="border-[#e8e0d5] bg-white p-10 text-center shadow-sm">
        <p className="font-bold text-[#2c2825]">No forecast is available</p>
        <p className="mt-1 text-sm text-[#9e9189]">Select a monitored corridor when data becomes available.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#e8e0d5] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">Forecast scope</p>
            <label className="mt-2 block text-sm font-bold text-[#2c2825]" htmlFor="forecast-corridor">
              Monitored corridor
            </label>
            <select
              id="forecast-corridor"
              value={selectedCorridorId}
              onChange={(event) => onCorridorChange(event.target.value)}
              className="mt-1.5 w-full min-w-64 rounded-lg border border-[#e8e0d5] bg-white px-3 py-2 text-sm font-semibold text-[#2c2825] outline-none focus:border-[#a67c52] lg:w-80"
            >
              {corridors.map((corridor) => (
                <option key={corridor.corridor_id} value={corridor.corridor_id}>
                  {corridor.corridor_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">Preview window</p>
            <ForecastHorizonTabs value={horizon} onChange={onHorizonChange} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} label="Current congestion" value={`${selectedCorridor.current_congestion}%`} detail="Latest corridor reading" />
        <MetricCard
          icon={TrendingUp}
          label={usesMockData ? 'Mock prediction preview' : 'Prediction preview'}
          value={`${selectedCorridor.predicted_congestion}%`}
          detail={usesMockData ? 'Not a horizon-specific prediction' : 'Horizon-specific API data pending'}
          accent="text-[#a67c52]"
        />
        <MetricCard icon={Gauge} label="Model confidence" value={`${Math.round(selectedCorridor.confidence * 100)}%`} detail="Prediction confidence" />
        <Card className="border-[#e8e0d5] bg-white p-4 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">Severity</p>
                <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold uppercase ${severityStyle[selectedCorridor.severity]}`}>
                  {selectedCorridor.severity}
                </span>
                <p className="mt-2 text-[11px] text-[#6b625b]">Current operational level</p>
              </div>
              <div className="rounded-lg bg-[#a67c52]/10 p-2">
                <Sparkles className="size-4 text-[#a67c52]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#e8e0d5] bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#f0ece7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-extrabold text-[#2c2825]">Congestion preview</h2>
            <p className="mt-0.5 text-xs text-[#9e9189]">
              {usesMockData
                ? `Development preview showing the first ${horizon} of generated hourly values.`
                : 'Live forecast preview. Horizon-specific prediction semantics require the shared API contract.'}
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f5f2ee] px-2.5 py-1 font-mono text-[11px] text-[#6b625b]">
            <Clock3 className="size-3" /> {new Date(selectedCorridor.timestamp).toLocaleString()}
          </span>
        </div>
        <CardContent className="p-5">
          {forecast.length ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#f0ece7" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: '#9e9189', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e8e0d5' }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#9e9189', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ForecastTooltip />} cursor={{ stroke: '#e8e0d5' }} />
                  <Line type="monotone" dataKey="predicted_congestion" stroke="#a67c52" strokeWidth={3} dot={{ r: 3, fill: '#a67c52' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-80 items-center justify-center text-center text-sm text-[#9e9189]">
              No forecast is available for this horizon.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-dashed border-[#d8c9b7] bg-[#faf8f5] px-4 py-3 text-xs text-[#6b625b]">
        <span className="font-bold text-[#2c2825]">{usesMockData ? 'Development data mode.' : 'Live API data.'}</span>{' '}
        {usesMockData
          ? 'The shared API does not yet provide horizon-specific predictions, so this preview does not represent a true 1h, 3h, or 6h KPI.'
          : 'The current response shape does not yet verify a horizon-specific prediction field.'}
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = 'text-[#2c2825]',
}: {
  icon: typeof Activity
  label: string
  value: string
  detail: string
  accent?: string
}) {
  return (
    <Card className="border-[#e8e0d5] bg-white p-4 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">{label}</p>
            <p className={`mt-2 font-mono text-2xl font-black ${accent}`}>{value}</p>
            <p className="mt-1 text-[11px] text-[#6b625b]">{detail}</p>
          </div>
          <div className="rounded-lg bg-[#2c2825]/5 p-2">
            <Icon className="size-4 text-[#2c2825]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
