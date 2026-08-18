'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Map, History, ShieldAlert, ArrowLeft, Radio } from 'lucide-react'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/admin', label: 'Admin Overview', icon: LayoutDashboard },
  { href: '/admin/traffic', label: 'Congestion Map', icon: Map },
  { href: '/admin/decisions', label: 'Decision History', icon: History },
]

export function AdminNav() {
  const pathname = usePathname()
  const [timeStr, setTimeStr] = useState<string>('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
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
              <p className="text-[11px] text-[#9e9189] leading-none">Decision Support & Traffic Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-[#f5f2ee] p-1">
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
              <p className="text-[10px] text-[#9e9189]">Traffic Operations</p>
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
            <span className="hidden sm:inline">Exit Admin</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
