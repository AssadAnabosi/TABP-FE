import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { MapPin, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'

import { amenitiesApi } from '@/api/amenities'
import { citiesApi } from '@/api/cities'
import { hotelsApi } from '@/api/hotels'
import { queryKeys } from '@/api/queryKeys'
import { HotelImage } from '@/components/HotelImage'
import { StarRating } from '@/components/StarRating'
import { ErrorState } from '@/components/StatusPages'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/money'

import { FiltersPanel, type FilterPatch } from './FiltersPanel'
import { SearchBar } from './SearchBar'
import { parseSearch, stayQuery, toApiParams, toSearchParams } from './searchParams'

const PAGE_SIZE = 20

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => parseSearch(params), [params])
  const apiParams = useMemo(() => toApiParams(state), [state])

  const results = useInfiniteQuery({
    queryKey: queryKeys.hotels.search(apiParams),
    queryFn: ({ pageParam, signal }) =>
      hotelsApi.search({ ...apiParams, pageNumber: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.pageNumber + 1 : undefined),
  })

  // Label for a city picked from "Trending destinations" (the URL only carries its id).
  const city = useQuery({
    queryKey: ['cities', 'detail', state.cityId],
    queryFn: () => citiesApi.get(state.cityId!),
    enabled: state.cityId !== undefined,
    staleTime: 10 * 60_000,
  })
  const amenities = useQuery({
    queryKey: queryKeys.amenities,
    queryFn: amenitiesApi.list,
    staleTime: 10 * 60_000,
  })

  /** Changing a filter updates the URL (which resets to page 1 via a new query key). */
  const applyFilters = useCallback(
    (patch: FilterPatch) => {
      const next = { ...parseSearch(params), ...patch }
      setParams(toSearchParams(next), { replace: true })
    },
    [params, setParams],
  )

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = results
  useEffect(() => {
    const node = sentinel.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const hotels = results.data?.pages.flatMap((p) => p.items) ?? []
  const total = results.data?.pages[0]?.totalCount ?? 0
  const detailQuery = stayQuery(state)

  // Active filter chips.
  const chips: Array<{ label: string; clear: () => void }> = []
  if (state.cityId !== undefined)
    chips.push({
      label: `City: ${city.data?.name ?? '…'}`,
      clear: () => setParams(toSearchParams({ ...state, cityId: undefined }), { replace: true }),
    })
  if (state.minPrice !== undefined || state.maxPrice !== undefined)
    chips.push({
      label: `Price: ${state.minPrice ?? 0} – ${state.maxPrice ?? '∞'}`,
      clear: () => applyFilters({ minPrice: undefined, maxPrice: undefined }),
    })
  if (state.minStarRating)
    chips.push({
      label: `${state.minStarRating}★ & up`,
      clear: () => applyFilters({ minStarRating: undefined }),
    })
  if (state.roomType)
    chips.push({ label: state.roomType, clear: () => applyFilters({ roomType: undefined }) })
  for (const id of state.amenityIds) {
    const name = amenities.data?.find((a) => a.id === id)?.name ?? `Amenity ${id}`
    chips.push({
      label: name,
      clear: () => applyFilters({ amenityIds: state.amenityIds.filter((a) => a !== id) }),
    })
  }

  const clearAll = () =>
    setParams(
      toSearchParams({
        keyword: state.keyword,
        checkIn: state.checkIn,
        checkOut: state.checkOut,
        adults: state.adults,
        children: state.children,
        rooms: state.rooms,
      }),
      {
        replace: true,
      },
    )

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <SearchBar key={params.toString()} initial={state} preserve={state} compact />

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <FiltersPanel state={state} onChange={applyFilters} />
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h1 id="results-heading" className="mr-auto text-lg font-semibold">
              {results.isPending ? 'Searching…' : `${total} hotel${total === 1 ? '' : 's'} found`}
            </h1>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6">
                  <FiltersPanel state={state} onChange={applyFilters} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Badge key={chip.label} variant="secondary" className="gap-1 pr-1">
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.clear}
                    aria-label={`Remove filter ${chip.label}`}
                    className="rounded-full p-0.5 hover:bg-foreground/10"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <Button variant="link" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            </div>
          )}

          {results.isError && <ErrorState error={results.error} onRetry={() => void results.refetch()} />}

          {results.isPending && (
            <div className="space-y-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          )}

          {results.isSuccess && hotels.length === 0 && (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="font-medium">No hotels match your search.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try other dates, fewer guests per room, or remove some filters.
              </p>
            </div>
          )}

          <ul className="space-y-4">
            {hotels.map((hotel) => (
              <li key={hotel.hotelId}>
                <Link
                  to={`/hotels/${hotel.hotelId}?${detailQuery}`}
                  className="group grid overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid-cols-[240px_1fr]"
                >
                  <HotelImage
                    src={hotel.thumbnailUrl}
                    alt={hotel.name}
                    className="aspect-[4/3] w-full sm:aspect-auto sm:h-full"
                  />
                  <div className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold group-hover:underline">{hotel.name}</h2>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" aria-hidden /> {hotel.cityName}
                        </div>
                      </div>
                      <StarRating value={hotel.starRating} />
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{hotel.shortDescription}</p>
                    <div className="mt-auto text-right">
                      <span className="text-xs text-muted-foreground">from </span>
                      <span className="text-xl font-semibold">
                        {formatMoney(hotel.pricePerNight, hotel.currency)}
                      </span>
                      <span className="text-sm text-muted-foreground"> / night</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div ref={sentinel} aria-hidden />
          {isFetchingNextPage && <Skeleton className="mt-4 h-40 w-full rounded-xl" />}
          {results.isSuccess && hotels.length > 0 && !hasNextPage && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              You've reached the end of the list.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
