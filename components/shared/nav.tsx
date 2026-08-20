'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Waypoints, Map, BarChart2, ShieldAlert, LogOut, User } from 'lucide-react'
import { getStoredUser, signOutUser, FlowcastUser } from '@/lib/auth'

const navLinks = [
  { href: '/routes', label: 'Route Options', icon: Waypoints },
  { href: '/map', label: 'Live Map', icon: Map },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<FlowcastUser | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const currentUser = getStoredUser()
    setUser(currentUser)
  }, [pathname])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOutUser()
      router.push('/')
    } catch (_) {
      router.push('/')
    } finally {
      setIsLoggingOut(false)
    }
  }

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
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
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

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* User Info Pill (if commuter is logged in) */}
          {user && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium">
              <div className="size-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold uppercase">
                {user.name ? user.name[0] : <User size={10} />}
              </div>
              <span className="max-w-[100px] truncate">{user.name || user.email.split('@')[0]}</span>
            </div>
          )}

          {/* City Planner Portal Button */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 transition-all"
          >
            <ShieldAlert size={14} className="text-indigo-600" />
            <span className="hidden sm:inline">Planner</span>
          </Link>

          {/* Commuter Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Log out of commuter account"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-100/80 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <LogOut size={13} className="text-slate-500 hover:text-rose-600 transition-colors" />
            <span className="hidden xs:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
