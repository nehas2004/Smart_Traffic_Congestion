import { NextResponse } from 'next/server'

let cache: any = null
let lastFetch = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  const now = Date.now()
  if (cache && (now - lastFetch) < CACHE_TTL) {
    return NextResponse.json({ ...cache, cached: true })
  }

  const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY
  const WEATHER_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
  const lat = 10.0601, lon = 76.6214

  const date = new Date()
  const result: any = {
    hour: date.getHours(),
    isWeekend: date.getDay() === 0 || date.getDay() === 6 ? 1 : 0,
    weather: { desc: 'Clear', temp: 30, condition: 0 },
    traffic: { currentSpeed: 42, freeFlowSpeed: 48, delay: 6 },
    cached: false
  }

  try {
    const fetches: Promise<any>[] = []

    if (TOMTOM_KEY && TOMTOM_KEY !== 'mock_key') {
      fetches.push(
        fetch(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${TOMTOM_KEY}&point=${lat},${lon}`)
          .then(r => r.json())
          .then(d => {
            const f = d?.flowSegmentData || {}
            result.traffic = {
              currentSpeed: f.currentSpeed || 42,
              freeFlowSpeed: f.freeFlowSpeed || 48,
              delay: Math.max(0, (f.freeFlowSpeed || 48) - (f.currentSpeed || 42))
            }
          }).catch(() => {})
      )
    }

    if (WEATHER_KEY && WEATHER_KEY && WEATHER_KEY.length > 5) {
      fetches.push(
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_KEY}`)
          .then(r => r.json())
          .then(d => {
            const id = d.weather?.[0]?.id || 800
            result.weather = {
              desc: d.weather?.[0]?.main || 'Clear',
              temp: Math.round(d.main?.temp || 30),
              condition: id < 600 ? 1 : id >= 700 && id < 800 ? 2 : 0
            }
          }).catch(() => {})
      )
    }

    await Promise.all(fetches)
  } catch {}

  cache = result
  lastFetch = now
  return NextResponse.json(result)
}
