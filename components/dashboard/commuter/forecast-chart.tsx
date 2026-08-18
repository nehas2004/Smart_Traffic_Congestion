'use client'

import { useEffect, useState } from 'react'

export function ForecastChart() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetch('/data/traffic_predictions.json')
      .then(res => res.json())
      .then(d => {
        if(d?.forecast) setData(d.forecast.slice(0, 10)) // show next 10 hours
      })
      .catch(e => console.error(e))
  }, [])

  const maxDelay = Math.max(...data.map(d => d.delay_mins), 10)

  return (
    <div className="flex h-[300px] flex-col rounded-2xl border border-[#e8e0d5] bg-white p-5 shadow-sm">
      <div className="mb-6 flex flex-col">
        <h3 className="font-semibold text-[#2c2825]">Predicted Delay Forecast</h3>
        <p className="text-xs text-[#9e9189]">ML-powered projection (next 10 hrs) for Kothamangalam</p>
      </div>

      <div className="flex flex-1 items-end justify-between gap-2 px-2">
        {data.map((item, i) => {
          const heightPct = Math.max((item.delay_mins / maxDelay) * 100, 5)
          return (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="relative flex w-10 flex-col justify-end overflow-hidden rounded-md bg-[#f5f2ee] h-[150px]">
                <div 
                  className="w-full bg-[#a67c52] opacity-80 transition-all duration-500 ease-out"
                  style={{ height: `${heightPct}%` }}
                  title={`${item.delay_mins} mins`}
                />
              </div>
              <span className="text-[10px] font-medium text-[#9e9189]">
                {item.time.split(' ')[0]}
              </span>
            </div>
          )
        })}
        {data.length === 0 && (
          <div className="flex w-full items-center justify-center h-full text-sm text-[#9e9189]">Loading forecast...</div>
        )}
      </div>
    </div>
  )
}
