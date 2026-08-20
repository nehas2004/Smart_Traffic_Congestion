'use client'

import { AnalyticsPanel } from '@/components/admin/AnalyticsPanel'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminAnalyticsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="size-3.5" /> Overview
            </Link>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs font-bold text-emerald-700">ML Data Analytics & Models</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Predictive Model Intelligence & Validation
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Linear Regression vs Gradient Boosting vs LSTM accuracy comparison and simulation
          </p>
        </div>

        <Link
          href="/admin/traffic"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 transition-all cursor-pointer"
        >
          View Congestion Map
        </Link>
      </div>

      <AnalyticsPanel />
    </main>
  )
}
