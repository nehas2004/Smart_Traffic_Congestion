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
              className="flex items-center gap-1 text-xs font-bold text-[#9e9189] hover:text-[#2c2825]"
            >
              <ArrowLeft className="size-3.5" /> Overview
            </Link>
            <span className="text-xs text-[#e8e0d5]">/</span>
            <span className="text-xs font-bold text-[#a67c52]">ML Data Analytics & Models</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#2c2825]">
            Predictive Model Intelligence & Validation
          </h1>
          <p className="mt-0.5 text-xs text-[#9e9189]">
            Linear Regression vs Gradient Boosting vs LSTM accuracy comparison and simulation
          </p>
        </div>

        <Link
          href="/admin/traffic"
          className="flex items-center gap-1.5 rounded-xl bg-[#2c2825] px-4 py-2 text-xs font-bold text-[#faf8f5] shadow-sm hover:bg-[#1e1b18]"
        >
          View Congestion Map
        </Link>
      </div>

      <AnalyticsPanel />
    </main>
  )
}
