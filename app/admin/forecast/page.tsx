'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, BarChart3, RefreshCw } from 'lucide-react'

import { ForecastHorizon } from '@/components/admin/forecast-horizon-tabs'
import { ForecastPanel } from '@/components/admin/forecast-panel'
import { CurrentTrafficReading, getCurrentTrafficData, getTrafficForecastData, TrafficDataSource, TrafficForecast } from '@/lib/admin-api'

function ForecastPageSkeleton() {
  return <main className="mx-auto max-w-7xl space-y-6 px-6 py-8"><div className="h-20 animate-pulse rounded-2xl bg-[#f0ece7]" /><div className="h-28 animate-pulse rounded-2xl bg-[#f0ece7]" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-[#f0ece7]" />)}</div><div className="h-96 animate-pulse rounded-2xl bg-[#f0ece7]" /></main>
}

export default function AdminForecastPage() {
  const [corridors, setCorridors] = useState<CurrentTrafficReading[]>([])
  const [forecast, setForecast] = useState<TrafficForecast | null>(null)
  const [selectedCorridorId, setSelectedCorridorId] = useState('')
  const [horizon, setHorizon] = useState<ForecastHorizon>('1h')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dataSource, setDataSource] = useState<TrafficDataSource>('mock')
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)

  async function loadData(corridorId?: string, nextHorizon = horizon) {
    const currentTraffic = await getCurrentTrafficData()
    const nextCorridorId = corridorId || selectedCorridorId || currentTraffic.data[0]?.corridor_id || ''
    const forecastData = nextCorridorId ? await getTrafficForecastData(nextCorridorId, nextHorizon) : null
    const notices = [currentTraffic.error, forecastData?.error].filter((notice): notice is string => Boolean(notice))

    setCorridors(currentTraffic.data)
    setSelectedCorridorId(nextCorridorId)
    setForecast(forecastData?.data ?? null)
    setDataSource(currentTraffic.source === 'api' && forecastData?.source === 'api' ? 'api' : 'mock')
    setFallbackNotice(notices.length ? `${notices.join(' ')} Displaying development fallback data.` : null)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { void loadData() }, [])
  function handleCorridorChange(corridorId: string) { setSelectedCorridorId(corridorId); setRefreshing(true); void loadData(corridorId) }
  function handleHorizonChange(nextHorizon: ForecastHorizon) { setHorizon(nextHorizon); setRefreshing(true); void loadData(selectedCorridorId, nextHorizon) }
  function handleRefresh() { setRefreshing(true); void loadData(selectedCorridorId) }

  if (loading) return <ForecastPageSkeleton />
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><BarChart3 className="size-5 text-[#a67c52]" /><h1 className="text-2xl font-black tracking-tight text-[#2c2825]">Traffic Forecast Intelligence</h1></div><p className="mt-1 text-sm text-[#9e9189]">Corridor-level congestion outlook for operational planning.</p></div><button type="button" onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-white px-3.5 py-2 text-xs font-bold text-[#2c2825] shadow-sm transition-colors hover:bg-[#faf8f5] disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw className={`size-3.5 text-[#a67c52] ${refreshing ? 'animate-spin' : ''}`} />Refresh forecast</button></header>
      {fallbackNotice && <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{fallbackNotice}</p></div>}
      {corridors.length ? <ForecastPanel corridors={corridors} selectedCorridorId={selectedCorridorId} onCorridorChange={handleCorridorChange} horizon={horizon} onHorizonChange={handleHorizonChange} forecast={forecast} dataSource={dataSource} /> : <div className="rounded-2xl border border-[#e8e0d5] bg-white px-6 py-16 text-center shadow-sm"><h2 className="font-bold text-[#2c2825]">No forecast is available</h2><p className="mt-1 text-sm text-[#9e9189]">There are no monitored corridors available from the current traffic data source.</p></div>}
    </main>
  )
}
