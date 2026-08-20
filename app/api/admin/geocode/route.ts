import { NextResponse } from 'next/server'
import { reverseGeocodeLocation } from '@/lib/reverse-geocode'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
  const lon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : null

  if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Missing or invalid lat/lon parameters' }, { status: 400 })
  }

  const KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'
  const resolved = await reverseGeocodeLocation(lat, lon, KEY)
  return NextResponse.json(resolved)
}
