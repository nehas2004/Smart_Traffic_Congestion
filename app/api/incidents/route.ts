import { NextResponse } from 'next/server'
import { ReportedIncident } from '@/types/traffic'

// Pre-seeded realistic local events in Kerala (can be added to or cleared by City Planner)
let activeIncidents: ReportedIncident[] = [
  {
    id: 'inc-demo-1',
    title: 'Annual Temple Festival Procession (Utsavam)',
    category: 'temple_fest',
    lat: 10.0615,
    lon: 76.6235,
    severity: 'severe',
    impact_radius_meters: 1200,
    expected_delay_mins: 22,
    start_time: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    end_time: new Date(Date.now() + 3600 * 1000 * 6).toISOString(),
    description: 'Devotee procession and elephant pageant causing mainline blockage. Heavy pedestrian overflow.',
    reported_by: 'City Traffic Operations Center',
    created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    active: true,
  },
  {
    id: 'inc-demo-2',
    title: 'Multi-Vehicle Collision & Clearance',
    category: 'accident',
    lat: 10.0682,
    lon: 76.6310,
    severity: 'heavy',
    impact_radius_meters: 800,
    expected_delay_mins: 15,
    start_time: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    end_time: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
    description: 'Lorry and car collision blocking 2 lanes. Recovery crane dispatched on site.',
    reported_by: 'Highway Patrol Unit',
    created_at: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    active: true,
  },
]

// Haversine distance in km
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
  const lon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : null
  const radiusKm = searchParams.get('radiusKm') ? parseFloat(searchParams.get('radiusKm')!) : 15

  const onlyActive = activeIncidents.filter((inc) => inc.active)

  if (lat !== null && lon !== null) {
    const filtered = onlyActive.filter((inc) => {
      const dist = haversineDistanceKm(lat, lon, inc.lat, inc.lon)
      return dist <= radiusKm
    })
    return NextResponse.json(filtered)
  }

  return NextResponse.json(onlyActive)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.lat || !body.lon || !body.title) {
      return NextResponse.json(
        { error: 'Latitude, longitude, and incident title are required' },
        { status: 400 }
      )
    }

    const newIncident: ReportedIncident = {
      id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: body.title,
      category: body.category || 'other',
      lat: parseFloat(body.lat),
      lon: parseFloat(body.lon),
      severity: body.severity || 'heavy',
      impact_radius_meters: body.impact_radius_meters ? parseInt(body.impact_radius_meters) : 1000,
      expected_delay_mins: body.expected_delay_mins ? parseInt(body.expected_delay_mins) : 15,
      start_time: body.start_time || new Date().toISOString(),
      end_time: body.end_time || new Date(Date.now() + 3600 * 1000 * 4).toISOString(),
      description: body.description || '',
      reported_by: body.reported_by || 'City Traffic Operations Center',
      created_at: new Date().toISOString(),
      active: true,
    }

    activeIncidents.unshift(newIncident)

    return NextResponse.json({ success: true, incident: newIncident }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to record incident' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Incident ID required' }, { status: 400 })
  }

  const idx = activeIncidents.findIndex((i) => i.id === id)
  if (idx !== -1) {
    activeIncidents[idx].active = false
    return NextResponse.json({ success: true, message: 'Incident resolved & cleared' })
  }

  return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
}
