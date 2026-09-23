import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router'

import { isApiError } from '@/api/errors'
import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import { visitsApi } from '@/api/visits'
import { DateRangePicker } from '@/components/DateRangePicker'
import { GuestPicker } from '@/components/GuestPicker'
import { StarRating } from '@/components/StarRating'
import { ErrorState, NotFoundPage } from '@/components/StatusPages'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { parseStay, toSearchParams, type StayParams } from '../search/searchParams'
import { Gallery } from './Gallery'
import { Reviews } from './Reviews'
import { RoomCard } from './RoomCard'

const HotelMap = lazy(() => import('./HotelMap'))

/** Records the visit once per hotel per page view (StrictMode-safe), fire-and-forget (kickoff §8.4.5). */
function useRecordVisit(hotelId: number) {
  const queryClient = useQueryClient()
  const recorded = useRef<number | null>(null)
  useEffect(() => {
    if (!Number.isInteger(hotelId) || recorded.current === hotelId) return
    recorded.current = hotelId
    visitsApi
      .record(hotelId)
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.visits.recentlyVisited }))
      .catch(() => {})
  }, [hotelId, queryClient])
}

export function HotelPage() {
  const hotelId = Number(useParams().hotelId)
  const [params, setParams] = useSearchParams()
  const stay = useMemo(() => parseStay(params), [params])
  useRecordVisit(hotelId)

  const hotel = useQuery({
    queryKey: queryKeys.hotels.detail(hotelId, stay.checkIn, stay.checkOut),
    // Always pass both dates, otherwise availability is meaningless (kickoff §9 G20).
    queryFn: ({ signal }) =>
      hotelsApi.detail(hotelId, { checkIn: stay.checkIn, checkOut: stay.checkOut }, signal),
    enabled: Number.isInteger(hotelId) && hotelId > 0,
    placeholderData: keepPreviousData,
  })

  function updateStay(patch: Partial<StayParams>) {
    setParams(toSearchParams({ ...stay, ...patch }), { replace: true })
  }

  if (!Number.isInteger(hotelId) || hotelId <= 0) return <NotFoundPage />
  if (hotel.isError) {
    // 404 also covers hotels that exist but aren't approved yet.
    if (isApiError(hotel.error) && hotel.error.status === 404)
      return <NotFoundPage message="This hotel doesn't exist or isn't available." />
    return <ErrorState error={hotel.error} onRetry={() => void hotel.refetch()} />
  }
  if (hotel.isPending) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    )
  }

  const data = hotel.data
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{data.name}</h1>
          <StarRating value={data.starRating} size="md" />
        </div>
        <p className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="size-4" aria-hidden /> {data.address}, {data.cityName}
        </p>
      </header>

      <Gallery images={data.imageUrls} name={data.name} />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="about-heading" className="space-y-4">
          <h2 id="about-heading" className="text-xl font-semibold">
            About this hotel
          </h2>
          {/* Plain text with preserved line breaks; never rendered as HTML. */}
          <p className="whitespace-pre-line text-muted-foreground">{data.description}</p>
          {data.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary">
                  {amenity}
                </Badge>
              ))}
            </div>
          )}
        </section>
        <aside className="space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">Your stay</h2>
          <DateRangePicker
            checkIn={stay.checkIn}
            checkOut={stay.checkOut}
            onChange={updateStay}
            className="w-full"
          />
          <GuestPicker
            value={stay}
            onChange={(g) => updateStay({ adults: g.adults, children: g.children })}
            showRooms={false}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Prices and availability update for your dates and guests.
          </p>
        </aside>
      </div>

      <section aria-labelledby="rooms-heading" className="space-y-4">
        <h2 id="rooms-heading" className="text-xl font-semibold">
          Rooms{' '}
          {hotel.isFetching && <span className="text-sm font-normal text-muted-foreground">· updating…</span>}
        </h2>
        {data.rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">This hotel has no rooms listed yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.rooms.map((room) => (
              <RoomCard
                key={room.roomId}
                hotel={data}
                room={room}
                stay={stay}
                updating={hotel.isPlaceholderData}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="map-heading" className="space-y-4">
        <h2 id="map-heading" className="text-xl font-semibold">
          Location
        </h2>
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <HotelMap
            name={data.name}
            address={data.address}
            latitude={data.latitude}
            longitude={data.longitude}
          />
        </Suspense>
      </section>

      <Reviews hotelId={data.id} averageRating={data.averageRating} reviewCount={data.reviewCount} />
    </div>
  )
}
