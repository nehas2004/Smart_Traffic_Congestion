'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface ManeuverInstruction {
  id: number
  message: string
  street?: string
  maneuver: string
  distanceToManeuverMeters: number
  point: { latitude: number; longitude: number }
  turnAngleInDecimalDegrees?: number
}

export interface NavigationState {
  isNavigating: boolean
  isSimulating: boolean
  currentPosition: { lat: number; lon: number; heading: number; speedKmh: number } | null
  currentManeuver: ManeuverInstruction | null
  nextManeuver: ManeuverInstruction | null
  distanceToNextManeuverMeters: number
  remainingDistanceMeters: number
  remainingDurationSeconds: number
  etaString: string
  currentSpeedKmh: number
  isOffRoute: boolean
  routeCoordinates: [number, number][]
  maneuvers: ManeuverInstruction[]
}

// Haversine distance in meters
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate bearing/heading from pt1 to pt2 (0-360 degrees)
export function getBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180)
  const b = (Math.atan2(y, x) * 180) / Math.PI
  return (b + 360) % 360
}

// Find closest point distance on polyline to check if off-route
export function getMinDistanceToRoute(
  pos: { lat: number; lon: number },
  routePts: [number, number][]
): number {
  if (routePts.length === 0) return 0
  let minDist = Infinity
  for (let i = 0; i < routePts.length; i++) {
    const d = getDistanceMeters(pos.lat, pos.lon, routePts[i][0], routePts[i][1])
    if (d < minDist) minDist = d
  }
  return minDist
}

