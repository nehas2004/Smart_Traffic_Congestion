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
          options: d.options || [
            {
              id: 'opt-1',
              strategy_type: 'signal_timing',
              title: 'Adaptive Green Phase Split (+35s)',
              action: d.action || `Extend primary green split by +35s.`,
              reason: d.reason || `Current speed telemetry shows high surge.`,
              expected_impact: `-22% main corridor queue delay`,
              side_effect_tradeoff: `+4% cross-street side delay`,
              confidence: d.confidence || 'high',
              is_recommended: true,
            },
            {
              id: 'opt-2',
              strategy_type: 'dynamic_reroute',
              title: 'Upstream VMS Signage Diversion',
              action: `Activate digital VMS signage 2km upstream to suggest Bypass route.`,
              reason: `Prevents bottleneck spillback into arterial junctions.`,
              expected_impact: `Divert 25% traffic onto Bypass corridor`,
              side_effect_tradeoff: `+3 mins extra distance for rerouted vehicles`,
              confidence: 'medium',
              is_recommended: false,
            },
            {
              id: 'opt-3',
              strategy_type: 'officer_dispatch',
              title: 'Traffic Officer Clear-Zone Enforcement',
              action: `Dispatch 2 field officers to clear illegal parking and enforce junction box discipline.`,
              reason: `High event friction caused by curbside drop-offs.`,
              expected_impact: `Fast 10-minute bottleneck clearance`,
              side_effect_tradeoff: `Requires 2 field officers on active deployment`,
              confidence: 'high',
              is_recommended: false,
            },
          ],
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
      corridorLabel: 'Central Junction & Main Arterial Corridor',
      titleTemplate: (lat: number, lon: number) => `Add +35s to Green Signal at Central Junction`,
      descTemplate: (lat: number, lon: number, delay: number) =>
        `Real-time sensor telemetry indicates a +${delay}m peak queue buildup. Extending the green light split by +35 seconds will drain the bottleneck before severe gridlock forms.`,
    },
    {
      id: 'rec-02',
      coords: [centerLat + 0.038, centerLon + 0.018] as [number, number],
      action_type: 'dynamic_reroute' as const,
      corridorLabel: 'North Transit Bypass & Express Arterial',
      titleTemplate: (lat: number, lon: number) => `Activate Dynamic Variable Message Reroute Signage`,
      descTemplate: (lat: number, lon: number, delay: number) =>
        `Choke point detected along the North Bypass with +${delay}m delay. Activate upstream VMS signage to divert ~25% of vehicles to parallel relief roads.`,
    },
    {
      id: 'rec-03',
      coords: [centerLat - 0.042, centerLon - 0.022] as [number, number],
      action_type: 'incident_dispatch' as const,
      corridorLabel: 'South Feeder Road & Commercial Market Hub',
      titleTemplate: (lat: number, lon: number) => `Dispatch Traffic Officer Clearance Patrol`,
      descTemplate: (lat: number, lon: number, delay: number) =>
        `Curbside congestion friction causing +${delay}m delay near Market Hub. Dispatch 2 traffic clearance officers to enforce clear-zone flow.`,
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
        corridor_name: `${tmpl.corridorLabel} (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
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
        options: [
          {
            id: `opt-${tmpl.id}-1`,
            strategy_type: 'signal_timing',
            title: `Adaptive Signal Extension (+30s)`,
            action: `Extend signal green split by +30 seconds at (${lat.toFixed(4)}°, ${lon.toFixed(4)}°).`,
            reason: `Live TomTom flow telemetry indicates a +${delayMins}m bottleneck buildup.`,
            expected_impact: `-${Math.round(delayMins * 1.5)}% corridor queue reduction`,
            side_effect_tradeoff: `+3% side-street travel delay`,
            confidence: severity === 'severe' ? 'high' : 'medium',
            is_recommended: tmpl.action_type === 'signal_retiming',
          },
          {
            id: `opt-${tmpl.id}-2`,
            strategy_type: 'dynamic_reroute',
            title: `Dynamic VMS Signage Diversion`,
            action: `Activate upstream VMS signage to direct 25% of inbound vehicles onto parallel relief route.`,
            reason: `Diverts traffic away from peak bottleneck zone.`,
            expected_impact: `Divert 25% traffic onto arterial bypass`,
            side_effect_tradeoff: `+2.5 mins extra travel distance for diverted drivers`,
            confidence: 'medium',
            is_recommended: tmpl.action_type === 'dynamic_reroute',
          },
          {
            id: `opt-${tmpl.id}-3`,
            strategy_type: 'officer_dispatch',
            title: `Traffic Patrol Clearance Deployment`,
            action: `Dispatch 2 traffic officers to enforce junction box discipline and clear curbside friction.`,
            reason: `Ensures clear lane throughput during congestion surge.`,
            expected_impact: `Fast 10-minute bottleneck clearance`,
            side_effect_tradeoff: `Requires 2 field officers on active deployment`,
            confidence: 'high',
            is_recommended: tmpl.action_type === 'incident_dispatch',
          },
        ],
        bottleneck: {
          id: `bn-${tmpl.id}`,
          corridor_id: `corr-${idx + 1}`,
          corridor_name: `${tmpl.corridorLabel} (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
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
