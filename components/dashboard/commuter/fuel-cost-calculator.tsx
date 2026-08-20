'use client'

import React, { useState } from 'react'
import { Fuel, Calculator, IndianRupee, Gauge, MapPin, Sparkles } from 'lucide-react'

/**
 * Fuel Cost Calculator core function.
 * Formula:
 *  fuel_required = distance_km / mileage_kmpl
 *  fuel_cost = fuel_required * fuel_price_per_litre
 * Returns only the fuel cost rounded to 2 decimal places with currency symbol (e.g. "₹327.15")
 */
export function calculateFuelCost(
  distance_km: number,
  mileage_kmpl: number,
  fuel_price_per_litre: number
): string {
  if (mileage_kmpl <= 0 || distance_km <= 0 || fuel_price_per_litre <= 0) {
    return '₹0.00'
  }
  const fuel_required = distance_km / mileage_kmpl
  const fuel_cost = fuel_required * fuel_price_per_litre
  return `₹${fuel_cost.toFixed(2)}`
}

interface FuelCostCalculatorProps {
  initialDistance?: number
  initialMileage?: number
  initialFuelPrice?: number
  className?: string
}

export function FuelCostCalculator({
  initialDistance = 45.0,
  initialMileage = 15.0,
  initialFuelPrice = 106.50,
  className = '',
}: FuelCostCalculatorProps) {
  const [distanceKm, setDistanceKm] = useState<number | string>(initialDistance)
  const [mileageKmpl, setMileageKmpl] = useState<number | string>(initialMileage)
  const [fuelPrice, setFuelPrice] = useState<number | string>(initialFuelPrice)

  const distNum = typeof distanceKm === 'number' ? distanceKm : parseFloat(distanceKm) || 0
  const mileageNum = typeof mileageKmpl === 'number' ? mileageKmpl : parseFloat(mileageKmpl) || 0
  const priceNum = typeof fuelPrice === 'number' ? fuelPrice : parseFloat(fuelPrice) || 0

  const fuelCostOutput = calculateFuelCost(distNum, mileageNum, priceNum)
  const fuelRequired = mileageNum > 0 ? (distNum / mileageNum).toFixed(2) : '0.00'

  // Vehicle mileage presets
  const presets = [
    { label: 'Bike / Scooter', mileage: 45, icon: '🛵' },
    { label: 'Hatchback / Sedan', mileage: 16, icon: '🚗' },
    { label: 'SUV / Diesel', mileage: 12, icon: '🚙' },
    { label: 'Auto / Van', mileage: 22, icon: '🛺' },
  ]

  // Fuel price presets
  const fuelTypes = [
    { label: 'Petrol', price: 106.50 },
    { label: 'Diesel', price: 95.80 },
    { label: 'CNG (kg)', price: 84.50 },
  ]

  return (
    <div className={`flex flex-col rounded-2xl border border-[#e8e0d5] bg-white p-5 shadow-sm ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-[#2c2825] text-[#c8a97e]">
            <Fuel className="size-4" />
          </div>
          <div>
            <h3 className="font-bold text-[#2c2825] text-base leading-tight">Fuel Cost Calculator</h3>
            <p className="text-xs text-[#9e9189]">Instant commute trip expense estimate</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold text-[#a67c52] bg-[#f5f2ee] border border-[#e8e0d5] px-2.5 py-1 rounded-full uppercase tracking-wider">
          <Sparkles className="size-3" /> Live
        </span>
      </div>

      {/* Result Display Banner */}
      <div className="mb-5 rounded-2xl bg-gradient-to-br from-[#2c2825] to-[#1c1917] p-4 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-10 text-white pointer-events-none">
          <Fuel className="size-28" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#c8a97e]">Estimated Fuel Cost</span>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-0.5">
              {fuelCostOutput}
            </div>
          </div>
          <div className="text-right border-l border-white/10 pl-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fuel Needed</span>
            <div className="text-lg font-extrabold text-[#e8e0d5]">
              {fuelRequired} <span className="text-xs font-medium text-[#c8a97e]">Litres</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="flex flex-col gap-3.5">
        {/* Distance Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[#2c2825] flex items-center gap-1.5">
              <MapPin className="size-3.5 text-[#a67c52]" /> Trip Distance (km)
            </label>
            <span className="text-slate-400 font-medium">{distNum} km</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.5"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="e.g. 45"
              className="h-10 w-full rounded-xl border border-[#e8e0d5] bg-[#faf8f5] px-3.5 text-sm font-semibold text-[#2c2825] placeholder:text-slate-400 focus:bg-white focus:border-[#a67c52] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/20 transition-all"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              km
            </span>
          </div>
        </div>

        {/* Vehicle Mileage Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[#2c2825] flex items-center gap-1.5">
              <Gauge className="size-3.5 text-[#a67c52]" /> Vehicle Mileage (km/L)
            </label>
            <span className="text-slate-400 font-medium">{mileageNum} km/L</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0.1"
              step="0.5"
              value={mileageKmpl}
              onChange={(e) => setMileageKmpl(e.target.value)}
              placeholder="e.g. 15"
              className="h-10 w-full rounded-xl border border-[#e8e0d5] bg-[#faf8f5] px-3.5 text-sm font-semibold text-[#2c2825] placeholder:text-slate-400 focus:bg-white focus:border-[#a67c52] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/20 transition-all"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              km/L
            </span>
          </div>

          {/* Quick Vehicle Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMileageKmpl(p.mileage)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  mileageNum === p.mileage
                    ? 'bg-[#2c2825] text-[#c8a97e] border-[#2c2825] shadow-xs'
                    : 'bg-[#faf8f5] text-slate-600 border-[#e8e0d5] hover:bg-[#f5f2ee] hover:text-[#2c2825]'
                }`}
              >
                <span>{p.icon}</span>
                <span className="truncate">{p.mileage} km/L</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fuel Price Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[#2c2825] flex items-center gap-1.5">
              <IndianRupee className="size-3.5 text-[#a67c52]" /> Fuel Price (₹/Litre)
            </label>
            <span className="text-slate-400 font-medium">₹{priceNum}/L</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.1"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
              placeholder="e.g. 106.50"
              className="h-10 w-full rounded-xl border border-[#e8e0d5] bg-[#faf8f5] px-3.5 text-sm font-semibold text-[#2c2825] placeholder:text-slate-400 focus:bg-white focus:border-[#a67c52] focus:outline-none focus:ring-2 focus:ring-[#a67c52]/20 transition-all"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              ₹/L
            </span>
          </div>

          {/* Quick Fuel Type Presets */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {fuelTypes.map((ft, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setFuelPrice(ft.price)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  priceNum === ft.price
                    ? 'bg-[#2c2825] text-[#c8a97e] border-[#2c2825] shadow-xs'
                    : 'bg-[#faf8f5] text-slate-600 border-[#e8e0d5] hover:bg-[#f5f2ee] hover:text-[#2c2825]'
                }`}
              >
                <span>₹{ft.price}</span>
                <span className="text-[10px] opacity-75">({ft.label.split(' ')[0]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
