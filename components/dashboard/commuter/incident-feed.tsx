'use client'

import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

export function IncidentFeed({ liveContext }: { liveContext: any }) {
  const bottlenecks = liveContext.incidents || []

  return (
    <div className="flex flex-col rounded-2xl border border-[#e8e0d5] bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-[#2c2825]">Active Bottlenecks</h3>
      
      <div className="flex flex-col gap-3">
        {bottlenecks.map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-[#e8e0d5] bg-[#f5f2ee] p-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
              <AlertTriangle className={`size-4 ${item.severity === 'High' ? 'text-red-500' : 'text-[#a67c52]'}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#2c2825]">{item.location}</span>
              <div className="flex items-center gap-2 text-xs text-[#9e9189]">
                <span>+{item.delay} min delay</span>
                <span className="opacity-50">&bull;</span>
                <span className="flex items-center gap-1">
                  {item.trend === 'worsening' ? <TrendingUp className="size-3 text-red-500" /> : <TrendingDown className="size-3 text-green-600" />}
                  {item.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
        {bottlenecks.length === 0 && (
          <p className="text-sm text-[#9e9189]">No active bottlenecks detected.</p>
        )}
      </div>
    </div>
  )
}
