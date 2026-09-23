// Lazily loaded map picker: click (or drag the pin) to set latitude/longitude.
import type { LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import { OSM_TILES } from '@/components/map/leafletSetup'

interface LocationPickerProps {
  latitude: number
  longitude: number
  onChange: (lat: number, lng: number) => void
}

const round = (n: number) => Math.round(n * 1e6) / 1e6

function ClickHandler({ onChange }: Pick<LocationPickerProps, 'onChange'>) {
  useMapEvents({ click: (e: LeafletMouseEvent) => onChange(round(e.latlng.lat), round(e.latlng.lng)) })
  return null
}

/** Keeps the view on the pin when coordinates are typed in manually. */
function Recenter({ latitude, longitude }: Pick<LocationPickerProps, 'latitude' | 'longitude'>) {
  const map = useMap()
  useEffect(() => {
    if (!map.getBounds().contains([latitude, longitude])) map.setView([latitude, longitude])
  }, [map, latitude, longitude])
  return null
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  const lat = valid ? latitude : 20
  const lng = valid ? longitude : 0

  return (
    <div className="relative z-0 h-56 overflow-hidden rounded-lg border">
      <MapContainer center={[lat, lng]} zoom={valid ? 13 : 2} className="size-full">
        <TileLayer url={OSM_TILES.url} attribution={OSM_TILES.attribution} />
        <ClickHandler onChange={onChange} />
        <Recenter latitude={lat} longitude={lng} />
        {valid && (
          <Marker
            position={[lat, lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = (e.target as LeafletMarker).getLatLng()
                onChange(round(p.lat), round(p.lng))
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
