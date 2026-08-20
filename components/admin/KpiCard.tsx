'use client'

import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  unit?: string
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  status?: 'good' | 'warning' | 'critical' | 'neutral'
  description?: string
  icon: LucideIcon
}

export function KpiCard({
  title,
  value,
  unit,
  change,
  trend,
  status = 'neutral',
  description,
  icon: Icon,
}: KpiCardProps) {
  const getBorderColor = () => {
    switch (status) {
      case 'critical':
        return 'border-rose-300 bg-rose-50/40'
      case 'warning':
        return 'border-amber-300 bg-amber-50/40'
      case 'good':
        return 'border-emerald-300 bg-emerald-50/40'
      default:
        return 'border-[#e8e0d5] bg-white'
    }
  }

  return (
    <div className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-all ${getBorderColor()}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">
            {title}
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black tracking-tight text-[#2c2825]">
              {value}
            </span>
            {unit && (
              <span className="text-sm font-semibold text-[#9e9189]">
                {unit}
              </span>
            )}
          </div>
        </div>

        <div className="flex size-10 items-center justify-center rounded-xl bg-[#2c2825] text-[#c8a97e] shadow-xs">
          <Icon className="size-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#f0ece7] pt-3 text-xs">
        <span className="text-[11px] text-[#9e9189]">{description || 'Live system telemetry'}</span>
        {change && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trend === 'up'
                ? 'bg-rose-100 text-rose-800'
                : trend === 'down'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-[#f5f2ee] text-[#9e9189]'
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  )
}
