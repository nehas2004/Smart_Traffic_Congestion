'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Map,
  History,
  Sparkles,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  ChevronDown,
  LogOut,
  ArrowUpRight,
  Menu,
  X,
  Radio,
  User,
} from 'lucide-react'
import { SectorSelectorModal, SectorPoint } from './sector-selector-modal'
import { signOutUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Admin Overview', icon: LayoutDashboard },
  { href: '/admin/traffic', label: 'Congestion Map', icon: Map },
  { href: '/admin/decisions', label: 'Decision History', icon: History },
  { href: '/admin/recommendations', label: 'AI Recommendations', icon: Sparkles },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [activeSector, setActiveSector] = useState<SectorPoint | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [timeStr, setTimeStr] = useState<string>('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load stored collapse state and active sector on mount
  useEffect(() => {
    setMounted(true)
    try {
      const savedCollapse = localStorage.getItem('flowcast_admin_sidebar_collapsed')
      if (savedCollapse !== null) {
        setIsCollapsed(savedCollapse === 'true')
      }

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

    const handleCityChange = (e: any) => {
      if (e.detail) {
        setActiveSector(e.detail)
      }
    }
    window.addEventListener('planner_city_changed', handleCityChange)
    return () => window.removeEventListener('planner_city_changed', handleCityChange)
  }, [])

  // Live system clock
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem('flowcast_admin_sidebar_collapsed', String(next))
      } catch (_) {}
      return next
    })
  }

  const handleSelectSector = (sector: SectorPoint) => {
    setActiveSector(sector)
    setIsModalOpen(false)
    try {
      localStorage.setItem('planner_active_city', JSON.stringify(sector))
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('planner_city_changed', { detail: sector }))
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await signOutUser()
      if (supabase) {
        await supabase.auth.signOut().catch(() => {})
      }
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      try {
        localStorage.removeItem('flowcast_auth_user')
      } catch (_) {}
      // Clear URL state and replace route
      router.replace('/')
      // Backup reload to clean all React / memory states
      setTimeout(() => {
        window.location.href = '/'
      }, 100)
    }
  }

  return (
    <>
      {/* ── Mobile Top Header Bar ── */}
      <div className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#e8e0d5] bg-[#faf8f5]/95 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="flex size-10 items-center justify-center rounded-xl border border-[#e8e0d5] bg-white text-[#2c2825] shadow-sm transition hover:bg-[#f5f2ee]"
            aria-label="Open Navigation Sidebar"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#2c2825] shadow-sm">
              <ShieldAlert className="size-4 text-[#c8a97e]" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-[#2c2825]">Flowcast</span>
              <span className="ml-1.5 rounded-md bg-[#2c2825] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#c8a97e]">
                Planner
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-600/30 bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-blue-950"
          >
            <MapPin className="size-3 text-blue-600" />
            <span className="font-mono text-[11px]">10km Grid</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Backdrop Overlay ── */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden"
        />
      )}

      {/* ── Collapsible Sidebar Container ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#e8e0d5] bg-[#faf8f5] transition-all duration-300 ease-in-out lg:static lg:z-30 ${
          // Mobile state
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop collapsed state
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-[268px]'
        } w-[268px]`}
      >
        {/* ── Sidebar Header ── */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#e8e0d5] px-3.5">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 text-inherit no-underline overflow-hidden transition-opacity hover:opacity-90"
            title="Flowcast - 10km Grid Traffic Intelligence"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#2c2825] shadow-sm">
              <ShieldAlert className="size-4 text-[#c8a97e]" />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-[#2c2825] truncate">Flowcast</span>
                  <span className="shrink-0 rounded-full bg-[#2c2825] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#c8a97e]">
                    Planner
                  </span>
                </div>
                <p className="text-[10px] text-[#9e9189] leading-tight truncate">
                  10km Grid Traffic Intelligence
                </p>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e0d5] bg-white text-[#6b625b] shadow-xs transition hover:bg-[#f5f2ee] hover:text-[#2c2825]"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4 text-[#9e9189]" />
            ) : (
              <PanelLeftClose className="size-4 text-[#9e9189]" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="flex lg:hidden size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e0d5] bg-white text-[#6b625b] hover:bg-[#f5f2ee]"
            aria-label="Close Sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── 10KM Surveillance Coordinate Sector Badge ── */}
        <div className="px-3 pt-3 pb-1">
          {(!isCollapsed || isMobileOpen) ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="group flex w-full items-center justify-between rounded-xl border border-blue-600/25 bg-blue-50/70 p-2.5 text-left transition-all hover:bg-blue-100/70 hover:border-blue-600/40 shadow-2xs"
              title="Click to select 10km grid surveillance coordinates"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                  <MapPin className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 leading-none">
                      10km Grid Center
                    </span>
                    <span className="size-1.5 rounded-full bg-blue-600 animate-pulse" />
                  </div>
                  <span className="block text-xs font-mono font-black text-blue-950 truncate mt-0.5">
                    {activeSector ? `${activeSector.lat.toFixed(4)}°, ${activeSector.lon.toFixed(4)}°` : '10.0601°, 76.6214°'}
                  </span>
                </div>
              </div>
              <ChevronDown className="size-3.5 text-blue-700 shrink-0 ml-1 transition group-hover:translate-y-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex size-10 w-full items-center justify-center rounded-xl border border-blue-600/30 bg-blue-50 text-blue-700 shadow-2xs transition hover:bg-blue-100"
              title={`10km Grid Center: ${activeSector ? `${activeSector.lat.toFixed(4)}°, ${activeSector.lon.toFixed(4)}°` : '10.0601°, 76.6214°'} (Click to change)`}
            >
              <MapPin className="size-4" />
            </button>
          )}
        </div>

        {/* ── Main Navigation Menu ── */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
          <div className="mb-1.5 px-2">
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9e9189]">
                Operations & Analytics
              </span>
            )}
          </div>

          {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`group relative flex items-center gap-3 rounded-xl py-2.5 font-medium transition-all ${
                  isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-3 text-sm'
                } ${
                  active
                    ? 'bg-[#2c2825] text-[#faf8f5] shadow-xs font-semibold'
                    : 'text-[#6b625b] hover:bg-[#ede8df] hover:text-[#2c2825]'
                }`}
                title={isCollapsed && !isMobileOpen ? label : undefined}
              >
                <Icon
                  className={`shrink-0 transition-transform group-hover:scale-105 ${
                    isCollapsed && !isMobileOpen ? 'size-5' : 'size-4.5'
                  } ${active ? 'text-[#c8a97e]' : 'text-[#9e9189] group-hover:text-[#2c2825]'}`}
                />

                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate leading-none">{label}</span>
                )}

                {/* Active Indicator Accent */}
                {active && (
                  <span
                    className={`absolute rounded-full bg-[#c8a97e] ${
                      isCollapsed && !isMobileOpen
                        ? 'left-1 top-2 bottom-2 w-1'
                        : 'right-2.5 size-1.5'
                    }`}
                  />
                )}
              </Link>
            )
          })}

          {/* Quick links & public view */}
          <div className="pt-4 mt-2 border-t border-[#e8e0d5]">
            <div className="mb-1.5 px-2">
              {(!isCollapsed || isMobileOpen) && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9e9189]">
                  Navigation & Tools
                </span>
              )}
            </div>

            <Link
              href="/dashboard"
              className={`group flex items-center gap-3 rounded-xl py-2 font-medium transition-all ${
                isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-3 text-xs'
              } text-[#82776d] hover:bg-[#ede8df] hover:text-[#2c2825]`}
              title="Switch to Commuter / Public View"
            >
              <ArrowUpRight
                className={`shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                  isCollapsed && !isMobileOpen ? 'size-4.5' : 'size-4'
                } text-[#9e9189] group-hover:text-[#2c2825]`}
              />
              {(!isCollapsed || isMobileOpen) && (
                <span className="truncate">Commuter / Public View</span>
              )}
            </Link>
          </div>
        </nav>

        {/* ── System Status Indicator ── */}
        <div className="px-3 py-2 border-t border-[#e8e0d5]/80 bg-[#f5f2ee]/50">
          <div
            className={`flex items-center gap-2 text-xs text-[#2c2825] ${
              isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-between px-1'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              {(!isCollapsed || isMobileOpen) && (
                <span className="text-[11px] font-semibold text-[#6b625b]">Telemetry Active</span>
              )}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="font-mono text-[10px] text-[#9e9189] font-medium">
                {timeStr || 'LIVE'}
              </span>
            )}
          </div>
        </div>

        {/* ── Profile & Authentication Section ── */}
        <div className="shrink-0 border-t border-[#e8e0d5] bg-white p-2.5">
          {(!isCollapsed || isMobileOpen) ? (
            <div className="flex items-center justify-between gap-2 rounded-xl p-1.5 transition-colors">
              {/* User Avatar + Details */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#2c2825] border border-[#443e39] text-xs font-black text-[#c8a97e] shadow-2xs">
                  CP
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#2c2825] truncate leading-tight">
                    City Planner
                  </p>
                  <p className="text-[10px] text-[#9e9189] truncate">
                    10km Grid Telemetry
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e0d5] bg-[#faf8f5] text-[#9e9189] transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                title="Sign Out of Operations Center"
                aria-label="Logout"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex size-9 items-center justify-center rounded-xl bg-[#2c2825] border border-[#443e39] text-xs font-black text-[#c8a97e] shadow-2xs"
                title="City Planner (10km Grid Telemetry)"
              >
                CP
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex size-8 items-center justify-center rounded-lg border border-[#e8e0d5] bg-[#faf8f5] text-[#9e9189] transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Coordinate Sector Selector Modal ── */}
      <SectorSelectorModal
        isOpen={isModalOpen}
        currentSector={activeSector}
        onClose={() => setIsModalOpen(false)}
        onSelectSector={handleSelectSector}
      />
    </>
  )
}
