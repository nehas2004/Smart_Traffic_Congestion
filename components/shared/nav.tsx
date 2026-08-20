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

              {/* Fuel Calculator Modal Trigger Button in Nav */}
              <button
                type="button"
                onClick={handleOpenFuelModal}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  showFuelModal
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/70'
                }`}
              >
                <Fuel size={15} className={showFuelModal ? 'text-white' : 'text-indigo-600'} />
                <span className="font-bold">Fuel Calculator</span>
              </button>
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

      {/* Vehicle Mileage & Fuel Calculator Modal */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in-50 duration-150">
          <div
            className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowFuelModal(false)}
              className="absolute right-4.5 top-4.5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
                <Fuel size={20} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
                  Fuel Cost Calculator
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Enter your vehicle mileage to calculate cost for each route
                </p>
              </div>
            </div>

            {/* Mileage Input */}
            <div className="flex flex-col gap-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Gauge size={14} className="text-indigo-600" /> Enter Vehicle Mileage (km/L)
                </span>
                <span className="text-indigo-600 normal-case font-bold">{currentNum} km/L</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  autoFocus
                  value={mileageInput}
                  onChange={(e) => {
                    setMileageInput(e.target.value)
                    setSavedSuccess(false)
                  }}
                  placeholder="e.g. 15.0"
                  className="w-full h-12 pl-4 pr-16 rounded-2xl bg-slate-50 border-2 border-slate-200 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                  km / L
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFuelModal(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveMileage()}
                className={`flex-1 h-11 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  savedSuccess
                    ? 'bg-emerald-600'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check size={15} />
                    <span>Applied to Routes!</span>
                  </>
                ) : (
                  <>
                    <Fuel size={14} />
                    <span>Apply to All Routes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
