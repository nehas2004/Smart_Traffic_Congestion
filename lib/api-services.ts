export async function getLiveContext() {
  const TOMTOM_API_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'mock_key'
  
  // Kothamangalam coordinates
  const lat = 10.0601
  const lon = 76.6214

  // Live Calendar Logic
  const now = new Date()
  const hour = now.getHours()
  const isWeekend = now.getDay() === 0 || now.getDay() === 6 ? 1 : 0

  let liveContext = {
    hour,
    isWeekend,
    weather: { condition: 0, temp: 30, desc: 'Clear' }, // default Clear
    traffic: { currentSpeed: 42, freeFlowSpeed: 48, delay: 6 },
    incidents: [
      { location: 'MC Road Junction (Kothamangalam)', severity: 'High', delay: 12, trend: 'worsening' }
    ]
  }

  if (TOMTOM_API_KEY === 'mock_key') {
    return liveContext
  }

  try {
    const [trafficRes, weatherRes] = await Promise.all([
      fetch(
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${TOMTOM_API_KEY}&point=${lat},${lon}`,
        { next: { revalidate: 60 } }
      ),
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
        { next: { revalidate: 300 } }
      )
    ])

    if (trafficRes.ok) {
      const trafficData = await trafficRes.json()
      const flow = trafficData?.flowSegmentData || {}
      liveContext.traffic = {
        currentSpeed: flow.currentSpeed || 42,
        freeFlowSpeed: flow.freeFlowSpeed || 48,
        delay: Math.max(0, (flow.freeFlowSpeed || 48) - (flow.currentSpeed || 42))
      }
    }

    if (weatherRes.ok) {
      const weatherData = await weatherRes.json()
      const w = weatherData.current_weather || {}
      const code = w.weathercode || 0
      
      let condition = 0
      let desc = 'Clear'
      if (code >= 50) { condition = 1; desc = 'Rain/Bad Weather' }
      else if (code === 45 || code === 48) { condition = 2; desc = 'Fog' }
      else if (code > 0) desc = 'Cloudy'

      liveContext.weather = {
        condition,
        temp: Math.round(w.temperature || 30),
        desc
      }
    }
  } catch (error) {
    console.error("Error fetching live APIs:", error)
  }

  return liveContext
}

export interface HourlyForecastPoint {
  hour: number
  timeLabel: string
  time24: string
  periodName: string
  tti: number
  predictedSpeed: number
  baseDurationMins: number
  predictedDurationMins: number
  delayMins: number
  severity: 'free' | 'moderate' | 'slow' | 'heavy'
  severityColor: string
  weatherRainMm: number
  isCurrentHour: boolean
  isPeakHour: boolean
}

/**
 * Generates an hour-by-hour (00:00 to 23:00) 24-hour predictive congestion forecast curve
 * calibrated specifically for the selected corridor distance, baseline travel time, and weather shocks.
 */
export function generate24HourRouteForecast(
  distanceKm: number,
  baseMins: number,
  isWeekend: boolean = false,
  weatherRainHourly?: number[]
): HourlyForecastPoint[] {
  const currentHour = new Date().getHours()
  const dist = Math.max(1, distanceKm || 45)
  const freeFlowBase = Math.max(1, baseMins || Math.round((dist / 38) * 60))
  const freeFlowSpeedKmh = Math.max(20, Math.round(dist / (freeFlowBase / 60)))

  const points: HourlyForecastPoint[] = []

  for (let h = 0; h < 24; h++) {
    // 1. Time-of-day Congestion Multiplier C(h)
    let baseTti = 1.00
    let periodName = 'Night (Off-Peak)'
    let isPeak = false

    if (h >= 0 && h <= 5) {
      // Night (00:00 - 05:59): Free flow
      baseTti = 1.00 + (h === 5 ? 0.05 : 0.0)
      periodName = 'Late Night Flow'
    } else if (h === 6 || h === 7) {
      // Early morning ramp-up (06:00 - 07:59)
      baseTti = h === 6 ? 1.10 : 1.28
      periodName = 'Morning Buildup'
    } else if (h >= 8 && h <= 10) {
      // Morning Peak (08:00 - 10:59): School, office & bus rush
      baseTti = isWeekend
        ? (h === 10 ? 1.40 : 1.25)
        : (h === 9 ? 1.68 : h === 8 ? 1.55 : 1.48)
      periodName = 'Morning Peak Rush'
      isPeak = true
    } else if (h >= 11 && h <= 15) {
      // Midday (11:00 - 15:59): Steady flow & commercial deliveries
      baseTti = h === 13 ? 1.20 : 1.26
      periodName = 'Midday Commercial Flow'
    } else if (h >= 16 && h <= 19) {
      // Evening Peak (16:00 - 19:59): Market rush, evening commuters & town center jams
      baseTti = isWeekend
        ? (h === 18 ? 1.75 : 1.60)
        : (h === 17 ? 1.82 : h === 18 ? 1.95 : h === 19 ? 1.68 : 1.52)
      periodName = 'Evening Peak Congestion'
      isPeak = true
    } else if (h >= 20 && h <= 21) {
      // Late Evening (20:00 - 21:59): Tapering rush
      baseTti = h === 20 ? 1.28 : 1.18
      periodName = 'Evening Taper'
    } else {
      // Night (22:00 - 23:59): Open highway
      baseTti = h === 22 ? 1.08 : 1.02
      periodName = 'Night Flow'
    }

    // 2. Weather shock impact: If rain >= 1.5 mm, add +20% to TTI
    const rainMm = weatherRainHourly && weatherRainHourly[h] !== undefined ? weatherRainHourly[h] : 0
    if (rainMm > 2.0) {
      baseTti = baseTti * 1.20
    } else if (rainMm > 0.5) {
      baseTti = baseTti * 1.08
    }

    // 3. Compute predicted travel time and delay
    const predictedDurationMins = Math.max(freeFlowBase, Math.round(freeFlowBase * baseTti))
    let delayMins = Math.max(0, predictedDurationMins - freeFlowBase)
    
    // Add extra rain delay buffer if rain is severe
    if (rainMm > 2.0 && delayMins < 4) {
      delayMins += 4
    }

    const predictedSpeed = Math.max(12, Math.round(dist / ((freeFlowBase + delayMins) / 60)))

    // 4. Categorize Severity
    let severity: 'free' | 'moderate' | 'slow' | 'heavy' = 'free'
    let severityColor = '#10b981' // emerald/green

    if (baseTti > 1.70 || delayMins >= 17) {
      severity = 'heavy'
      severityColor = '#ef4444' // red
    } else if (baseTti > 1.40 || delayMins >= 10) {
      severity = 'slow'
      severityColor = '#f97316' // orange
    } else if (baseTti > 1.15 || delayMins >= 4) {
      severity = 'moderate'
      severityColor = '#eab308' // yellow
    }

    // Formatting 12-hour and 24-hour labels
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    const timeLabel = `${h12} ${ampm}`
    const time24 = `${String(h).padStart(2, '0')}:00`

    points.push({
      hour: h,
      timeLabel,
      time24,
      periodName,
      tti: Number(baseTti.toFixed(2)),
      predictedSpeed,
      baseDurationMins: freeFlowBase,
      predictedDurationMins: freeFlowBase + delayMins,
      delayMins,
      severity,
      severityColor,
      weatherRainMm: rainMm,
      isCurrentHour: h === currentHour,
      isPeakHour: isPeak,
    })
  }

  return points
}

