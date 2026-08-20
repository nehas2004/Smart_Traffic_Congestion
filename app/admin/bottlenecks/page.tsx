'use client'

import { useEffect, useState, useCallback } from 'react'
import { BottleneckPanel } from '@/components/admin/BottleneckPanel'
import { LocationIntelPanel } from '@/components/admin/LocationIntelPanel'
import { fetchBottlenecks, fetchCurrentTraffic, fetchEventImpact } from '@/lib/admin-api'
import { BottleneckItem, CorridorDetail, EventImpact } from '@/types/traffic'
import { ArrowLeft, RefreshCw, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function AdminBottlenecksPage() {
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([])
  const [corridors, setCorridors] = useState<CorridorDetail[]>([])
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('corr-01')
  const [eventImpact, setEventImpact] = useState<EventImpact | null>(null)
  const [activeCityName, setActiveCityName] = useState('Kochi (Ernakulam)')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (sectorOverride?: { lat: number; lon: number; name?: string; cityName?: string }) => {
    setLoading(true)
    let sec = sectorOverride
    if (!sec) {
      try {
        const stored = localStorage.getItem('planner_active_city')
        if (stored) sec = JSON.parse(stored)
      } catch (_) {}
    }

    if (sec) {
      setActiveCityName(sec.cityName || sec.name || 'Active City Sector')
    }

    try {
      const [bData, cData, eData] = await Promise.all([
        fetchBottlenecks(sec ? { lat: sec.lat, lon: sec.lon, name: sec.cityName || sec.name || 'City' } : undefined),
        fetchCurrentTraffic(sec ? { lat: sec.lat, lon: sec.lon, name: sec.cityName || sec.name || 'City' } : undefined),
        fetchEventImpact('evt-101'),
      ])
      setBottlenecks(bData)
      setCorridors(cData as CorridorDetail[])
      if (eData) setEventImpact(eData)
      if (cData.length > 0) {
        setSelectedCorridorId(cData[0].corridor_id)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    const onCityChange = (e: any) => {
      if (e.detail) {
        loadData(e.detail)
      }
    }

    window.addEventListener('planner_city_changed', onCityChange)
    return () => window.removeEventListener('planner_city_changed', onCityChange)
  }, [loadData])

  const selectedCorridor =
    corridors.find((c) => c.corridor_id === selectedCorridorId) || corridors[0] || null

  const selectedBottleneck =
    bottlenecks.find((c) => c.corridor_id === selectedCorridorId) || null

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/traffic"
              className="flex items-center gap-1 text-xs font-bold text-[#9e9189] hover:text-[#2c2825]"
            >
              <ArrowLeft className="size-3.5" /> Overview
            </Link>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs font-bold text-emerald-700">Bottlenecks Surveillance</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            <h1 className="text-2xl font-black tracking-tight text-[#2c2825]">
              Junction Bottlenecks & Severity Ranking
            </h1>
            <div className="flex items-center gap-1.5 rounded-xl border border-blue-600/30 bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-950">
              <Building2 className="size-3 text-blue-600" />
              <span>{activeCityName}</span>
            </div>
          </div>
          <p className="mt-0.5 text-xs text-[#9e9189]">
            Real-time bottleneck surveillance, corridor delays, and predictive congestion rankings for {activeCityName}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-white px-3.5 py-2 text-xs font-bold text-[#2c2825] shadow-xs hover:bg-[#faf8f5] cursor-pointer"
        >
          <RefreshCw className={`size-3.5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Bottlenecks Panel */}
        <div className="lg:col-span-2">
          <BottleneckPanel
            bottlenecks={bottlenecks}
            onSelectCorridor={(id) => setSelectedCorridorId(id)}
          />
        </div>

        {/* Selected Corridor Location Intel Panel */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Selected Corridor Intelligence
          </h3>
          <LocationIntelPanel
            corridor={selectedCorridor}
            eventImpact={selectedCorridorId === 'corr-01' ? eventImpact : null}
            bottleneck={selectedBottleneck}
          />
        </div>
      </div>
    </main>
  )
}
