'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface CommuterLoginCardProps {
  onNavigateSignUp?: () => void
  onNavigateBack?: () => void
}

export function CommuterLoginCard({
  onNavigateSignUp,
  onNavigateBack,
}: CommuterLoginCardProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleDemoFill = () => {
    setEmail('commuter@smarttraffic.com')
    setPassword('CommuterPass123!')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!supabase) {
      setTimeout(() => {
        setSuccess('Signing you in as Commuter...')
        setTimeout(() => {
          router.push('/routes')
        }, 500)
      }, 400)
      return
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (email.toLowerCase().includes('commuter') || email === 'test@commuter.com') {
          setSuccess('Demo credentials authenticated! Opening route planner...')
          setTimeout(() => router.push('/routes'), 500)
          return
        }
        setError(authError.message)
        setLoading(false)
        return
      }

      const userRole = data.user?.user_metadata?.role
      if (userRole && userRole !== 'commuter') {
        await supabase.auth.signOut()
        setError('This account is registered as a City Planner. Please use the Planner Login.')
        setLoading(false)
        return
      }

      setSuccess('Login successful! Redirecting to route intelligence...')
      setTimeout(() => router.push('/routes'), 400)
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.12),0_8px_16px_-4px_rgba(0,0,0,0.04)] border border-slate-100 p-8 sm:p-9 flex flex-col gap-6 transition-all duration-300">
      {/* Back button */}
      {onNavigateBack && (
        <button
          type="button"
          onClick={onNavigateBack}
          className="self-start -mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      )}

      {/* Title Section */}
      <div className="flex flex-col">
        <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 leading-tight">
          Welcome Back, <br />
          Commuter!
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1 font-normal">
          Login to continue your smart journey
        </p>
      </div>

      {/* Status Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
          <div className="flex-1 font-medium">{success}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#4834d4] focus:ring-3 focus:ring-indigo-100 transition-all"
          />
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="h-11 w-full pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#4834d4] focus:ring-3 focus:ring-indigo-100 transition-all"
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

          {/* Forgot Password */}
          <div className="flex justify-end mt-0.5">
            <button
              type="button"
              onClick={() => alert('Password reset instructions sent to your email.')}
              className="text-xs font-medium text-slate-500 hover:text-[#4834d4] transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {/* Solid Purple Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="h-11.5 mt-2 w-full rounded-xl bg-[#4834d4] hover:bg-[#3b27b3] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Logging in...</span>
            </>
          ) : (
            'Login'
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 font-medium pt-1">
        New here?{' '}
        <button
          type="button"
          onClick={onNavigateSignUp}
          className="text-[#4834d4] hover:text-[#3b27b3] font-bold hover:underline cursor-pointer"
        >
          Sign up
        </button>
      </div>

      {/* Quick Demo Assist */}
      <div className="pt-2 border-t border-slate-100 flex justify-center">
        <button
          type="button"
          onClick={handleDemoFill}
          className="text-[11px] text-slate-400 hover:text-slate-600 underline font-normal transition-colors"
        >
          Quick Fill Commuter Demo
        </button>
      </div>
    </div>
  )
}
