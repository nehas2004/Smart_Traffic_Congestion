import { NextResponse } from 'next/server'
import { TrafficRecommendation, SeverityLevel } from '@/types/traffic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const centerLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : 10.0601
  const centerLon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : 76.6214

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  const cityName = searchParams.get('city') || searchParams.get('name') || undefined

  // First try backend FastAPI recommendation endpoint
  try {
    const backendUrl = `http://localhost:8000/recommendations?lat=${centerLat}&lon=${centerLon}${cityName ? `&corridor_name=${encodeURIComponent(cityName)}` : ''}`
    const backendRes = await fetch(backendUrl, { cache: 'no-store' })
    if (backendRes.ok) {
      const envelope = await backendRes.json()
      if (envelope.success && envelope.data) {
        const d = envelope.data
        const confNum = d.confidence === 'high' ? 0.95 : d.confidence === 'medium' ? 0.75 : 0.55
        const priorityVal: 'high' | 'medium' | 'low' = d.confidence === 'high' ? 'high' : d.confidence === 'medium' ? 'medium' : 'low'
        const sevVal: SeverityLevel = (d.severity === 'severe' || d.severity === 'heavy' || d.severity === 'moderate' || d.severity === 'low') ? d.severity : 'severe'

        const backendRec: TrafficRecommendation = {
          id: d.id || d.rec_id || `rec-ai-01`,
          corridor_id: d.corridor_id || d.location_id || 'corr-01',
          corridor_name: d.corridor_name || `Congested Node (${centerLat.toFixed(4)}°, ${centerLon.toFixed(4)}°)`,
          created_at: d.generated_at || new Date().toISOString(),
          priority: priorityVal,
          title: d.action || d.title || `Adaptive Signal Phase Extension (+30s)`,
          description: d.reason ? `${d.reason} ${d.expected_effect ? `(${d.expected_effect})` : ''}` : d.description || d.reasoning || `Surge in live telemetry.`,
          action_type: 'signal_retiming',
          expected_delay_reduction_mins: d.expected_delay_reduction_mins || 11.5,
          confidence: confNum,
          current_congestion: d.current_congestion || 78,
          predicted_congestion: d.predicted_congestion || 89,
          severity: sevVal,
          bottleneck: {
            id: `bn-${d.id || 'ai-01'}`,
            corridor_id: d.corridor_id || 'corr-01',
            corridor_name: d.corridor_name || `Congested Node (${centerLat.toFixed(4)}°, ${centerLon.toFixed(4)}°)`,
            window: 'Live AI Model Telemetry',
            days: 'Active',
            severity: sevVal,
            avg_delay_mins: 15,
            trend_percent: 8,
            confidence: confNum,
            coordinates: [centerLat, centerLon],
          },
        }

        const liveRecs = await generateCoordinateRecommendations(centerLat, centerLon, KEY)
        return NextResponse.json([backendRec, ...liveRecs.slice(1)])
      }
    }
  } catch (_) {}

  // Generate 10km coordinate recommendations from live TomTom telemetry
  const liveRecs = await generateCoordinateRecommendations(centerLat, centerLon, KEY)
  return NextResponse.json(liveRecs)
}

async function generateCoordinateRecommendations(
  centerLat: number,
  centerLon: number,
  KEY: string
): Promise<TrafficRecommendation[]> {
  const recTemplates = [
    {
      id: 'rec-01',
      coords: [centerLat, centerLon] as [number, number],
      action_type: 'signal_retiming' as const,
      titleTemplate: (lat: number, lon: number) => `Adaptive Green Phase Extension (+35s) at (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
      descTemplate: (lat: number, lon: number, delay: number) =>
        `Real-time sensor telemetry at (${lat.toFixed(4)}°, ${lon.toFixed(4)}°) indicates a +${delay}m peak queue buildup. Adjust primary green split by +35s.`,
    },
    {
      id: 'rec-02',
      coords: [centerLat + 0.038, centerLon + 0.018] as [number, number],
      action_type: 'dynamic_reroute' as const,
      titleTemplate: (lat: number, lon: number) => `Dynamic Variable Message Reroute at (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
      descTemplate: (lat: number, lon: number, delay: number) =>
        `Choke point detected at (${lat.toFixed(4)}°, ${lon.toFixed(4)}°) with +${delay}m delay. Activate upstream VMS signage to divert 25% of vehicles.`,
    },
    {
      id: 'rec-03',
      coords: [centerLat - 0.042, centerLon - 0.022] as [number, number],
      action_type: 'incident_dispatch' as const,
      titleTemplate: (lat: number, lon: number) => `Traffic Officer Clearance Patrol at (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
      descTemplate: (lat: number, lon: number, delay: number) =>
        `Bottleneck friction detected at (${lat.toFixed(4)}°, ${lon.toFixed(4)}°) with +${delay}m slowdown. Dispatch 2 officers to enforce clear zones.`,
    },
  ]

  const recs = await Promise.all(
    recTemplates.map(async (tmpl, idx) => {
      const lat = tmpl.coords[0]
      const lon = tmpl.coords[1]
      const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${lat},${lon}&key=${KEY}&unit=KMPH`
      let delayMins = 12
      let curCongestion = 72
      let predCongestion = 84
      let severity: SeverityLevel = 'heavy'

      try {
        const r = await fetch(url, { next: { revalidate: 30 } })
        if (r.ok) {
          const d = await r.json()
          const flow = d.flowSegmentData || {}
          const spd = flow.currentSpeed || 24
          const ff = flow.freeFlowSpeed || 48
          const delaySec = Math.max(0, (flow.currentTravelTime || 60) - (flow.freeFlowTravelTime || 40))
          delayMins = Math.max(4, Math.round(delaySec / 60))
          curCongestion = Math.min(100, Math.max(15, Math.round((1 - spd / ff) * 100)))
          predCongestion = Math.min(100, Math.round(curCongestion * 1.15))
          if (curCongestion >= 70) severity = 'severe'
          else if (curCongestion >= 50) severity = 'heavy'
          else severity = 'moderate'
        }
      } catch (_) {}

      const rec: TrafficRecommendation = {
        id: tmpl.id,
        corridor_id: `corr-${idx + 1}`,
        corridor_name: `Position (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
        created_at: new Date().toISOString(),
        priority: severity === 'severe' ? 'high' : severity === 'heavy' ? 'medium' : 'low',
        title: tmpl.titleTemplate(lat, lon),
        description: tmpl.descTemplate(lat, lon, delayMins),
        action_type: tmpl.action_type,
        expected_delay_reduction_mins: Number((delayMins * 0.55).toFixed(1)),
        confidence: 0.94,
        current_congestion: curCongestion,
        predicted_congestion: predCongestion,
        severity: severity,
        bottleneck: {
          id: `bn-${tmpl.id}`,
          corridor_id: `corr-${idx + 1}`,
          corridor_name: `Position (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
          window: 'Live Telemetry Window',
          days: 'Active',
          severity: severity,
          avg_delay_mins: delayMins,
          trend_percent: 6,
          confidence: 0.94,
          coordinates: [lat, lon],
        },
      }
      return rec
    })
  )

  return recs
}
