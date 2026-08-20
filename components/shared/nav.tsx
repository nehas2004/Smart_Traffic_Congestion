'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Waypoints, Map, Fuel, ShieldAlert, X, Gauge, Check } from 'lucide-react'

const navLinks = [
  { href: '/routes', label: 'Route Options', icon: Waypoints },
  { href: '/map', label: 'Live Map', icon: Map },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  const [showFuelModal, setShowFuelModal] = useState(false)
  const [mileageInput, setMileageInput] = useState<string>('15.0')
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Load stored mileage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('flowcast_mileage')
      if (stored) {
        setMileageInput(stored)
      }
    } catch (_) {}
  }, [])

  const handleOpenFuelModal = () => {
    try {
      const stored = localStorage.getItem('flowcast_mileage')
      if (stored) setMileageInput(stored)
    } catch (_) {}
    setSavedSuccess(false)
    setShowFuelModal(true)
  }

  const handleSaveMileage = (val?: string) => {
    const valueToSave = val || mileageInput || '15.0'
    const num = parseFloat(valueToSave)
    if (isNaN(num) || num <= 0) return

    try {
      localStorage.setItem('flowcast_mileage', num.toString())
      window.dispatchEvent(
        new CustomEvent('flowcast_mileage_change', { detail: { mileage: num } })
      )
    } catch (_) {}

    setMileageInput(num.toString())
    setSavedSuccess(true)
    setTimeout(() => {
      setShowFuelModal(false)
      if (pathname !== '/routes') {
        router.push('/routes')
      }
    }, 600)
  }

  const currentNum = parseFloat(mileageInput) || 15

  return (
    <>
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
          <div className="flex items-center gap-3 sm:gap-4">
            <nav className="flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => {
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

          {/* City Planner Portal Button */}
          <Link
            href="/admin/traffic"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 transition-all"
          >
            <ShieldAlert size={14} className="text-indigo-600" />
            <span className="hidden sm:inline">City Planner Portal</span>
          </Link>
        </div>
      )}
    </>
  )
}
