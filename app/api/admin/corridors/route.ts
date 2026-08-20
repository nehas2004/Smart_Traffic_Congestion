import { NextResponse } from 'next/server'
import { CorridorDetail, SeverityLevel } from '@/types/traffic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const centerLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : 10.0601
  const centerLon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : 76.6214

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

  // 10km radius bounding box in degrees (10km ~ 0.09 deg)
  const delta = 0.09
  const minLat = (centerLat - delta).toFixed(5)
  const maxLat = (centerLat + delta).toFixed(5)
  const minLon = (centerLon - delta).toFixed(5)
  const maxLon = (centerLon + delta).toFixed(5)

  const corridors: CorridorDetail[] = []

  // Helper for reverse geocoding to get human-readable street names
  async function getStreetName(lat: number, lon: number, defaultName: string): Promise<string> {
    try {
      const geoUrl = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json?key=${KEY}`
      const res = await fetch(geoUrl, { next: { revalidate: 300 } })
      if (res.ok) {
        const d = await res.json()
        const addr = d.addresses?.[0]?.address
        if (addr) {
          const street = addr.streetName || addr.street || addr.freeformAddress || addr.municipalitySubdivision
          if (street) {
            const sub = addr.municipalitySubdivision || addr.municipality || ''
            return sub && !street.includes(sub) ? `${street} (${sub})` : street
          }
        }
      }
    } catch (_) {}
    return defaultName
  }

  // 1. Fetch REAL TomTom Live Traffic Incidents in the 10km Bounding Box
  try {
    const incidentUrl = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${minLon},${minLat},${maxLon},${maxLat}&fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code},from,to,length,delay,roadNumbers}}}&key=${KEY}`

    const incRes = await fetch(incidentUrl, { next: { revalidate: 30 } })
    if (incRes.ok) {
      const incData = await incRes.json()
      const incidents = incData.incidents || []

      const incPromises = incidents.slice(0, 10).map(async (inc: any, idx: number) => {
        const props = inc.properties || {}
        const geom = inc.geometry || {}
        let coords: [number, number][] = []
        let ptLat = centerLat
        let ptLon = centerLon

        if (geom.type === 'LineString' && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
          coords = geom.coordinates.map((c: any) => [c[1], c[0]])
          ptLat = geom.coordinates[0][1]
          ptLon = geom.coordinates[0][0]
        } else if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
          ptLat = geom.coordinates[1]
          ptLon = geom.coordinates[0]
          coords = [
            [ptLat - 0.003, ptLon - 0.003],
            [ptLat, ptLon],
            [ptLat + 0.003, ptLon + 0.003],
          ]
        }

        const delaySec = props.delay || 180
        const delayMins = Math.max(2, Math.round(delaySec / 60))
        const lengthKm = Number(((props.length || 1200) / 1000).toFixed(1))

        const magnitude = props.magnitudeOfDelay || 2
        let severity: SeverityLevel = 'moderate'
        let congestion = 45
        if (magnitude >= 3 || delayMins >= 10) {
          severity = 'severe'
          congestion = 85
        } else if (magnitude === 2 || delayMins >= 5) {
          severity = 'heavy'
          congestion = 65
        }

        // Build human-friendly corridor label
        let label = ''
        if (props.from && props.to) {
          label = `${props.from} → ${props.to}`
        } else if (props.from) {
          label = `${props.from} Corridor`
        } else if (props.roadNumbers && props.roadNumbers.length > 0) {
          label = `${props.roadNumbers.join('/')} Arterial`
        } else {
          label = await getStreetName(ptLat, ptLon, `Arterial Corridor`)
        }

        return {
          corridor_id: `inc-${idx + 1}`,
          corridor_name: label,
          timestamp: new Date().toISOString(),
          current_congestion: congestion,
          predicted_congestion: Math.min(100, Math.round(congestion * 1.12)),
          severity: severity,
          confidence: 0.96,
          length_km: lengthKm,
          current_speed_kmh: Math.max(12, Math.round(48 * (1 - congestion / 100))),
          free_flow_speed_kmh: 48,
          historical_avg_delay: delayMins,
          coordinates: coords.length > 0 ? coords : [[ptLat, ptLon]],
          active_incidents: 1,
        }
      })

      const incResults = await Promise.all(incPromises)
      corridors.push(...incResults)
    }
  } catch (err) {
    console.warn('TomTom incidents error:', err)
  }

  // 2. Sample 8 Radial Grid Coordinate Points within 10km radius
  const radialOffsets = [
    { dLat: 0.0, dLon: 0.0, defaultName: 'Central Junction Corridor' },
    { dLat: 0.045, dLon: 0.015, defaultName: 'North Arterial Bypass' },
    { dLat: -0.045, dLon: -0.015, defaultName: 'South Feeder Expressway' },
    { dLat: 0.02, dLon: 0.06, defaultName: 'East Commercial Hub Link' },
    { dLat: -0.02, dLon: -0.06, defaultName: 'West Waterfront Highway' },
    { dLat: 0.065, dLon: -0.035, defaultName: 'North-West Transit Corridor' },
    { dLat: -0.065, dLon: 0.035, defaultName: 'South-East Ring Road' },
    { dLat: 0.08, dLon: 0.04, defaultName: 'Outer Bypass Interchange' },
  ]

  const flowPromises = radialOffsets.map(async (offset, idx) => {
    const ptLat = centerLat + offset.dLat
    const ptLon = centerLon + offset.dLon
    const flowUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${ptLat},${ptLon}&key=${KEY}&unit=KMPH`

    try {
      const res = await fetch(flowUrl, { next: { revalidate: 30 } })
      if (res.ok) {
        const d = await res.json()
        const flow = d.flowSegmentData || {}
        const curSpeed = flow.currentSpeed || 32
        const ffSpeed = flow.freeFlowSpeed || 48
        const conf = flow.confidence || 0.92
        const delaySec = Math.max(0, (flow.currentTravelTime || 60) - (flow.freeFlowTravelTime || 40))
        const delayMins = Math.round(delaySec / 60)

        const ratio = Math.max(0, Math.min(1, curSpeed / (ffSpeed || 48)))
        const congestionIndex = Math.min(100, Math.max(10, Math.round((1 - ratio) * 100)))

        let severity: SeverityLevel = 'low'
        if (congestionIndex >= 70) severity = 'severe'
        else if (congestionIndex >= 50) severity = 'heavy'
        else if (congestionIndex >= 30) severity = 'moderate'

        let coords: [number, number][] = [
          [ptLat - 0.004, ptLon - 0.004],
          [ptLat, ptLon],
          [ptLat + 0.004, ptLon + 0.004],
        ]
        if (flow.coordinates && flow.coordinates.coordinate && flow.coordinates.coordinate.length > 1) {
          coords = flow.coordinates.coordinate.map((pt: any) => [pt.latitude, pt.longitude])
        }

        const streetName = await getStreetName(ptLat, ptLon, offset.defaultName)

        const detail: CorridorDetail = {
          corridor_id: `grid-pt-${idx + 1}`,
          corridor_name: streetName,
          timestamp: new Date().toISOString(),
          current_congestion: congestionIndex,
          predicted_congestion: Math.min(100, Math.max(10, Math.round(congestionIndex * 1.15))),
          severity: severity,
          confidence: Number(conf.toFixed(2)),
          length_km: Number((2.5 + Math.abs(offset.dLat * 30)).toFixed(1)),
          current_speed_kmh: curSpeed,
          free_flow_speed_kmh: ffSpeed,
          historical_avg_delay: delayMins > 0 ? delayMins : Math.max(2, Math.round((ffSpeed - curSpeed) * 0.35)),
          coordinates: coords,
          active_incidents: severity === 'severe' ? 1 : 0,
        }
        return detail
      }
    } catch (_) {}

    return null
  })

  const flowResults = await Promise.all(flowPromises)
  const validFlows = flowResults.filter((f): f is CorridorDetail => f !== null)

  const allCorridors = [...corridors, ...validFlows]

  return NextResponse.json(
    allCorridors.length > 0
      ? allCorridors
      : [
          {
            corridor_id: 'pt-01',
            corridor_name: `Central Sector Corridor`,
            timestamp: new Date().toISOString(),
            current_congestion: 45,
            predicted_congestion: 52,
            severity: 'moderate' as SeverityLevel,
            confidence: 0.92,
            length_km: 3.5,
            current_speed_kmh: 30,
            free_flow_speed_kmh: 48,
            historical_avg_delay: 6,
            coordinates: [[centerLat, centerLon]],
            active_incidents: 0,
          },
        ]
  )
}
