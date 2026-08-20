'use client'

import React from 'react'

export function CityIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full h-full min-h-[480px] rounded-r-3xl overflow-hidden flex items-center justify-center select-none bg-gradient-to-b from-[#b8c2fc] via-[#94a3f8] to-[#7c8cf6] ${className}`}>
      {/* Background Sky & Stars / glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#c4b5fd]/40 via-[#818cf8]/30 to-[#4f46e5]/40" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl pointer-events-none" />

      {/* SVG Background illustration with City, Road, Trees */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 500 700"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="skyGrad" x1="250" y1="0" x2="250" y2="700" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#d4d4fc" />
            <stop offset="40%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          <linearGradient id="buildingGradFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="buildingGradNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>

          <linearGradient id="roadGrad" x1="250" y1="360" x2="250" y2="700" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>

          <linearGradient id="phoneScreenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0e7ff" />
            <stop offset="100%" stopColor="#c7d2fe" />
          </linearGradient>
        </defs>

        {/* --- FAR BUILDINGS (Back layer) --- */}
        {/* Left tall spire */}
        <rect x="30" y="240" width="45" height="280" fill="#a5b4fc" rx="2" />
        <polygon points="52.5,190 35,240 70,240" fill="#a5b4fc" />
        
        {/* Center-left skyscraper */}
        <rect x="90" y="210" width="60" height="310" fill="#93c5fd" rx="3" opacity="0.8" />
        <rect x="105" y="170" width="30" height="40" fill="#93c5fd" opacity="0.8" />
        <line x1="120" y1="140" x2="120" y2="170" stroke="#93c5fd" strokeWidth="3" />

        {/* Right side background towers */}
        <rect x="370" y="220" width="55" height="300" fill="#a5b4fc" rx="2" />
        <rect x="435" y="180" width="65" height="340" fill="#93c5fd" rx="2" opacity="0.75" />
        <polygon points="467.5,140 445,180 490,180" fill="#93c5fd" opacity="0.75" />

        {/* --- NEAR BUILDINGS (Mid layer) --- */}
        {/* Left main buildings */}
        <rect x="10" y="320" width="65" height="250" fill="url(#buildingGradFar)" rx="4" />
        {/* Window dots left */}
        <g fill="#c7d2fe" opacity="0.7">
          <rect x="20" y="340" width="8" height="12" rx="1" />
          <rect x="35" y="340" width="8" height="12" rx="1" />
          <rect x="50" y="340" width="8" height="12" rx="1" />
          <rect x="20" y="365" width="8" height="12" rx="1" />
          <rect x="35" y="365" width="8" height="12" rx="1" />
          <rect x="50" y="365" width="8" height="12" rx="1" />
          <rect x="20" y="390" width="8" height="12" rx="1" />
          <rect x="35" y="390" width="8" height="12" rx="1" />
          <rect x="50" y="390" width="8" height="12" rx="1" />
          <rect x="20" y="415" width="8" height="12" rx="1" />
          <rect x="35" y="415" width="8" height="12" rx="1" />
          <rect x="50" y="415" width="8" height="12" rx="1" />
        </g>

        {/* Left inner tower */}
        <rect x="75" y="270" width="70" height="300" fill="url(#buildingGradNear)" rx="4" />
        {/* Window grid */}
        <g fill="#e0e7ff" opacity="0.85">
          <rect x="87" y="290" width="9" height="14" rx="1" />
          <rect x="105" y="290" width="9" height="14" rx="1" />
          <rect x="123" y="290" width="9" height="14" rx="1" />
          <rect x="87" y="315" width="9" height="14" rx="1" />
          <rect x="105" y="315" width="9" height="14" rx="1" />
          <rect x="123" y="315" width="9" height="14" rx="1" />
          <rect x="87" y="340" width="9" height="14" rx="1" />
          <rect x="105" y="340" width="9" height="14" rx="1" />
          <rect x="123" y="340" width="9" height="14" rx="1" />
          <rect x="87" y="365" width="9" height="14" rx="1" />
          <rect x="105" y="365" width="9" height="14" rx="1" />
          <rect x="123" y="365" width="9" height="14" rx="1" />
        </g>

        {/* Right main buildings */}
        <rect x="385" y="260" width="80" height="320" fill="url(#buildingGradNear)" rx="4" />
        <g fill="#e0e7ff" opacity="0.85">
          <rect x="400" y="280" width="9" height="14" rx="1" />
          <rect x="420" y="280" width="9" height="14" rx="1" />
          <rect x="440" y="280" width="9" height="14" rx="1" />
          <rect x="400" y="305" width="9" height="14" rx="1" />
          <rect x="420" y="305" width="9" height="14" rx="1" />
          <rect x="440" y="305" width="9" height="14" rx="1" />
          <rect x="400" y="330" width="9" height="14" rx="1" />
          <rect x="420" y="330" width="9" height="14" rx="1" />
          <rect x="440" y="330" width="9" height="14" rx="1" />
        </g>

        {/* --- ROAD CURVING IN PERSPECTIVE --- */}
        <path
          d="M 180 390 Q 250 480 0 680 L 0 700 L 500 700 L 500 660 Q 340 500 240 390 Z"
          fill="url(#roadGrad)"
        />

        {/* Road Left Edge Highlight */}
        <path
          d="M 180 390 Q 250 480 0 680"
          stroke="#818cf8"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Road Center Dashed Line */}
        <path
          d="M 215 390 Q 300 500 220 700"
          stroke="#ffffff"
          strokeWidth="10"
          strokeDasharray="28 22"
          strokeLinecap="round"
          fill="none"
          opacity="0.95"
        />

        {/* Road Right Edge */}
        <path
          d="M 240 390 Q 340 500 500 660"
          stroke="#4f46e5"
          strokeWidth="4"
          fill="none"
        />

        {/* --- GREEN TREES ON SIDES --- */}
        {/* Right side trees */}
        <circle cx="450" cy="560" r="45" fill="#15803d" />
        <circle cx="420" cy="580" r="35" fill="#16a34a" />
        <circle cx="475" cy="590" r="40" fill="#22c55e" />
        <rect x="445" y="590" width="10" height="40" fill="#78350f" rx="3" />

        {/* Left side trees (subtle) */}
        <circle cx="40" cy="570" r="38" fill="#15803d" opacity="0.9" />
        <circle cx="70" cy="590" r="30" fill="#16a34a" opacity="0.9" />
      </svg>

      {/* --- FLOATING 3D SMARTPHONE WITH LIVE NAVIGATION MAP --- */}
      <div className="relative z-10 w-[220px] sm:w-[240px] aspect-[9/18.5] bg-[#0f172a] rounded-[42px] p-[10px] shadow-[0_25px_50px_-12px_rgba(30,27,75,0.7),0_0_0_1px_rgba(255,255,255,0.15)] border-2 border-slate-700/80 transform hover:-translate-y-2 transition-transform duration-500 ease-out">
        {/* Speaker / Dynamic Island pill */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-30 flex items-center justify-end px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b]" />
        </div>

        {/* Screen Bezel & Content */}
        <div className="relative w-full h-full bg-[#eef2ff] rounded-[34px] overflow-hidden flex flex-col">
          {/* Map Top Status Bar */}
          <div className="pt-7 px-4 pb-2 flex items-center justify-between z-20">
            <span className="text-[10px] font-bold text-slate-800 tracking-tight">9:41</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded-full">5G</span>
              <div className="w-4 h-2 rounded-sm border border-slate-700 flex items-center p-0.5">
                <div className="w-2.5 h-full bg-slate-800 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Map Canvas with Road Grid & Traffic Route */}
          <div className="relative flex-1 bg-[#ede9fe] overflow-hidden">
            {/* Map Grid Roads */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 340" fill="none">
              {/* Background streets */}
              <path d="M-20 80 L240 70" stroke="#ffffff" strokeWidth="8" />
              <path d="M-20 160 L240 180" stroke="#ffffff" strokeWidth="12" />
              <path d="M-20 240 L240 230" stroke="#ffffff" strokeWidth="9" />
              <path d="M60 -20 L70 360" stroke="#ffffff" strokeWidth="10" />
              <path d="M150 -20 L140 360" stroke="#ffffff" strokeWidth="12" />
              <path d="M0 300 Q100 200 240 310" stroke="#ffffff" strokeWidth="14" />

              {/* Secondary fine streets */}
              <path d="M20 0 L20 340" stroke="#ddd6fe" strokeWidth="3" />
              <path d="M100 0 L100 340" stroke="#ddd6fe" strokeWidth="3" />
              <path d="M190 0 L190 340" stroke="#ddd6fe" strokeWidth="3" />
              <path d="M0 120 L220 120" stroke="#ddd6fe" strokeWidth="3" />
              <path d="M0 200 L220 200" stroke="#ddd6fe" strokeWidth="3" />

              {/* Active Route (Traffic Guided Line) */}
              <path
                d="M 60 320 Q 90 220 110 180 T 115 130"
                stroke="#6366f1"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 60 320 Q 90 220 110 180 T 115 130"
                stroke="#a5b4fc"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 4"
              />

              {/* Origin indicator */}
              <circle cx="60" cy="320" r="5" fill="#4f46e5" />
              <circle cx="60" cy="320" r="9" stroke="#6366f1" strokeWidth="2" fill="none" opacity="0.6" />
            </svg>

            {/* Destination Location Pin Marker with Drop Shadow */}
            <div className="absolute top-[105px] left-[102px] -translate-x-1/2 -translate-y-full flex flex-col items-center">
              {/* Pin Icon */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#1e1b4b] flex items-center justify-center text-white shadow-xl shadow-indigo-900/50 ring-4 ring-white/90 transform hover:scale-110 transition-transform">
                  <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1e1b4b]" />
                  </div>
                </div>
                {/* Pin bottom tip pointer */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#1e1b4b] mx-auto -mt-1" />
              </div>
              {/* Ripple / Ground shadow */}
              <div className="w-6 h-2 rounded-full bg-indigo-950/30 blur-[2px] mt-1" />
            </div>

            {/* Turn-by-Turn Smart Traffic HUD Overlay on bottom of phone */}
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-lg border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800 leading-none">Smart Route</p>
                  <p className="text-[9px] font-semibold text-emerald-600 leading-tight">Fastest • 14 min</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">4.2 km</span>
            </div>
          </div>
        </div>

        {/* Screen Bottom Bar / Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/60 rounded-full" />
      </div>
    </div>
  )
}
