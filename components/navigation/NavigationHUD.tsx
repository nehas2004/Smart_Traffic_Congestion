'use client'

import React from 'react'
import { NavigationState } from '@/lib/useNavigation'
import {
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  CornerUpRight,
  CornerUpLeft,
  RotateCcw,
  Flag,
  Volume2,
  VolumeX,
  X,
  Gauge,
  Clock,
  Compass,
  AlertTriangle,
  Play,
  RotateCw,
} from 'lucide-react'

interface NavigationHUDProps {
  navState: NavigationState
  destinationName: string
  onStop: () => void
  onReroute?: () => void
}

export function NavigationHUD({
  navState,
  destinationName,
  onStop,
  onReroute,
}: NavigationHUDProps) {
  const [isMuted, setIsMuted] = React.useState(false)

  if (!navState.isNavigating) return null

  const {
    currentManeuver,
    nextManeuver,
    distanceToNextManeuverMeters,
    remainingDistanceMeters,
    remainingDurationSeconds,
    etaString,
    currentSpeedKmh,
    isOffRoute,
    isSimulating,
  } = navState

  // Format distance
  const formatDist = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${Math.round(meters)} m`
  }

  // Format remaining time
  const formatRemainingTime = (sec: number) => {
    const mins = Math.max(1, Math.round(sec / 60))
    if (mins >= 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return `${h} hr ${m} min`
    }
    return `${mins} min`
  }

  // Select maneuver icon
  const getManeuverIcon = (maneuverType?: string) => {
    const m = (maneuverType || '').toUpperCase()
    if (m.includes('LEFT')) return <CornerUpLeft className="size-8 text-white" />
    if (m.includes('RIGHT')) return <CornerUpRight className="size-8 text-white" />
    if (m.includes('ROUNDABOUT')) return <RotateCw className="size-8 text-white" />
    if (m.includes('U_TURN')) return <RotateCcw className="size-8 text-white" />
    if (m.includes('ARRIVE')) return <Flag className="size-8 text-emerald-400" />
    return <ArrowUp className="size-8 text-white" />
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] flex flex-col justify-between p-4 font-sans">
      {/* ── TOP TURN-BY-TURN GUIDANCE BANNER (Google Maps Style) ── */}
      <div className="pointer-events-auto flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-600/30 bg-[#0f172a]/95 p-4 text-white shadow-2xl backdrop-blur-lg">
          <div className="flex items-center gap-4">
            {/* Big Maneuver Icon */}
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 shadow-md">
              {getManeuverIcon(currentManeuver?.maneuver)}
            </div>

            {/* Instruction text & countdown */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-emerald-400">
                  {formatDist(distanceToNextManeuverMeters)}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {currentManeuver?.maneuver?.replace(/_/g, ' ') || 'PROCEED'}
                </span>
              </div>
              <p className="text-base font-extrabold leading-tight text-white line-clamp-1">
                {currentManeuver?.street || currentManeuver?.message || 'Follow highlighted route'}
              </p>
              {nextManeuver && (
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                  Then: {nextManeuver.message}
                </p>
              )}
            </div>
          </div>

          {/* Quick controls: Sound Mute & End */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="flex size-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              title={isMuted ? 'Unmute voice' : 'Mute voice'}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <button
              type="button"
              onClick={onStop}
              className="flex size-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md hover:bg-red-700"
              title="Exit Navigation"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Off Route Re-routing Notification */}
        {isOffRoute && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500 bg-amber-950/90 px-4 py-2.5 text-amber-200 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold">
              <AlertTriangle className="size-4 text-amber-400 animate-bounce" />
              <span>You have deviated from route. Recalculating...</span>
            </div>
            {onReroute && (
              <button
                type="button"
                onClick={onReroute}
                className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                Reroute Now
              </button>
            )}
          </div>
        )}

        {/* Simulation indicator */}
        {isSimulating && (
          <div className="self-start rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>GPS Simulation Mode (Driving Test)</span>
          </div>
        )}
      </div>

      {/* ── BOTTOM COCKPIT & LIVE METRICS BAR ── */}
      <div className="pointer-events-auto flex items-center justify-between gap-4 rounded-2xl border border-slate-700/60 bg-[#0f172a]/95 p-4 text-white shadow-2xl backdrop-blur-lg">
        {/* Speedometer */}
        <div className="flex items-center gap-3 border-r border-slate-700/80 pr-4">
          <div className="flex size-12 items-center justify-center rounded-full border-2 border-emerald-500 bg-slate-900 font-mono text-xl font-black text-emerald-400">
            {currentSpeedKmh}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Speed</span>
            <span className="text-xs font-bold text-white">km/h</span>
          </div>
        </div>

        {/* ETA & Distance to Destination */}
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black text-emerald-400">
              {formatRemainingTime(remainingDurationSeconds)}
            </span>
            <span className="text-xs font-bold text-slate-300">
              · {formatDist(remainingDistanceMeters)}
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="size-3 text-slate-400" />
            <span>Estimated arrival at <strong>{etaString}</strong></span>
          </p>
        </div>

        {/* End Navigation Action Button */}
        <button
          type="button"
          onClick={onStop}
          className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-extrabold text-white shadow-lg transition-all hover:bg-red-700 active:scale-95"
        >
          <X className="size-4" />
          <span>Exit</span>
        </button>
      </div>
    </div>
  )
}
