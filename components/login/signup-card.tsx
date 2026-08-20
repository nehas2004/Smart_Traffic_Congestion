'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { CityIllustration } from './city-illustration'
import { supabase } from '@/lib/supabase'

interface SignUpCardProps {
  initialRole?: 'commuter' | 'planner'
  onNavigateLogin?: (role: 'commuter' | 'planner') => void
  onNavigateBack?: () => void
}

export function SignUpCard({
  initialRole = 'commuter',
  onNavigateLogin,
  onNavigateBack,
}: SignUpCardProps) {
  const router = useRouter()
  const [role, setRole] = useState<'commuter' | 'planner'>(initialRole)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isPlanner = role === 'planner'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!supabase) {
      setTimeout(() => {
        setSuccess(`Account registered as ${isPlanner ? 'City Planner' : 'Commuter'}! Redirecting...`)
        setTimeout(() => {
          router.push(isPlanner ? '/admin/traffic' : '/routes')
        }, 600)
      }, 500)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (data.session) {
        setSuccess('Account created successfully! Loading your dashboard...')
        setTimeout(() => router.push(role === 'commuter' ? '/routes' : '/admin/traffic'), 600)
      } else {
        setSuccess('Account created! Please check your email for a verification confirmation.')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[840px] bg-white rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.12),0_8px_16px_-4px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col transition-all duration-300">
      {/* Split Grid: Left Form, Right Hero Vector Illustration */}
      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Left Column: Form */}
        <div className="md:col-span-6 p-7 sm:p-8 flex flex-col justify-between gap-5">
          {/* Top Row: Back button & Header */}
          <div className="flex flex-col gap-2">
            {onNavigateBack && (
              <button
                type="button"
                onClick={onNavigateBack}
                className="self-start flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 leading-tight">
              Create Your Account
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-normal">
              Join SmartTraffic today!
            </p>
          </div>

          {/* Status Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <div className="flex-1 font-medium">{success}</div>
            </div>
          )}

          {/* Role Switcher */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">I am a</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRole('commuter')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  role === 'commuter'
                    ? 'bg-[#4834d4] text-white shadow-sm ring-2 ring-indigo-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Commuter
              </button>

              <button
                type="button"
                onClick={() => setRole('planner')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  role === 'planner'
                    ? 'bg-[#15803d] text-white shadow-sm ring-2 ring-emerald-200'
                    : 'bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#166534]'
                }`}
              >
                City Planner
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-10.5 w-full pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#4834d4] focus:ring-3 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-10.5 w-full pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#4834d4] focus:ring-3 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="h-10.5 w-full pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#4834d4] focus:ring-3 focus:ring-indigo-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`h-11.5 mt-2 w-full rounded-xl text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 ${
                isPlanner
                  ? 'bg-[#15803d] hover:bg-[#166534] shadow-emerald-700/20'
                  : 'bg-[#4834d4] hover:bg-[#3b27b3] shadow-indigo-600/20'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center text-xs text-slate-500 font-medium">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigateLogin?.(role)}
              className="text-[#4834d4] hover:text-[#3b27b3] font-bold hover:underline cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>

        {/* Right Column: Hero Vector Illustration */}
        <div className="hidden md:block md:col-span-6 p-3">
          <CityIllustration className="h-full min-h-[500px]" />
        </div>
      </div>
    </div>
  )
}
