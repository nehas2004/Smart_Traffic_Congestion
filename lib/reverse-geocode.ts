import { ResolvedLocation } from '@/types/traffic'

const DEFAULT_TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || 'QonqKFs3CHNI0GUCu7NhJ4tM9vuzE1yq'

// In-memory cache for resolved locations to prevent repeated API calls
const geocodeCache = new Map<string, ResolvedLocation>()

/**
 * Known landmark roads for preset Kerala hubs as fast fallback
 */
const PRESET_ROAD_MAP: Record<string, string[]> = {
  kozhikode: [
    'Mavoor Road',
    'Palayam Junction & SM Street',
    'Calicut Beach Road',
    'Wayanad Road (NH 766)',
    'Mini Bypass Road',
    'Thondayad Bypass Junction',
    'Arayidathupalam Junction',
    'Kannur Road (NH 66)',
  ],
  kochi: [
    'Banerji Road',
    'MG Road (Ernakulam)',
    'Kaloor - Kadavanthra Road',
    'SA Road (Elamkulam)',
    'Palarivattom Bypass Junction',
    'Edappally Toll Junction',
    'Vyttila Mobility Hub Arterial',
    'Kundannoor Junction (NH 66)',
  ],
  ernakulam: [
    'Banerji Road, Kaloor',
    'MG Road, High Court',
    'Palarivattom Bypass',
    'Edappally Junction',
    'SA Road, Kadavanthra',
  ],
  thrissur: [
    'Swaraj Round North',
    'Swaraj Round South',
    'MG Road (Thrissur)',
    'East Fort Junction',
    'Kuruppam Road',
    'Palakkad Road (NH 544)',
    'Mannuthy Bypass Junction',
  ],
  thiruvananthapuram: [
    'MG Road (Palayam)',
    'Pattom - Kowdiar Road',
    'Technopark Bypass (NH 66)',
    'East Fort Central Terminal',
    'Vellayambalam Junction',
    'Kazhakkoottam Junction',
    'Statue Junction Corridor',
  ],
  trivandrum: [
    'MG Road, Palayam',
    'Pattom Junction',
    'Technopark Phase-1 Bypass',
    'Kazhakkoottam Elevated Highway',
    'East Fort Bus Terminal',
  ],
  kothamangalam: [
    'MC Road (Central Junction)',
    'Aluva - Munnar Road (AM Road)',
    'High-Range Junction',
    'College Road & Market Feeder',
    'Thankalam Bypass Road',
    'Kozhippilly Junction',
  ],
  aluva: [
    'NH 544 (Aluva Flyover Corridor)',
    'Aluva Bypass & Pump Junction',
    'Railway Station Road',
    'Periyar River Bridge Link',
    'Bank Junction Arterial',
  ],
  munnar: [
    'Old Munnar Road (NH 85)',
    'Tea Museum Junction Road',
    'Munnar - Mattupetty Road',
    'Devikulam Gap Road (NH 85)',
    'Nullatanni Feeder Route',
  ],
}

/**
 * Reverse geocode a latitude & longitude into a genuine verified road and locality name.
 * Uses TomTom Reverse Geocoding API with Nominatim/OSM fallback.
 */
export async function reverseGeocodeLocation(
  lat: number,
  lon: number,
  apiKey: string = DEFAULT_TOMTOM_KEY
): Promise<ResolvedLocation> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!
  }

  // 1. Try TomTom Reverse Geocoding API
  try {
    const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json?key=${apiKey}&radius=150`
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (res.ok) {
      const data = await res.json()
      const addr = data.addresses?.[0]?.address
      if (addr) {
        const roadName =
          addr.streetName ||
          addr.street ||
          addr.freeformAddress?.split(',')[0] ||
          'Arterial Road'

        const locality =
          addr.municipalitySubdivision ||
          addr.neighbourhood ||
          addr.localName ||
          addr.municipality ||
          ''

        const city =
          addr.municipality ||
          addr.countrySubdivision ||
          addr.countrySecondarySubdivision ||
          'Kerala'

        // Build human-friendly corridor label (e.g., "Banerji Road, Kaloor, Kochi")
        const parts = [roadName]
        if (locality && !roadName.toLowerCase().includes(locality.toLowerCase())) {
          parts.push(locality)
        }
        if (city && !locality.toLowerCase().includes(city.toLowerCase()) && !roadName.toLowerCase().includes(city.toLowerCase())) {
          parts.push(city)
        }
        const corridor_name = parts.join(', ')

        const result: ResolvedLocation = {
          latitude: lat,
          longitude: lon,
          roadName,
          locality,
          city,
          corridor_name,
        }
        geocodeCache.set(cacheKey, result)
        return result
      }
    }
  } catch (err) {
    // TomTom call failed, proceed to fallback
  }

  // 2. Try OpenStreetMap / Nominatim Reverse Geocoding fallback
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    const res = await fetch(osmUrl, {
      headers: { 'User-Agent': 'FlowcastTrafficIntelligence/2.0' },
      next: { revalidate: 300 },
    })
    if (res.ok) {
      const data = await res.json()
      const addr = data.address || {}
      const roadName = addr.road || addr.pedestrian || addr.highway || addr.suburb || 'Main Arterial'
      const locality = addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.village || ''
      const city = addr.city || addr.town || addr.municipality || addr.state_district || 'Kerala'

      const parts = [roadName]
      if (locality && !roadName.toLowerCase().includes(locality.toLowerCase())) {
        parts.push(locality)
      }
      if (city && !locality.toLowerCase().includes(city.toLowerCase()) && !roadName.toLowerCase().includes(city.toLowerCase())) {
        parts.push(city)
      }
      const corridor_name = parts.join(', ')

      const result: ResolvedLocation = {
        latitude: lat,
        longitude: lon,
        roadName,
        locality,
        city,
        corridor_name,
      }
      geocodeCache.set(cacheKey, result)
      return result
    }
  } catch (_) {}

  // 3. Fallback to coordinate representation
  const defaultLoc: ResolvedLocation = {
    latitude: lat,
    longitude: lon,
    roadName: `Road Sector (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`,
    locality: 'Surveillance Sector',
    city: 'Kerala',
    corridor_name: `Road Sector (${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E)`,
  }
  geocodeCache.set(cacheKey, defaultLoc)
  return defaultLoc
}

/**
 * Return real preset road names for known cities if available
 */
export function getPresetRoadNames(cityName: string): string[] {
  const normalized = cityName.toLowerCase().replace(/[^a-z]/g, '')
  for (const [key, roads] of Object.entries(PRESET_ROAD_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return roads
    }
  }
  return []
}
