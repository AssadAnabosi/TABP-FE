// Lazily loaded (Leaflet is heavy): interactive map with the hotel + nearby attractions (brief 4.2).
import { useQuery } from '@tanstack/react-query'
import { Landmark } from 'lucide-react'
import { useState } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip } from 'react-leaflet'

import { queryKeys } from '@/api/queryKeys'
import { OSM_TILES } from '@/components/map/leafletSetup'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { fetchAttractions, formatDistance } from './attractions'

interface HotelMapProps {
  name: string
  address: string
  latitude: number
  longitude: number
}

export default function HotelMap({ name, address, latitude, longitude }: HotelMapProps) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const attractions = useQuery({
    queryKey: queryKeys.attractions(latitude, longitude),
    queryFn: ({ signal }) => fetchAttractions(latitude, longitude, signal),
    staleTime: Infinity,
    gcTime: 60 * 60_000,
    retry: 1,
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="relative z-0 h-80 overflow-hidden rounded-xl border lg:h-96">
        <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} className="size-full">
          <TileLayer url={OSM_TILES.url} attribution={OSM_TILES.attribution} />
          <Marker position={[latitude, longitude]}>
            <Popup>
              <strong>{name}</strong>
              <br />
              {address}
            </Popup>
          </Marker>
          {attractions.data?.map((a) => (
            <CircleMarker
              key={a.id}
              center={[a.lat, a.lng]}
              radius={activeId === a.id ? 10 : 7}
              pathOptions={{ color: '#7c3aed', fillColor: '#a78bfa', fillOpacity: 0.85, weight: 2 }}
              eventHandlers={{ mouseover: () => setActiveId(a.id), mouseout: () => setActiveId(null) }}
            >
              <Tooltip>{a.name}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Landmark className="size-4" aria-hidden /> Nearby attractions
        </h3>
        {attractions.isPending && (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}
        {/* Degrade gracefully: the map still works if Overpass is down or rate-limited. */}
        {attractions.isError && (
          <p className="text-sm text-muted-foreground">Nearby attractions are unavailable right now.</p>
        )}
        {attractions.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No listed attractions within 1.5 km.</p>
        )}
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {attractions.data?.map((a) => (
            <li
              key={a.id}
              onMouseEnter={() => setActiveId(a.id)}
              onMouseLeave={() => setActiveId(null)}
              className={cn(
                'flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-sm',
                activeId === a.id && 'bg-muted',
              )}
            >
              <span>
                {a.name}{' '}
                <span className="text-xs text-muted-foreground capitalize">· {a.kind.replace('_', ' ')}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatDistance(a.distanceMeters)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Attraction data © OpenStreetMap contributors.
        </p>
      </div>
    </div>
  )
}
