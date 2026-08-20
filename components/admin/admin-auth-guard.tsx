'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getStoredUser, FlowcastUser, signOutUser } from '@/lib/auth'
import { ShieldAlert, Lock, ArrowRight, Car, Building2, LogOut, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<FlowcastUser | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const current = getStoredUser()
    setUser(current)
    setChecking(false)
  }, [pathname])

  if (checking) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-[#2c2825] border-t-transparent" />
        <p className="text-xs font-semibold text-[#9e9189]">Verifying City Planner Security Token...</p>
      </div>
    )
  }

  // If not authenticated or role is commuter
  const isAuthorized = user && (user.role === 'planner' || user.role === 'admin')

  if (!isAuthorized) {
    const isCommuter = user?.role === 'commuter'

    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#e8e0d5] bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
            <Lock className="size-7 text-[#a67c52]" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f2ee] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#9e9189] mb-3">
            <ShieldAlert className="size-3.5 text-amber-600" />
            Restricted Admin Perimeter
          </div>

          <h2 className="text-xl font-black text-[#2c2825] tracking-tight">
            {isCommuter ? 'Commuter Access Restricted' : 'City Planner Authentication Required'}
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-[#9e9189]">
            {isCommuter
              ? `You are currently logged in with a Commuter account (${user?.email || 'commuter'}). Access to real-time traffic signal overrides, ML model pipelines, and city decision tools requires City Planner / Admin authorization.`
              : 'You must be authenticated as a City Planner to view real-time traffic control operations, decision support feeds, and model analytics.'}
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/"
              onClick={() => signOutUser()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2c2825] px-4 py-3 text-xs font-bold text-[#faf8f5] shadow-md transition-all hover:bg-[#1e1b18]"
            >
              <Building2 className="size-4 text-[#c8a97e]" />
              Sign In as City Planner
              <ArrowRight className="size-3.5" />
            </Link>

            {isCommuter && (
              <Link
                href="/search"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e8e0d5] bg-[#f5f2ee] px-4 py-2.5 text-xs font-semibold text-[#2c2825] transition-all hover:bg-[#ebe6e0]"
              >
                <Car className="size-3.5 text-[#9e9189]" />
                Return to Commuter Portal (/search)
              </Link>
            )}
          </div>

          <div className="mt-6 border-t border-[#f0ece7] pt-4 text-[11px] text-[#9e9189]">
            <span>Need quick access? Return to login and select <strong>"City Planner"</strong> role.</span>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
