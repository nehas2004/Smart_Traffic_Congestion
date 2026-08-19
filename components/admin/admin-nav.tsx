'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Map,
  History,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  MapPin,
  ChevronDown,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { SectorSelectorModal, SectorPoint } from './sector-selector-modal'

const navItems = [
  { href: '/admin', label: 'Admin Overview', icon: LayoutDashboard },
  { href: '/admin/traffic', label: 'Congestion Map', icon: Map },
  { href: '/admin/decisions', label: 'Decision History', icon: History },
  { href: '/admin/recommendations', label: 'AI Recommendations', icon: Sparkles },
]

export function AdminNav() {
  const pathname = usePathname()
  const [timeStr, setTimeStr] = useState<string>('')
  const [activeSector, setActiveSector] = useState<SectorPoint | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Load stored coordinates or default to [10.0601, 76.6214]
  useEffect(() => {
    try {
      const s = localStorage.getItem('planner_active_city')
      if (s) {
        setActiveSector(JSON.parse(s))
      } else {
        const defaultSector: SectorPoint = {
          name: '10.0601°, 76.6214°',
          lat: 10.0601,
          lon: 76.6214,
          radiusKm: 10,
        }
        setActiveSector(defaultSector)
        localStorage.setItem('planner_active_city', JSON.stringify(defaultSector))
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSelectSector = (sector: SectorPoint) => {
    setActiveSector(sector)
    setIsModalOpen(false)
    window.dispatchEvent(new CustomEvent('planner_city_changed', { detail: sector }))
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#e8e0d5] bg-[#faf8f5]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Brand & Admin Badge */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5 text-inherit no-underline">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#2c2825] shadow-sm">
                <ShieldAlert className="size-4 text-[#c8a97e]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-[#2c2825]">Flowcast</span>
                  <span className="rounded-full bg-[#2c2825] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c8a97e]">
                    Admin Center
                  </span>
                </div>
                <p className="text-[11px] text-[#9e9189] leading-none">10km Grid Traffic Intelligence</p>
              </div>
            </Link>
          </div>

          {/* ACTIVE 10KM COORDINATE SECTOR PILL */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-blue-600/30 bg-blue-50/80 px-3 py-1.5 text-xs font-extrabold text-blue-950 shadow-sm transition-all hover:bg-blue-100 hover:border-blue-600/50"
            title="Click to change 10km surveillance coordinates"
          >
            <div className="flex size-5 items-center justify-center rounded-md bg-blue-600 text-white">
              <MapPin className="size-3" />
            </div>
            <div className="text-left">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-blue-700 leading-none">
                10km Grid Center:
              </span>
              <span className="text-xs font-mono font-black text-blue-950">
                {activeSector ? `${activeSector.lat.toFixed(4)}°, ${activeSector.lon.toFixed(4)}°` : '10.0601°, 76.6214°'}
              </span>
            </div>
            <ChevronDown className="size-3 text-blue-700 ml-1" />
          </button>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-[#f5f2ee] p-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[#2c2825] text-[#faf8f5] shadow-sm'
                      : 'text-[#6b625b] hover:bg-white/60 hover:text-[#2c2825]'
                  }`}
                >
                  <Icon className={`size-3.5 ${active ? 'text-[#c8a97e]' : 'text-[#9e9189]'}`} />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Live System Indicator & User Pill */}
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-xs font-medium text-[#2c2825] md:flex">
              <span className="flex size-2 items-center justify-center">
                <span className="absolute size-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono text-[11px] text-[#9e9189]">{timeStr || 'LIVE'}</span>
            </div>

            <div className="flex items-center gap-2 border-l border-[#e8e0d5] pl-4">
              <div className="text-right">
                <p className="text-xs font-bold text-[#2c2825]">City Planner</p>
                <p className="text-[10px] text-[#9e9189]">10km Grid Telemetry</p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-full bg-[#a67c52] text-xs font-bold text-white shadow-sm">
                CP
              </div>
            </div>

            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-[11px] font-medium text-[#9e9189] transition-colors hover:text-[#2c2825]"
              title="Switch to Commuter / Public View"
            >
              <ArrowLeft className="size-3" />
              <span className="hidden sm:inline">Exit</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Coordinate Sector Selector Modal */}
      <SectorSelectorModal
        isOpen={isModalOpen}
        currentSector={activeSector}
        onClose={() => setIsModalOpen(false)}
        onSelectSector={handleSelectSector}
      />
    </>
  )
}
