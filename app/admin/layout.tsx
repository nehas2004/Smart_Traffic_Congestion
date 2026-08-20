'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AICopilotDrawer } from '@/components/admin/ai-copilot-drawer'
import { supabase } from '@/lib/supabase'
import { Loader2, ShieldAlert } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function checkAdminAuth() {
      if (!supabase) {
        if (isMounted) {
          router.replace('/?role=planner')
        }
        return
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session || !session.user) {
          if (isMounted) {
            router.replace('/?role=planner')
          }
          return
        }

        const role = session.user.user_metadata?.role
        if (role !== 'planner') {
          // Deny access for commuters or other non-planner accounts
          await supabase.auth.signOut()
          if (isMounted) {
            router.replace('/?role=planner')
          }
          return
        }

        if (isMounted) {
          setIsAuthorized(true)
          setCheckingAuth(false)
        }
      } catch (err) {
        if (isMounted) {
          router.replace('/?role=planner')
        }
      }
    }

    checkAdminAuth()

    // Listen to session changes
    const {
      data: { subscription },
    } = supabase
      ? supabase.auth.onAuthStateChange((event, session) => {
          if (!session || session.user?.user_metadata?.role !== 'planner') {
            setIsAuthorized(false)
            router.replace('/?role=planner')
          }
        })
      : { data: { subscription: { unsubscribe: () => {} } } }

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  if (checkingAuth || !isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
            <ShieldAlert className="size-6" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-extrabold text-slate-900">
              Verifying City Planner Credentials
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Authenticating session with Traffic Operations Center...
            </p>
          </div>
          <Loader2 className="size-5 animate-spin text-emerald-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 font-sans antialiased">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden transition-all duration-300">
        {children}
      </div>
      <AICopilotDrawer />
    </div>
  )
}
