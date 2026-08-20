'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Waypoints, Map, BarChart2, ShieldAlert } from 'lucide-react'

const links = [
  { href: '/routes',    label: 'Route Options', icon: Waypoints },
  { href: '/map',       label: 'Live Map',      icon: Map },
  { href: '/dashboard', label: 'Analytics',     icon: BarChart2 },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/routes" className="flex items-center gap-2.5 group select-none">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Waypoints size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
            Flowcast
          </span>
        </Link>

        {/* Center & Right Navigation Links */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon size={15} className={active ? 'text-indigo-600' : 'text-slate-400'} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Separator */}
          <div className="hidden sm:block w-px h-5 bg-slate-200" />

          {/* Public Info Group */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100/80 border border-slate-200/70 rounded-xl p-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
              Public
            </span>
            {[
              { href: '/public', label: 'Home' },
              { href: '/public/traffic', label: 'Traffic' },
              { href: '/public/forecast', label: 'Forecast' },
            ].map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Separator */}
          <div className="hidden sm:block w-px h-5 bg-slate-200" />

          {/* City Planner Portal Button */}
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 transition-all"
          >
            <ShieldAlert size={14} className="text-indigo-600" />
            <span className="hidden sm:inline">Planner Portal</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
