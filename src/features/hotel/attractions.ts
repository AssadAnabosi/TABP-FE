// "Nearby attractions": the backend has none (kickoff §9 G3), so we query OpenStreetMap's Overpass API.
import { logger } from '@/lib/logger'

export interface Attraction {
  id: number
  name: string
  kind: string
  lat: number
  lng: number
  distanceMeters: number
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const RADIUS_METERS = 1500

interface OverpassElement {
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export async function fetchAttractions(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<Attraction[]> {
  const query = `[out:json][timeout:15];
(
  nwr(around:${RADIUS_METERS},${lat},${lng})["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|theme_park)$"]["name"];
);
out center 40;`
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: new URLSearchParams({ data: query }),
    signal,
  })
  if (!response.ok) {
    logger.warn('Overpass request failed', { status: response.status })
    throw new Error(`Overpass ${response.status}`)
  }
  const json = (await response.json()) as { elements: OverpassElement[] }

  const seen = new Set<string>()
  return json.elements
    .map((el) => {
      const pLat = el.lat ?? el.center?.lat
      const pLng = el.lon ?? el.center?.lon
      const name = el.tags?.name
      if (pLat === undefined || pLng === undefined || !name) return null
      return {
        id: el.id,
        name,
        kind: el.tags?.tourism ?? 'attraction',
        lat: pLat,
        lng: pLng,
        distanceMeters: distanceMeters(lat, lng, pLat, pLng),
      }
    })
    .filter((a): a is Attraction => a !== null && !seen.has(a.name) && (seen.add(a.name), true))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 12)
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`
}
