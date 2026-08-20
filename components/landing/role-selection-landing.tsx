'use client'

import React, { useState } from 'react'
import { Car, Building2, ArrowRight, Menu, X, Shield, Sparkles } from 'lucide-react'

interface RoleSelectionLandingProps {
  onSelectRole: (role: 'commuter' | 'planner') => void
  onDirectSignUp: () => void
}

export function RoleSelectionLanding({
  onSelectRole,
  onDirectSignUp,
}: RoleSelectionLandingProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0f1d] text-white flex flex-col justify-between font-sans">
      {/* Background with modern night city skyline & highway light trails */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Deep blue atmospheric gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1128]/90 via-[#0b1536]/85 to-[#060a17]" />
        
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-emerald-600/10 rounded-full blur-[130px]" />

        {/* Vector Night City Skyline Silhouette with Highway Light Trails */}
        <svg
          className="absolute bottom-0 inset-x-0 w-full h-[65%] opacity-40 object-cover"
          viewBox="0 0 1440 600"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="skylineGrad" x1="720" y1="100" x2="720" y2="600" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#090d1a" />
            </linearGradient>
            <linearGradient id="glowLine1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="glowLine2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Distant Skyscrapers */}
          <rect x="80" y="220" width="70" height="380" fill="url(#skylineGrad)" rx="2" />
          <rect x="180" y="160" width="90" height="440" fill="url(#skylineGrad)" rx="2" />
          <polygon points="225,110 200,160 250,160" fill="#1e1b4b" />
          
          <rect x="310" y="240" width="80" height="360" fill="url(#skylineGrad)" rx="2" />
          <rect x="430" y="180" width="110" height="420" fill="url(#skylineGrad)" rx="2" />
          <line x1="485" y1="130" x2="485" y2="180" stroke="#818cf8" strokeWidth="2" />

          {/* Center tall financial towers */}
          <rect x="680" y="130" width="100" height="470" fill="url(#skylineGrad)" rx="3" />
          <polygon points="730,70 690,130 770,130" fill="#312e81" />
          <line x1="730" y1="40" x2="730" y2="70" stroke="#f43f5e" strokeWidth="3" />

          <rect x="810" y="200" width="85" height="400" fill="url(#skylineGrad)" rx="2" />
          <rect x="920" y="150" width="95" height="450" fill="url(#skylineGrad)" rx="2" />
          <rect x="1050" y="230" width="80" height="370" fill="url(#skylineGrad)" rx="2" />
          <rect x="1160" y="190" width="110" height="410" fill="url(#skylineGrad)" rx="2" />
          <polygon points="1215,140 1180,190 1250,190" fill="#1e1b4b" />

          {/* Window dots lighting */}
          <g fill="#93c5fd" opacity="0.6">
            <circle cx="200" cy="200" r="1.5" /><circle cx="230" cy="200" r="1.5" /><circle cx="250" cy="200" r="1.5" />
            <circle cx="200" cy="230" r="1.5" /><circle cx="230" cy="230" r="1.5" /><circle cx="250" cy="230" r="1.5" />
            <circle cx="700" cy="180" r="2" /><circle cx="730" cy="180" r="2" /><circle cx="750" cy="180" r="2" />
            <circle cx="700" cy="220" r="2" /><circle cx="730" cy="220" r="2" /><circle cx="750" cy="220" r="2" />
            <circle cx="940" cy="200" r="1.5" /><circle cx="970" cy="200" r="1.5" /><circle cx="990" cy="200" r="1.5" />
          </g>

          {/* Highway curves with streaming car light trails */}
          <path d="M-100 560 Q 400 480 720 490 T 1540 540" stroke="url(#glowLine1)" strokeWidth="8" fill="none" />
          <path d="M-100 580 Q 450 510 740 510 T 1540 560" stroke="url(#glowLine2)" strokeWidth="10" fill="none" />
          <path d="M-50 600 Q 500 530 800 530 T 1500 590" stroke="#f59e0b" strokeWidth="4" opacity="0.7" fill="none" />
        </svg>

        {/* Ambient road blur base */}
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#050811] via-[#050811]/90 to-transparent" />
      </div>

      {/* Top Header / Navigation */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        {/* Brand Logo matching mockup */}
        <div className="flex items-center gap-3 select-none">
          {/* Blue/Purple Location Pin Logo with inner person silhouette */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3b82f6] via-[#6366f1] to-[#4f46e5] flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 ring-2 ring-white/10">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                fill="currentColor"
              />
              <circle cx="12" cy="8.5" r="2.5" fill="#0f172a" />
              <path
                d="M12 12c-2.2 0-4 1.2-4 2.2 0 .5.5.8 1 .8h6c.5 0 1-.3 1-.8 0-1-1.8-2.2-4-2.2z"
                fill="#0f172a"
              />
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight leading-none block">
              SmartTraffic
            </span>
            <span className="text-[11px] text-slate-400 font-medium tracking-wide">
              Predict. Plan. Optimize.
            </span>
          </div>
        </div>

        {/* Desktop Links & Action */}
        <div className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={() => onSelectRole('commuter')}
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Commuter Portal
          </button>
          <button
            type="button"
            onClick={() => onSelectRole('planner')}
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            City Planner Portal
          </button>
          <button
            type="button"
            onClick={onDirectSignUp}
            className="text-xs font-bold px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm transition-all cursor-pointer"
          >
            Sign Up
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden relative z-30 mx-6 mb-4 p-4 rounded-2xl bg-[#131b31]/95 backdrop-blur-md border border-white/10 flex flex-col gap-3 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              onSelectRole('commuter')
            }}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            Commuter Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              onSelectRole('planner')
            }}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            City Planner Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              onDirectSignUp()
            }}
            className="w-full text-center py-2.5 px-3 rounded-lg text-sm font-bold bg-[#4834d4] text-white"
          >
            Create Account
          </button>
        </div>
      )}

      {/* Main Hero & Role Selection Section */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-4 sm:py-8 flex flex-col items-center text-center">
        {/* Main Headline from Mockup */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-extrabold text-white tracking-tight leading-[1.15] max-w-3xl">
          Smarter Roads, <br />
          Better Journeys, <br />
          Sustainable Cities.
        </h1>

        {/* Subtitle from Mockup */}
        <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl font-normal leading-relaxed">
          AI-driven traffic prediction and smart insights for commuters and city planners.
        </p>

        {/* The Two Main Role Selection Cards matching image */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 sm:mt-12 max-w-3xl">
          {/* Card 1: Commuter Role (Purple) */}
          <div className="relative group rounded-3xl p-7 sm:p-8 flex flex-col justify-between items-center text-center bg-gradient-to-b from-[#5b48e9]/95 to-[#3b27b3]/95 backdrop-blur-md border border-indigo-400/30 shadow-[0_15px_35px_-5px_rgba(79,70,229,0.4)] hover:shadow-[0_20px_45px_-5px_rgba(79,70,229,0.55)] transform hover:-translate-y-1 transition-all duration-300">
            {/* Top Car Icon */}
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white mb-4 shadow-inner">
              <Car className="w-7 h-7" />
            </div>

            {/* Role Header */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                I am a
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Commuter
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100/90 mt-2.5 max-w-[260px] font-normal leading-relaxed">
                Plan my trips, get real-time updates and save time & fuel.
              </p>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => onSelectRole('commuter')}
              className="mt-6 w-full h-11 px-5 rounded-xl bg-[#4b35cf] hover:bg-[#3d27be] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/20 shadow-md transition-all cursor-pointer group-hover:border-white/40"
            >
              <span>Continue as Commuter</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Card 2: City Planner Role (Emerald / Green) */}
          <div className="relative group rounded-3xl p-7 sm:p-8 flex flex-col justify-between items-center text-center bg-gradient-to-b from-[#168a53]/95 to-[#0b5430]/95 backdrop-blur-md border border-emerald-400/30 shadow-[0_15px_35px_-5px_rgba(16,185,129,0.35)] hover:shadow-[0_20px_45px_-5px_rgba(16,185,129,0.5)] transform hover:-translate-y-1 transition-all duration-300">
            {/* Top Building Icon */}
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white mb-4 shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>

            {/* Role Header */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                I am a
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                City Planner
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-2.5 max-w-[260px] font-normal leading-relaxed">
                Analyze city-wide traffic patterns and plan better infrastructure.
              </p>
            </div>

            {/* Action Button (Light Button with green text matching mockup) */}
            <button
              type="button"
              onClick={() => onSelectRole('planner')}
              className="mt-6 w-full h-11 px-5 rounded-xl bg-[#ebfdf3] hover:bg-white active:scale-[0.98] text-[#0f5c35] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <span>Continue as City Planner</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full py-6 text-center text-xs text-slate-400 border-t border-white/5">
        <p>SmartTraffic Urban Mobility & AI Congestion Prediction System • 2026</p>
      </footer>
    </div>
  )
}