export function useNavigation(apiKey: string) {
  const [navState, setNavState] = useState<NavigationState>({
    isNavigating: false,
    isSimulating: false,
    currentPosition: null,
    currentManeuver: null,
    nextManeuver: null,
    distanceToNextManeuverMeters: 0,
    remainingDistanceMeters: 0,
    remainingDurationSeconds: 0,
    etaString: '--:--',
    currentSpeedKmh: 0,
    isOffRoute: false,
    routeCoordinates: [],
    maneuvers: [],
  })

  const watchIdRef = useRef<number | null>(null)
  const simIntervalRef = useRef<any>(null)
  const lastPosRef = useRef<{ lat: number; lon: number; heading: number } | null>(null)
  const routePointsRef = useRef<[number, number][]>([])
  const maneuversRef = useRef<ManeuverInstruction[]>([])
  const offRouteCountRef = useRef<number>(0)
  const destinationRef = useRef<{ lat: number; lon: number; name: string } | null>(null)

  // Parse TomTom guidance instructions
  const parseInstructions = useCallback((guidance: any, points: [number, number][]): ManeuverInstruction[] => {
    if (!guidance || !guidance.instructions || guidance.instructions.length === 0) {
      if (points.length < 2) return []
      return [
        {
          id: 0,
          message: 'Head towards destination',
          street: 'Main Highway',
          maneuver: 'STRAIGHT',
          distanceToManeuverMeters: 0,
          point: { latitude: points[0][0], longitude: points[0][1] },
        },
        {
          id: 1,
          message: 'Arrive at destination',
          street: 'Destination',
          maneuver: 'ARRIVE',
          distanceToManeuverMeters: getDistanceMeters(points[0][0], points[0][1], points[points.length - 1][0], points[points.length - 1][1]),
          point: { latitude: points[points.length - 1][0], longitude: points[points.length - 1][1] },
        },
      ]
    }

    return guidance.instructions.map((inst: any, idx: number) => ({
      id: idx,
      message: inst.message || 'Continue on route',
      street: inst.street || '',
      maneuver: (inst.maneuver || 'STRAIGHT').toUpperCase(),
      distanceToManeuverMeters: inst.routeOffsetInMeters || 0,
      point: inst.point || { latitude: 0, longitude: 0 },
      turnAngleInDecimalDegrees: inst.turnAngleInDecimalDegrees,
    }))
  }, [])

  // Start Navigation with a given route object or coordinates
  const startNavigation = useCallback((
    routeData: any,
    destination: { lat: number; lon: number; name: string },
    simulate: boolean = false
  ) => {
    stopNavigation()

    destinationRef.current = destination
    const points: [number, number][] =
      routeData?.legs?.[0]?.points?.map((p: any) => [p.latitude, p.longitude]) || []

    routePointsRef.current = points
    const maneuvers = parseInstructions(routeData?.guidance, points)
    maneuversRef.current = maneuvers

    const summary = routeData?.summary || {}
    const totalDist = summary.lengthInMeters || (points.length * 50)
    const totalDuration = summary.travelTimeInSeconds || Math.round(totalDist / 12)

    const etaDate = new Date(Date.now() + totalDuration * 1000)
    const etaStr = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const startPos = points.length > 0 ? points[0] : [destination.lat, destination.lon]
    const initialHeading =
      points.length > 1 ? getBearing(points[0][0], points[0][1], points[1][0], points[1][1]) : 0

    const initialPos = {
      lat: startPos[0],
      lon: startPos[1],
      heading: initialHeading,
      speedKmh: 35,
    }
    lastPosRef.current = initialPos

    setNavState({
      isNavigating: true,
      isSimulating: simulate,
      currentPosition: initialPos,
      currentManeuver: maneuvers[0] || null,
      nextManeuver: maneuvers[1] || null,
      distanceToNextManeuverMeters: maneuvers[1]?.distanceToManeuverMeters || 250,
      remainingDistanceMeters: totalDist,
      remainingDurationSeconds: totalDuration,
      etaString: etaStr,
      currentSpeedKmh: 35,
      isOffRoute: false,
      routeCoordinates: points,
      maneuvers: maneuvers,
    })

    if (simulate) {
      let ptIndex = 0
      simIntervalRef.current = setInterval(() => {
        if (ptIndex >= points.length - 1) {
          clearInterval(simIntervalRef.current)
          return
        }

        ptIndex = Math.min(ptIndex + 1, points.length - 1)
        const currentPt = points[ptIndex]
        const nextPt = points[Math.min(ptIndex + 1, points.length - 1)]

        const heading = getBearing(currentPt[0], currentPt[1], nextPt[0], nextPt[1])
        const simSpeed = 35 + Math.round(Math.sin(ptIndex * 0.2) * 12)

        updateLivePosition(currentPt[0], currentPt[1], heading, simSpeed)
      }, 1000)
    } else {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude
            let heading = pos.coords.heading
            const speedKmh = pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : 32

            if (heading === null || isNaN(heading)) {
              if (lastPosRef.current) {
                heading = getBearing(
                  lastPosRef.current.lat,
                  lastPosRef.current.lon,
                  lat,
                  lon
                )
              } else {
                heading = 0
              }
            }

            updateLivePosition(lat, lon, heading, speedKmh)
          },
          (err) => {
            console.warn('Geolocation watch error:', err.message)
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000,
          }
        )
      }
    }
  }, [parseInstructions])

  // Update position, calculate progress along maneuvers, and detect off-route
  const updateLivePosition = useCallback((
    lat: number,
    lon: number,
    heading: number,
    speedKmh: number
  ) => {
    lastPosRef.current = { lat, lon, heading }
    const points = routePointsRef.current
    const maneuvers = maneuversRef.current

    if (points.length === 0) return

    // 1. Check if off-route
    const distToRoute = getMinDistanceToRoute({ lat, lon }, points)
    let isOff = false
    if (distToRoute > 70) {
      offRouteCountRef.current += 1
      if (offRouteCountRef.current >= 3) {
        isOff = true
      }
    } else {
      offRouteCountRef.current = 0
    }

    // 2. Find closest point on route to estimate remaining distance
    let closestIdx = 0
    let minD = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = getDistanceMeters(lat, lon, points[i][0], points[i][1])
      if (d < minD) {
        minD = d
        closestIdx = i
      }
    }

    let remainingM = 0
    for (let i = closestIdx; i < points.length - 1; i++) {
      remainingM += getDistanceMeters(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
    }

    const currentSpeed = Math.max(10, speedKmh)
    const remainingSec = Math.round(remainingM / (currentSpeed / 3.6))
    const etaDate = new Date(Date.now() + remainingSec * 1000)
    const etaStr = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    // 3. Find active maneuver
    let currentM: ManeuverInstruction | null = maneuvers[0] || null
    let nextM: ManeuverInstruction | null = maneuvers[1] || null
    let distToNext = 0

    if (maneuvers.length > 0) {
      let activeMIdx = 0
      for (let i = 0; i < maneuvers.length; i++) {
        const mPt = maneuvers[i].point
        if (mPt.latitude && mPt.longitude) {
          const d = getDistanceMeters(lat, lon, mPt.latitude, mPt.longitude)
          if (d <= 40 && i < maneuvers.length - 1) {
            activeMIdx = i + 1
          }
        }
      }
      currentM = maneuvers[activeMIdx] || maneuvers[maneuvers.length - 1]
      nextM = maneuvers[activeMIdx + 1] || null

      if (currentM?.point?.latitude) {
        distToNext = Math.round(
          getDistanceMeters(lat, lon, currentM.point.latitude, currentM.point.longitude)
        )
      } else {
        distToNext = 150
      }
    }

    setNavState((prev) => ({
      ...prev,
      currentPosition: { lat, lon, heading, speedKmh: currentSpeed },
      currentManeuver: currentM,
      nextManeuver: nextM,
      distanceToNextManeuverMeters: distToNext,
      remainingDistanceMeters: Math.round(remainingM),
      remainingDurationSeconds: remainingSec,
      etaString: etaStr,
      currentSpeedKmh: currentSpeed,
      isOffRoute: isOff,
    }))
  }, [])

  // Stop Navigation
  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current)
      simIntervalRef.current = null
    }

    setNavState((prev) => ({
      ...prev,
      isNavigating: false,
      isSimulating: false,
      currentPosition: null,
      isOffRoute: false,
    }))
  }, [])

  useEffect(() => {
    return () => {
      stopNavigation()
    }
  }, [stopNavigation])

  return {
    navState,
    startNavigation,
    stopNavigation,
  }
}
