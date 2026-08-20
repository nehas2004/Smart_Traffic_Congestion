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
        <div className="size-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <p className="text-xs font-semibold text-slate-400">Verifying City Planner Security Token...</p>
      </div>
    )
  }

  // If not authenticated or role is commuter
  const isAuthorized = user && (user.role === 'planner' || user.role === 'admin')

  if (!isAuthorized) {
    const isCommuter = user?.role === 'commuter'

    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Lock className="size-7 text-emerald-600" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            <ShieldAlert className="size-3.5 text-emerald-600" />
            Restricted Admin Perimeter
          </div>

          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {isCommuter ? 'Commuter Access Restricted' : 'City Planner Authentication Required'}
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {isCommuter
              ? `You are currently logged in with a Commuter account (${user?.email || 'commuter'}). Access to real-time traffic signal overrides, ML model pipelines, and city decision tools requires City Planner / Admin authorization.`
              : 'You must be authenticated as a City Planner to view real-time traffic control operations, decision support feeds, and model analytics.'}
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/"
              onClick={() => signOutUser()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700"
            >
              <Building2 className="size-4 text-white" />
              Sign In as City Planner
              <ArrowRight className="size-3.5" />
            </Link>

            {isCommuter && (
              <Link
                href="/search"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 transition-all hover:bg-slate-100"
              >
                <Car className="size-3.5 text-slate-400" />
                Return to Commuter Portal (/search)
              </Link>
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
            <span>Need quick access? Return to login and select <strong>"City Planner"</strong> role.</span>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
