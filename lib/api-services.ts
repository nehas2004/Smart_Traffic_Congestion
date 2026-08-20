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
