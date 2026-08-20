'use client'

import { useEffect, useState } from 'react'
import { ActiveIncidentsPanel } from '@/components/admin/active-incidents-panel'
import { ReportIncidentModal } from '@/components/admin/report-incident-modal'
import { Flame, ArrowLeft, Plus, RefreshCw, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function AdminIncidentsPage() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [activeCityName, setActiveCityName] = useState('Kochi (Ernakulam)')
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lon: number }>({ lat: 10.0033, lon: 76.2996 })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('planner_active_city')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.lat && parsed.lon) {
          setActiveCityName(parsed.cityName || parsed.name || 'Active City Sector')
          setActiveCoords({ lat: parsed.lat, lon: parsed.lon })
        }
      }
    } catch (_) {}

    const onCityChange = (e: any) => {
      if (e.detail && e.detail.lat && e.detail.lon) {
        setActiveCityName(e.detail.cityName || e.detail.name || 'Active City Sector')
        setActiveCoords({ lat: e.detail.lat, lon: e.detail.lon })
      }
    }

    window.addEventListener('planner_city_changed', onCityChange)
    return () => window.removeEventListener('planner_city_changed', onCityChange)
  }, [])

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
            <span className="text-xs text-[#e8e0d5]">/</span>
            <span className="text-xs font-bold text-amber-700">Active Reported Disruptions</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            <h1 className="text-2xl font-black tracking-tight text-[#2c2825]">
              Active Reported Local Disruptions
            </h1>
            <div className="flex items-center gap-1.5 rounded-xl border border-blue-600/30 bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-950">
              <Building2 className="size-3 text-blue-600" />
              <span>{activeCityName}</span>
            </div>
          </div>
          <p className="mt-0.5 text-xs text-[#9e9189]">
            Manage manually reported events, temple festivals, crashes, and road closures impacting heatmaps & commuter routes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:from-amber-700 hover:to-orange-700 hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Report Event Disruption</span>
          </button>
        </div>
      </div>

      {/* Main Incidents Management Panel */}
      <div key={refreshKey}>
        <ActiveIncidentsPanel onIncidentCancelled={() => setRefreshKey((k) => k + 1)} />
      </div>

      {/* Report Incident Modal */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        defaultLat={activeCoords.lat}
        defaultLon={activeCoords.lon}
        onClose={() => setIsReportModalOpen(false)}
        onIncidentReported={() => setRefreshKey((k) => k + 1)}
      />
    </main>
  )
}
