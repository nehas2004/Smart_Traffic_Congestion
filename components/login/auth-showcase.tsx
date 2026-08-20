'use client'

import React, { useState } from 'react'
import { RoleSelectionLanding } from '@/components/landing/role-selection-landing'
import { CommuterLoginCard } from './commuter-login-card'
import { PlannerLoginCard } from './planner-login-card'
import { SignUpCard } from './signup-card'

type ScreenState = 'landing' | 'commuter_login' | 'planner_login' | 'signup'

export function AuthShowcase() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('landing')
  const [signupInitialRole, setSignupInitialRole] = useState<'commuter' | 'planner'>('commuter')

  // Screen 1: Role Selection Landing Page (Default on start)
  if (currentScreen === 'landing') {
    return (
      <RoleSelectionLanding
        onSelectRole={(role) => {
          if (role === 'commuter') setCurrentScreen('commuter_login')
          else setCurrentScreen('planner_login')
        }}
        onDirectSignUp={() => {
          setSignupInitialRole('commuter')
          setCurrentScreen('signup')
        }}
      />
    )
  }

  // Screens 2 & 3: Commuter Login, Planner Login, Sign Up
  return (
    <div className="min-h-screen bg-[#f3f4f8] text-slate-900 flex flex-col justify-between font-sans">
      {/* Subtle Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentScreen('landing')}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3b82f6] via-[#6366f1] to-[#4f46e5] flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                fill="currentColor"
              />
              <circle cx="12" cy="8.5" r="2" fill="#0f172a" />
            </svg>
          </div>
          <span className="font-extrabold text-slate-900 text-sm tracking-tight group-hover:text-indigo-600 transition-colors">
            SmartTraffic
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentScreen('landing')}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          Home
        </button>
      </header>

      {/* Center Form Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        {currentScreen === 'commuter_login' && (
          <div className="w-full flex justify-center animate-in fade-in zoom-in-95 duration-200">
            <CommuterLoginCard
              onNavigateSignUp={() => {
                setSignupInitialRole('commuter')
                setCurrentScreen('signup')
              }}
              onNavigateBack={() => setCurrentScreen('landing')}
            />
          </div>
        )}

        {currentScreen === 'planner_login' && (
          <div className="w-full flex justify-center animate-in fade-in zoom-in-95 duration-200">
            <PlannerLoginCard
              onNavigateSignUp={() => {
                setSignupInitialRole('planner')
                setCurrentScreen('signup')
              }}
              onNavigateBack={() => setCurrentScreen('landing')}
            />
          </div>
        )}

        {currentScreen === 'signup' && (
          <div className="w-full flex justify-center animate-in fade-in zoom-in-95 duration-200">
            <SignUpCard
              initialRole={signupInitialRole}
              onNavigateLogin={(role) => {
                if (role === 'commuter') setCurrentScreen('commuter_login')
                else setCurrentScreen('planner_login')
              }}
              onNavigateBack={() => setCurrentScreen('landing')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400">
        SmartTraffic Intelligent Mobility System • 2026
      </footer>
    </div>
  )
}
