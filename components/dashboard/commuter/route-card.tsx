'use client'

import { useEffect, useState } from 'react'
import { Navigation } from 'lucide-react'

export function RouteCard({ liveContext }: { liveContext: any }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/data/traffic_predictions.json')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(e => console.error(e))
  }, [])

  const firstForecast = data?.forecast?.[0]
  
  const delay = liveContext.traffic.delay
  const speed = liveContext.traffic.currentSpeed
  
  const baseTime = 25
  const totalTime = baseTime + delay

  return (
    <div className="flex flex-col rounded-2xl border border-[#e8e0d5] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-[#2c2825]">Your Commute</h3>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-widest">
              <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
              Live Context
          </span>
          <Navigation className="size-4 text-[#a67c52]" />
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-1">
        <div className="text-3xl font-extrabold tracking-tight text-[#2c2825]">
          {Math.round(totalTime)} min
        </div>
        <p className="text-sm text-[#9e9189]">
          Home to Office &middot; via Kothamangalam
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-xl bg-[#f5f2ee] p-3 text-sm">
        <div className="flex flex-1 flex-col border-r border-[#e8e0d5] pr-4">
          <span className="text-[#9e9189]">Avg Speed</span>
          <span className="font-bold text-[#2c2825]">{Math.round(speed)} mph</span>
        </div>
        <div className="flex flex-1 flex-col pl-2">
          <span className="text-[#9e9189]">Est. Delay</span>
          <span className={`font-bold ${delay > 5 ? 'text-red-500' : 'text-[#a67c52]'}`}>
            +{Math.round(delay)} min
          </span>
        </div>
      </div>
    </div>
  )
}
