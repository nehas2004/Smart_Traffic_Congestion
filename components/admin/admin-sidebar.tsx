'use client'

import { useState, useEffect, useRef } from 'react'
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
  Menu,
  X,
  Flame,
  User,
  Building2,
  ShieldCheck,
  MoreVertical,
  ChevronRight,
  Radio,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Zap,
} from 'lucide-react'
import { SectorSelectorModal, SectorPoint, PRESET_CITIES } from './sector-selector-modal'
import { ReportIncidentModal } from './report-incident-modal'
import { signOutUser, getStoredUser, FlowcastUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const ADMIN_NAV_ITEMS = [
  { href: '/admin/traffic', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/recommendations', label: 'Decision Support', icon: Zap },
  { href: '/admin/forecast', label: 'Forecast', icon: TrendingUp },
  { href: '/admin/bottlenecks', label: 'Bottlenecks', icon: AlertTriangle },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/incidents', label: 'Active Disruptions', icon: Flame },
  { href: '/admin/decisions', label: 'Decision History', icon: History },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [activeSector, setActiveSector] = useState<SectorPoint | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [timeStr, setTimeStr] = useState<string>('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [user, setUser] = useState<FlowcastUser | null>(null)

  const profileRef = useRef<HTMLDivElement>(null)

  // Load stored user, collapse state, and active sector on mount
  useEffect(() => {
    // 1. User state
    const localUser = getStoredUser()
    setUser(localUser)
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          const email = data.user.email || 'planner@flowcast.gov'
          const metaName = data.user.user_metadata?.name || data.user.user_metadata?.full_name
          const parsedName = metaName || email.split('@')[0]
          const formattedName = parsedName
            .split(/[\._-]/)
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')

          setUser({
            id: data.user.id,
            email,
            role: 'planner',
            name: formattedName || 'City Planner',
          })
        }
      })
    }

    // 2. Collapse state
    try {
      const savedCollapse = localStorage.getItem('flowcast_admin_sidebar_collapsed')
      if (savedCollapse !== null) {
        setIsCollapsed(savedCollapse === 'true')
      }
    } catch (_) {}

    // 3. City Sector selection
    try {
      const savedCity = localStorage.getItem('planner_active_city')

      if (savedCity) {
        setActiveSector(JSON.parse(savedCity))
      } else {
        // Default to Kochi preset
        const defaultCity = PRESET_CITIES[0]
        setActiveSector(defaultCity)
        localStorage.setItem('planner_active_city', JSON.stringify(defaultCity))
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

  // Close menus on route change or outside click
  useEffect(() => {
    setIsMobileOpen(false)
    setIsProfileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
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
      localStorage.setItem('planner_has_selected_city', 'true')
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
        localStorage.removeItem('planner_has_selected_city')
      } catch (_) {}
      router.replace('/')
      setTimeout(() => {
        window.location.href = '/'
      }, 100)
    }
  }

  // Derive display initials & planner name
  const plannerName = user?.name || 'City Planner'
  const plannerEmail = user?.email || 'planner@flowcast.gov'
  const initials = plannerName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'CP'

  const activeCityName =
    activeSector?.cityName ||
    activeSector?.name?.split('·')[0]?.trim() ||
    'Kochi (Ernakulam)'

  return (
    <>
      {/* ── Mobile Top Header Bar ── */}
      <div className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50"
            aria-label="Open Navigation Sidebar"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <ShieldAlert className="size-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900">Flowcast</span>
              <span className="ml-1.5 rounded-md bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                Planner
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs cursor-pointer"
            title="Report Congestion / Event"
          >
            <Flame className="size-3 fill-white" />
            <span className="hidden sm:inline">Report</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-600/30 bg-blue-50/90 px-2.5 py-1 text-xs font-bold text-blue-950 cursor-pointer"
            title="Change City / Sector"
          >
            <Building2 className="size-3 text-emerald-600" />
            <span className="font-extrabold text-[11px] truncate max-w-[90px]">
              {activeCityName}
            </span>
          </button>
        </div>
      </div>

      {/* ── Mobile Backdrop Overlay ── */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* ── Collapsible Sidebar Container ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out lg:static lg:z-30 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-[272px]'
        } w-[272px]`}
      >
        {/* ── Sidebar Header ── */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-3.5">
          <Link
            href="/admin/traffic"
            className="flex items-center gap-2.5 text-inherit no-underline overflow-hidden transition-opacity hover:opacity-90"
            title="Flowcast - 10km Grid Traffic Intelligence"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <ShieldAlert className="size-4.5 text-white" />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 truncate">Flowcast</span>
                  <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                    Planner
                  </span>
                </div>
                <p className="text-[10px] text-[#9e9189] leading-tight truncate">
                  Traffic Intelligence Center
                </p>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e0d5] bg-white text-[#6b625b] shadow-2xs transition hover:bg-[#f5f2ee] hover:text-[#2c2825] cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4 text-slate-400" />
            ) : (
              <PanelLeftClose className="size-4 text-slate-400" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="flex lg:hidden size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e0d5] bg-white text-[#6b625b] hover:bg-[#f5f2ee] cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── 10KM City & Sector Selector Card ── */}
        <div className="px-3 pt-3 pb-1 space-y-2">
          {(!isCollapsed || isMobileOpen) ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="group flex w-full items-center justify-between rounded-xl border border-blue-600/25 bg-blue-50/80 p-2.5 text-left transition-all hover:bg-blue-100/80 hover:border-blue-600/40 shadow-2xs cursor-pointer"
              title="Click to change City / 10km grid surveillance sector"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                  <Building2 className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 leading-none">
                      Active City Sector
                    </span>
                    <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  </div>
                  <span className="block text-xs font-black text-emerald-950 truncate mt-0.5">
                    {activeCityName}
                  </span>
                  <span className="block text-[10px] font-mono text-emerald-800/80 truncate">
                    {activeSector ? `${activeSector.lat.toFixed(4)}°, ${activeSector.lon.toFixed(4)}°` : '10.0033°, 76.2996°'}
                  </span>
                </div>
              </div>
              <ChevronDown className="size-3.5 text-emerald-700 shrink-0 ml-1 transition group-hover:translate-y-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex size-10 w-full items-center justify-center rounded-xl border border-blue-600/30 bg-blue-50 text-blue-700 shadow-2xs transition hover:bg-blue-100 cursor-pointer"
              title={`Active City: ${activeCityName} (${activeSector?.lat.toFixed(4)}°, ${activeSector?.lon.toFixed(4)}°) - Click to change`}
            >
              <Building2 className="size-4" />
            </button>
          )}

          {/* Report Incident / Event Button */}
          {(!isCollapsed || isMobileOpen) ? (
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-2.5 px-3 text-xs font-extrabold text-white shadow-md shadow-amber-600/15 transition-all hover:from-amber-700 hover:to-orange-700 hover:scale-[1.01] cursor-pointer"
              title="Report Temple Fest, Accident, Concert, or Road Hazard"
            >
              <Flame className="size-3.5 fill-white" />
              <span>Report Congestion / Event</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="flex size-10 w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs transition hover:scale-105 cursor-pointer"
              title="Report Congestion / Event"
            >
              <Flame className="size-4 fill-white" />
            </button>
          )}
        </div>

        {/* ── Main Navigation Menu ── */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
          <div className="mb-1.5 px-2">
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                    ? 'bg-emerald-50 text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
                title={isCollapsed && !isMobileOpen ? label : undefined}
              >
                <Icon
                  className={`shrink-0 transition-transform group-hover:scale-105 ${
                    isCollapsed && !isMobileOpen ? 'size-5' : 'size-4.5'
                  } ${active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-700'}`}
                />

                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate leading-none">{label}</span>
                )}

                {active && (
                  <span
                    className={`absolute rounded-full bg-emerald-600 ${
                      isCollapsed && !isMobileOpen
                        ? 'left-1 top-2 bottom-2 w-1'
                        : 'right-2.5 size-1.5'
                    }`}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── Telemetry Live Status ── */}
        <div className="px-3 py-2 border-t border-slate-200/80 bg-slate-50/70">
          <div
            className={`flex items-center gap-2 text-xs text-slate-800 ${
              isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-between px-1'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              {(!isCollapsed || isMobileOpen) && (
                <span className="text-[11px] font-semibold text-slate-600">10km Grid Online</span>
              )}
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="font-mono text-[10px] text-slate-500 font-medium">
                {timeStr || 'LIVE'}
              </span>
            )}
          </div>
        </div>

        {/* ── ChatGPT-Inspired User Profile & Logout Section ── */}
        <div ref={profileRef} className="relative shrink-0 border-t border-slate-200 bg-white p-2">
          {/* Profile Card Trigger */}
          {(!isCollapsed || isMobileOpen) ? (
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-[#f5f2ee] focus:outline-none cursor-pointer"
              title="Planner Account & Logout"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white shadow-xs">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate leading-tight">
                    {plannerName}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {plannerEmail}
                  </p>
                </div>
              </div>
              <MoreVertical className="size-4 text-slate-400 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="flex size-10 w-full items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white shadow-xs hover:opacity-90 cursor-pointer"
              title={`${plannerName} (${plannerEmail}) - Click for Account & Logout`}
            >
              {initials}
            </button>
          )}

          {/* Popover Menu */}
          {isProfileMenuOpen && (
            <div
              className={`absolute bottom-full mb-2 z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 ${
                isCollapsed && !isMobileOpen ? 'left-2 w-64' : 'left-2 right-2'
              }`}
            >
              {/* Header inside popover */}
              <div className="border-b border-slate-100 p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">
                      {plannerName}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {plannerEmail}
                    </p>
                    <span className="mt-1 inline-block rounded-md bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                      City Planner · Admin
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Jurisdiction Info */}
              <div className="p-2">
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 mb-1">
                    <span>Active Jurisdiction:</span>
                    <span className="font-mono text-[10px] text-emerald-700">10km Grid</span>
                  </div>
                  <p className="text-xs font-black text-emerald-950 truncate">
                    {activeCityName}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false)
                      setIsModalOpen(true)
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 py-1.5 text-[11px] font-bold text-white transition hover:bg-blue-700 cursor-pointer"
                  >
                    <Building2 className="size-3" />
                    Switch Operational City
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 my-1" />

              {/* Single Official Logout Option */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-xs font-bold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
              >
                <LogOut className="size-4 text-rose-500" />
                <span>Sign Out to Login Page</span>
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

      {/* ── Report Incident / Event Modal ── */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        defaultLat={activeSector?.lat || 10.0033}
        defaultLon={activeSector?.lon || 76.2996}
        onClose={() => setIsReportModalOpen(false)}
      />
    </>
  )
}
