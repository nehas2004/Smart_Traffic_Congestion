'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertCircle, AlertTriangle, Clock3, RefreshCw, TrendingUp } from 'lucide-react'

import { AdminBottleneckTable } from '@/components/admin/admin-bottleneck-table'
import { Card, CardContent } from '@/components/ui/card'
import { getBottleneckData, TrafficDataSource } from '@/lib/admin-api'
import { BottleneckItem } from '@/types/traffic'

function BottlenecksPageSkeleton() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="h-20 animate-pulse rounded-2xl bg-[#f0ece7]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-[#f0ece7]" />)}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-[#f0ece7]" />
    </main>
  )
}

export default function AdminBottlenecksPage() {
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([])
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dataSource, setDataSource] = useState<TrafficDataSource>('mock')
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)

  async function loadBottlenecks() {
    const result = await getBottleneckData()
    setBottlenecks(result.data)
    setDataSource(result.source)
    setFallbackNotice(result.error ? `${result.error} Displaying development fallback data.` : null)
    setSelectedCorridorId((current) => current && result.data.some((item) => item.corridor_id === current) ? current : null)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    void loadBottlenecks()
  }, [])

  const summary = useMemo(() => {
    const monitoredCorridors = new Set(bottlenecks.map((item) => item.corridor_id)).size
    const severeOrCritical = bottlenecks.filter((item) => item.severity === 'severe' || item.severity === 'critical').length
    const greatestDelay = bottlenecks.reduce((greatest, item) => Math.max(greatest, item.avg_delay_mins), 0)
    const strongestWorsening = bottlenecks.reduce((greatest, item) => Math.max(greatest, item.trend_percent), 0)

    return { monitoredCorridors, severeOrCritical, greatestDelay, strongestWorsening }
  }, [bottlenecks])

  const selectedBottleneck = bottlenecks.find((item) => item.corridor_id === selectedCorridorId)

  function handleRefresh() {
    setRefreshing(true)
    void loadBottlenecks()
  }

  if (loading) return <BottlenecksPageSkeleton />

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-[#a67c52]" />
            <h1 className="text-2xl font-black tracking-tight text-[#2c2825]">Bottleneck Monitoring</h1>
          </div>
          <p className="mt-1 text-sm text-[#9e9189]">Prioritized recurring delay points for traffic operations.</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-white px-3.5 py-2 text-xs font-bold text-[#2c2825] shadow-sm transition-colors hover:bg-[#faf8f5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 text-[#a67c52] ${refreshing ? 'animate-spin' : ''}`} />
          Refresh monitoring
        </button>
      </header>

      {fallbackNotice && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{fallbackNotice}</p>
        </div>
      )}

      {bottlenecks.length ? (
        <>
          <section aria-label="Bottleneck summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Activity} label="Monitored corridors" value={summary.monitoredCorridors.toString()} detail="Corridors with recurring bottlenecks" />
            <SummaryCard icon={AlertTriangle} label="Severe or critical" value={summary.severeOrCritical.toString()} detail="Requires priority monitoring" accent="text-rose-700" />
            <SummaryCard icon={Clock3} label="Greatest delay" value={`+${summary.greatestDelay.toFixed(1)} min`} detail="Largest recurring average delay" accent="text-[#a67c52]" />
            <SummaryCard icon={TrendingUp} label="Strongest worsening" value={`+${summary.strongestWorsening}%`} detail="Largest recorded congestion trend" accent="text-rose-700" />
          </section>

          {selectedBottleneck && (
            <Card className="border-[#e8e0d5] bg-[#faf8f5] shadow-sm">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">Selected bottleneck</p>
                  <p className="mt-1 font-bold text-[#2c2825]">{selectedBottleneck.corridor_name}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b625b]">
                  <span>Severity: <strong className="uppercase text-[#2c2825]">{selectedBottleneck.severity}</strong></span>
                  <span>Delay: <strong className="text-[#2c2825]">+{selectedBottleneck.avg_delay_mins} min</strong></span>
                  <span>Confidence: <strong className="text-[#2c2825]">{Math.round(selectedBottleneck.confidence * 100)}%</strong></span>
                </div>
              </CardContent>
            </Card>
          )}

          <AdminBottleneckTable bottlenecks={bottlenecks} onSelectBottleneck={setSelectedCorridorId} />

          <div className="rounded-xl border border-dashed border-[#d8c9b7] bg-[#faf8f5] px-4 py-3 text-xs text-[#6b625b]">
            <span className="font-bold text-[#2c2825]">{dataSource === 'mock' ? 'Development data mode.' : 'Live API data.'}</span>{' '}
            {dataSource === 'mock'
              ? 'This page uses the existing traffic API adapter and its mock fallback until the shared bottleneck API is connected.'
              : 'Bottleneck data was loaded from the configured traffic service.'}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-[#e8e0d5] bg-white px-6 py-16 text-center shadow-sm">
          <h2 className="font-bold text-[#2c2825]">No bottlenecks are available</h2>
          <p className="mt-1 text-sm text-[#9e9189]">There are no monitored bottlenecks from the current traffic data source.</p>
        </div>
      )}
    </main>
  )
}

function SummaryCard({
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
