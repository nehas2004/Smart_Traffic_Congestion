'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/routes')
  }, [router])

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-8 text-slate-500 font-semibold text-sm">
      Redirecting to Route Intelligence...
    </div>
  )
}
