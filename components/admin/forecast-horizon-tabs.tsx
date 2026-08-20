'use client'

export type ForecastHorizon = '1h' | '3h' | '6h'

const horizons: ForecastHorizon[] = ['1h', '3h', '6h']

interface ForecastHorizonTabsProps {
  value: ForecastHorizon
  onChange: (horizon: ForecastHorizon) => void
}

export function ForecastHorizonTabs({ value, onChange }: ForecastHorizonTabsProps) {
  return (
    <div
      className="inline-flex rounded-xl border border-[#e8e0d5] bg-[#f5f2ee] p-1"
      aria-label="Forecast horizon"
    >
      {horizons.map((horizon) => (
        <button
          key={horizon}
          type="button"
          onClick={() => onChange(horizon)}
          aria-pressed={value === horizon}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
            value === horizon
              ? 'bg-[#2c2825] text-[#faf8f5] shadow-sm'
              : 'text-[#6b625b] hover:bg-white hover:text-[#2c2825]'
          }`}
        >
          {horizon}
        </button>
      ))}
    </div>
  )
}
