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

    fetches.push(
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
        .then(r => r.json())
        .then(d => {
          const w = d.current_weather || {}
          const code = w.weathercode || 0
          
          let condition = 0
          let desc = 'Clear'
          if (code >= 50) { condition = 1; desc = 'Rain/Bad Weather' }
          else if (code === 45 || code === 48) { condition = 2; desc = 'Fog' }
          else if (code > 0) desc = 'Cloudy'

          result.weather = {
            desc,
            temp: Math.round(w.temperature || 30),
            condition
          }
        }).catch(() => {})
    )

    await Promise.all(fetches)
  } catch {}

  cache = result
  lastFetch = now
  return NextResponse.json(result)
}
